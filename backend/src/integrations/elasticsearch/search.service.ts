import { esClient, ES_INDEX_NAME, isElasticsearchAvailable } from './elasticsearch.client';
import { prisma } from '../../models/prisma';
import { logger } from '../../config/logger';

export interface EmailSearchResult {
  id: string;
  campaignId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: Date;
  sentAt: Date | null;
  status: string;
  failureReason: string | null;
  etherealMessageUrl: string | null;
  createdAt: Date;
  sender?: {
    displayName: string;
    email: string;
  };
}

export class SearchService {
  /**
   * Searches emails for a specific user using Elasticsearch multi_match query.
   * If Elasticsearch is offline, gracefully falls back to Prisma PostgreSQL search.
   */
  public async searchEmails(
    userId: string,
    query: string,
    statusFilter?: string
  ): Promise<EmailSearchResult[]> {
    const trimmed = query.trim();

    if (isElasticsearchAvailable()) {
      try {
        const mustClauses: any[] = [{ term: { userId } }];

        if (statusFilter) {
          mustClauses.push({ term: { status: statusFilter } });
        }

        if (trimmed) {
          mustClauses.push({
            multi_match: {
              query: trimmed,
              fields: ['recipient^3', 'subject^2', 'body', 'senderEmail', 'senderName'],
              fuzziness: 'AUTO',
            },
          });
        }

        const response = await esClient.search({
          index: ES_INDEX_NAME,
          query: {
            bool: {
              must: mustClauses,
            },
          },
          sort: [{ scheduledAt: { order: 'desc' } }],
          size: 100,
        });

        return response.hits.hits.map((hit: any) => {
          const src = hit._source;
          return {
            id: src.emailId || hit._id,
            campaignId: src.campaignId,
            senderId: src.senderId,
            recipient: src.recipient,
            subject: src.subject,
            body: src.body,
            scheduledAt: new Date(src.scheduledAt),
            sentAt: src.sentAt ? new Date(src.sentAt) : null,
            status: src.status,
            failureReason: src.failureReason || null,
            etherealMessageUrl: src.etherealMessageUrl || null,
            createdAt: new Date(src.createdAt),
            sender: {
              displayName: src.senderName,
              email: src.senderEmail,
            },
          };
        });
      } catch (err: any) {
        logger.warn(
          { err: err?.message || err, query: trimmed },
          'Elasticsearch search query failed, falling back to PostgreSQL'
        );
      }
    }

    // Fallback: Query PostgreSQL directly
    const where: any = {
      campaign: {
        userId,
      },
    };

    if (statusFilter) {
      where.status = statusFilter;
    }

    if (trimmed) {
      where.OR = [
        { recipient: { contains: trimmed, mode: 'insensitive' } },
        { subject: { contains: trimmed, mode: 'insensitive' } },
        { body: { contains: trimmed, mode: 'insensitive' } },
      ];
    }

    const records = await prisma.email.findMany({
      where,
      orderBy: { scheduledAt: 'desc' },
      take: 100,
      include: {
        sender: {
          select: { displayName: true, email: true },
        },
      },
    });

    return records.map((r) => ({
      id: r.id,
      campaignId: r.campaignId,
      senderId: r.senderId,
      recipient: r.recipient,
      subject: r.subject,
      body: r.body,
      scheduledAt: r.scheduledAt,
      sentAt: r.sentAt,
      status: r.status,
      failureReason: r.failureReason,
      etherealMessageUrl: r.etherealMessageUrl,
      createdAt: r.createdAt,
      sender: r.sender,
    }));
  }
}

export const searchService = new SearchService();
