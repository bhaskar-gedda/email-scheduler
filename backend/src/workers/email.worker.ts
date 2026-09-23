import { Worker, Job } from 'bullmq';
import crypto from 'crypto';
import { EMAIL_QUEUE_NAME, EmailJobData, rescheduleEmailJob } from '../queues/email.queue';
import { redisOptions } from '../queues/redis.client';
import { prisma } from '../models/prisma';
import { config } from '../config/env';
import { logger } from '../config/logger';
import { rateLimiterService, RateLimiterService } from '../services/rate-limiter.service';
import { etherealService } from '../integrations/ethereal/ethereal.service';
import { slackService } from '../integrations/slack/slack.service';
import { emailIndexerService } from '../integrations/elasticsearch/email-indexer.service';
import { generateClientMessageId } from '../utils/idempotency';

const WORKER_ID = `worker-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;

export async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { emailId } = job.data;
  const leaseDurationMs = config.PROCESSING_LEASE_MS;
  const leaseExpiresAt = new Date(Date.now() + leaseDurationMs);

  logger.debug({ jobId: job.id, emailId, workerId: WORKER_ID }, 'Worker picked up email job');

  // ==========================================================================
  // Step 1: Atomic Job Claim with Lease and Stale Processing Recovery
  // ==========================================================================
  // Raw atomic update prevents race conditions across concurrent workers
  const updatedCount = await prisma.$executeRaw`
    UPDATE "Email"
    SET status = 'PROCESSING',
        "processingStartedAt" = NOW(),
        "processingLeaseExpiresAt" = ${leaseExpiresAt},
        "processingWorkerId" = ${WORKER_ID},
        "updatedAt" = NOW()
    WHERE id = ${emailId}
      AND (
        status IN ('SCHEDULED', 'RATE_LIMITED')
        OR (status = 'PROCESSING' AND ("processingLeaseExpiresAt" IS NULL OR "processingLeaseExpiresAt" < NOW()))
      )
  `;

  if (updatedCount === 0) {
    const existing = await prisma.email.findUnique({
      where: { id: emailId },
      select: { status: true, processingLeaseExpiresAt: true, processingWorkerId: true },
    });

    if (existing?.status === 'SENT') {
      logger.info({ emailId }, 'Email is already marked SENT. Skipping duplicate execution safely.');
      return;
    }

    if (existing?.status === 'PROCESSING') {
      logger.warn(
        { emailId, activeWorker: existing.processingWorkerId, leaseExpires: existing.processingLeaseExpiresAt },
        'Email is actively being processed by another worker within valid lease. Yielding.'
      );
      return;
    }

    logger.warn({ emailId, status: existing?.status }, 'Email could not be claimed. Skipping.');
    return;
  }

  // Load the claimed email with sender and campaign details
  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: {
      sender: true,
      campaign: true,
    },
  });

  if (!email) {
    logger.error({ emailId }, 'Email record not found after claim');
    return;
  }

  const sender = email.sender;
  const campaign = email.campaign;

  // ==========================================================================
  // Step 2: Distributed Atomic Hourly Rate Limiting
  // ==========================================================================
  const hourlyCheck = await rateLimiterService.checkAndIncrementHourlyLimit(
    sender.id,
    campaign.hourlyLimit
  );

  if (!hourlyCheck.allowed) {
    const nextWindow = RateLimiterService.getNextHourWindowStart();
    logger.warn(
      {
        emailId,
        senderId: sender.id,
        senderEmail: sender.email,
        currentCount: hourlyCheck.currentCount,
        limit: campaign.hourlyLimit,
        nextWindow,
      },
      'Hourly rate limit reached for sender. Rescheduling job.'
    );

    // Reschedule in database
    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: 'RATE_LIMITED',
        scheduledAt: nextWindow,
        processingLeaseExpiresAt: null,
        processingWorkerId: null,
      },
    });

    // Reschedule in BullMQ delayed queue
    const bullJobId = email.bullJobId || `email:${email.id}`;
    await rescheduleEmailJob(email.id, nextWindow, bullJobId);

    // Update Elasticsearch
    await emailIndexerService.updateEmailStatus(email.id, {
      status: 'RATE_LIMITED',
      scheduledAt: nextWindow,
    });

    // Check notification lock and send real Slack alert if acquired
    const slackStatus = await slackService.getStatus(campaign.userId);
    if (slackStatus.connected) {
      const lockAcquired = await rateLimiterService.tryAcquireSlackNotificationLock(
        sender.id,
        hourlyCheck.hourWindow
      );

      if (lockAcquired) {
        await slackService.sendRateLimitAlert(
          campaign.userId,
          sender.email,
          campaign.hourlyLimit,
          nextWindow
        );
      }
    }

    return;
  }

  // ==========================================================================
  // Step 3: Distributed Atomic Per-Sender Minimum Delay
  // ==========================================================================
  const delayCheck = await rateLimiterService.reserveSenderMinDelay(
    sender.id,
    campaign.delayBetweenEmails
  );

  if (!delayCheck.allowedImmediately && delayCheck.waitMs > 0) {
    if (delayCheck.waitMs > 10000) {
      const nextWindow = new Date(Date.now() + delayCheck.waitMs);
      
      // Reschedule safely without blocking the worker
      await prisma.email.update({
        where: { id: emailId },
        data: {
          status: 'SCHEDULED', // Use SCHEDULED because it's just maintaining minimum delay
          scheduledAt: nextWindow,
          processingLeaseExpiresAt: null,
          processingWorkerId: null,
        },
      });

      const bullJobId = email.bullJobId || `email:${email.id}`;
      await rescheduleEmailJob(email.id, nextWindow, bullJobId);
      await emailIndexerService.updateEmailStatus(email.id, {
        status: 'SCHEDULED',
        scheduledAt: nextWindow,
      });

      logger.info({ emailId, waitMs: delayCheck.waitMs }, 'Delay > 10s. Rescheduled email to maintain minimum delay.');
      return;
    } else {
      logger.debug(
        { emailId, senderId: sender.id, waitMs: delayCheck.waitMs },
        'Applying minimum sender delay before delivery'
      );
      // Pause for the atomic reserved slot to maintain send spacing
      await new Promise((resolve) => setTimeout(resolve, delayCheck.waitMs));
    }
  }

  // ==========================================================================
  // Step 4: Pre-Send Intent & Dual-Write Mitigation
  // ==========================================================================
  const clientMessageId = generateClientMessageId(email.idempotencyKey, sender.email);

  await prisma.email.update({
    where: { id: emailId },
    data: {
      sendAttemptedAt: new Date(),
      clientMessageId,
      attempts: { increment: 1 },
    },
  });

  // ==========================================================================
  // Step 5: Send Email via Ethereal SMTP
  // ==========================================================================
  try {
    const result = await etherealService.sendEmail({
      smtpHost: sender.smtpHost,
      smtpPort: sender.smtpPort,
      smtpUser: sender.smtpUser,
      smtpPassword: sender.smtpPassword,
      fromName: sender.displayName,
      fromEmail: sender.email,
      to: email.recipient,
      subject: email.subject,
      body: email.body,
      clientMessageId,
    });

    const sentAt = new Date();

    // ========================================================================
    // Step 6: Update Database to SENT (Source of Truth)
    // ========================================================================
    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: 'SENT',
        sentAt,
        etherealMessageUrl: result.previewUrl,
        processingLeaseExpiresAt: null,
        processingWorkerId: null,
        failureReason: null,
      },
    });

    // Update Elasticsearch
    await emailIndexerService.updateEmailStatus(email.id, {
      status: 'SENT',
      sentAt,
      etherealMessageUrl: result.previewUrl,
    });

    logger.info(
      { emailId, recipient: email.recipient, previewUrl: result.previewUrl },
      'Email successfully sent and persisted as SENT'
    );
  } catch (err: any) {
    const failureReason = err?.message || 'Unknown SMTP error';
    logger.error({ emailId, err: failureReason }, 'Failed to deliver email via SMTP');

    // Determine if retries are exhausted
    const maxAttempts = job.opts.attempts || 1;
    const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;
    const nextStatus = isFinalAttempt ? 'FAILED' : 'SCHEDULED';

    // Update DB with failure or retry state
    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: nextStatus,
        failureReason,
        processingLeaseExpiresAt: null,
        processingWorkerId: null,
      },
    });

    // Update Elasticsearch
    await emailIndexerService.updateEmailStatus(email.id, {
      status: nextStatus,
      failureReason,
    });

    throw err; // Allow BullMQ retry strategy if applicable
  }
}

// Create and export the BullMQ Worker instance
export const emailWorker = new Worker<EmailJobData>(EMAIL_QUEUE_NAME, processEmailJob, {
  connection: redisOptions,
  concurrency: config.WORKER_CONCURRENCY,
  limiter: {
    max: 100,
    duration: 1000,
  },
});

emailWorker.on('completed', (job) => {
  logger.debug({ jobId: job.id }, 'BullMQ job completed');
});

emailWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, 'BullMQ job failed');
});

emailWorker.on('error', (err) => {
  logger.error({ err }, 'BullMQ worker encountered error');
});

// Standalone execution support: `npm run dev:worker`
if (require.main === module) {
  logger.info(
    { concurrency: config.WORKER_CONCURRENCY, workerId: WORKER_ID },
    'Email worker started independently'
  );

  const shutdown = async () => {
    logger.info('Shutting down email worker gracefully...');
    await emailWorker.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
