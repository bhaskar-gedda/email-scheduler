import { prisma } from '../models/prisma';
import { CreateCampaignInput } from '../types';
import { validateAndDeduplicateEmails } from '../utils/email-validator';
import { generateEmailIdempotencyKey, getBullJobId } from '../utils/idempotency';
import { enqueueEmailJob } from '../queues/email.queue';
import { emailIndexerService } from '../integrations/elasticsearch/email-indexer.service';
import { config } from '../config/env';
import { logger } from '../config/logger';

export class CampaignService {
  /**
   * Schedules a new email campaign with BullMQ delayed jobs.
   * Enforces single sender per campaign and creates deterministic jobs.
   */
  public async createAndScheduleCampaign(userId: string, input: CreateCampaignInput) {
    // 1. Verify sender exists and belongs to user
    const sender = await prisma.sender.findFirst({
      where: { id: input.senderId, userId },
    });

    if (!sender) {
      throw new Error('Selected sender not found or unauthorized');
    }

    // 2. Validate and deduplicate recipient emails
    const { validEmails } = validateAndDeduplicateEmails(input.recipients);
    if (validEmails.length === 0) {
      throw new Error('No valid recipient email addresses provided');
    }

    const startTimestamp = new Date(input.startTime).getTime();
    const delayBetweenMs = Math.max(
      input.delayBetweenEmails ?? config.MIN_EMAIL_DELAY_MS,
      config.MIN_EMAIL_DELAY_MS
    );
    const hourlyLimit = input.hourlyLimit ?? config.MAX_EMAILS_PER_HOUR_PER_SENDER;

    // 3. Create Campaign record in PostgreSQL
    const campaign = await prisma.emailCampaign.create({
      data: {
        userId,
        senderId: sender.id,
        subject: input.subject.trim(),
        body: input.body,
        startTime: new Date(startTimestamp),
        delayBetweenEmails: delayBetweenMs,
        hourlyLimit,
        totalRecipients: validEmails.length,
        status: 'ACTIVE',
      },
    });

    logger.info(
      { campaignId: campaign.id, totalRecipients: validEmails.length, delayBetweenMs },
      'Created campaign in PostgreSQL. Generating scheduled email jobs...'
    );

    // 4. Create individual Email records with staggered scheduledAt times
    let currentScheduledTime = startTimestamp;

    const emailRecordsToInsert = validEmails.map((recipient, index) => {
      const scheduledTime = new Date(currentScheduledTime);
      const idempotencyKey = generateEmailIdempotencyKey(campaign.id, recipient);
      
      // Advance timers for the next email
      currentScheduledTime += delayBetweenMs;

      return {
        campaignId: campaign.id,
        senderId: sender.id,
        recipient,
        subject: input.subject.trim(),
        body: input.body,
        scheduledAt: scheduledTime,
        status: 'SCHEDULED',
        idempotencyKey,
      };
    });

    // Bulk create email records in PostgreSQL
    await prisma.email.createMany({
      data: emailRecordsToInsert,
      skipDuplicates: true,
    });

    // Fetch created emails to obtain their generated IDs
    const createdEmails = await prisma.email.findMany({
      where: { campaignId: campaign.id },
      orderBy: { scheduledAt: 'asc' },
    });

    // 5. Enqueue each email into BullMQ delayed queue with deterministic job IDs
    // and index in Elasticsearch
    for (const email of createdEmails) {
      const bullJobId = getBullJobId(email.id);

      // Update bullJobId in database
      await prisma.email.update({
        where: { id: email.id },
        data: { bullJobId },
      });

      // Submit delayed job to BullMQ
      await enqueueEmailJob(email.id, email.scheduledAt, bullJobId);

      // Asynchronously index in Elasticsearch
      emailIndexerService
        .indexEmail({
          emailId: email.id,
          campaignId: campaign.id,
          userId,
          senderId: sender.id,
          senderEmail: sender.email,
          senderName: sender.displayName,
          recipient: email.recipient,
          subject: email.subject,
          body: email.body,
          status: email.status,
          scheduledAt: email.scheduledAt,
          createdAt: email.createdAt,
        })
        .catch((err) => {
          logger.warn({ err }, 'Failed to index email in Elasticsearch');
        });
    }

    logger.info(
      { campaignId: campaign.id, scheduledCount: createdEmails.length },
      'All campaign emails successfully queued via BullMQ delayed jobs'
    );

    return {
      campaign,
      totalScheduled: createdEmails.length,
    };
  }

  public async getCampaignById(campaignId: string, userId: string) {
    return prisma.emailCampaign.findFirst({
      where: { id: campaignId, userId },
      include: {
        sender: {
          select: { displayName: true, email: true },
        },
        _count: {
          select: { emails: true },
        },
      },
    });
  }
}

export const campaignService = new CampaignService();
