import { prisma } from '../models/prisma';
import { PaginatedResponse, EmailDTO } from '../types';
import { searchService } from '../integrations/elasticsearch/search.service';

export class EmailService {
  /**
   * Retrieves scheduled (pending) emails for a user with pagination.
   */
  public async getScheduledEmails(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<EmailDTO>> {
    const skip = (page - 1) * pageSize;

    const where = {
      campaign: { userId },
      status: { in: ['SCHEDULED', 'PROCESSING', 'RATE_LIMITED'] },
    };

    const [total, items] = await Promise.all([
      prisma.email.count({ where }),
      prisma.email.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: pageSize,
        include: {
          sender: { select: { displayName: true, email: true } },
        },
      }),
    ]);

    return {
      data: items.map((e) => ({
        id: e.id,
        campaignId: e.campaignId,
        senderId: e.senderId,
        recipient: e.recipient,
        subject: e.subject,
        body: e.body,
        scheduledAt: e.scheduledAt,
        sentAt: e.sentAt,
        status: e.status as any,
        failureReason: e.failureReason,
        bullJobId: e.bullJobId,
        idempotencyKey: e.idempotencyKey,
        attempts: e.attempts,
        etherealMessageUrl: e.etherealMessageUrl,
        processingStartedAt: e.processingStartedAt,
        createdAt: e.createdAt,
        sender: e.sender,
      })),
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  /**
   * Retrieves sent/completed emails for a user with pagination.
   */
  public async getSentEmails(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<EmailDTO>> {
    const skip = (page - 1) * pageSize;

    const where = {
      campaign: { userId },
      status: { in: ['SENT', 'FAILED'] },
    };

    const [total, items] = await Promise.all([
      prisma.email.count({ where }),
      prisma.email.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          sender: { select: { displayName: true, email: true } },
        },
      }),
    ]);

    return {
      data: items.map((e) => ({
        id: e.id,
        campaignId: e.campaignId,
        senderId: e.senderId,
        recipient: e.recipient,
        subject: e.subject,
        body: e.body,
        scheduledAt: e.scheduledAt,
        sentAt: e.sentAt,
        status: e.status as any,
        failureReason: e.failureReason,
        bullJobId: e.bullJobId,
        idempotencyKey: e.idempotencyKey,
        attempts: e.attempts,
        etherealMessageUrl: e.etherealMessageUrl,
        createdAt: e.createdAt,
        sender: e.sender,
      })),
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  /**
   * Full-text search of scheduled and sent emails via Elasticsearch.
   */
  public async searchEmails(userId: string, query: string, statusFilter?: string) {
    return searchService.searchEmails(userId, query, statusFilter);
  }
}

export const emailService = new EmailService();
