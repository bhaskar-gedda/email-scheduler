import { esClient, ES_INDEX_NAME } from './elasticsearch.client';
import { logger } from '../../config/logger';

export interface EmailIndexDocument {
  emailId: string;
  campaignId: string;
  userId: string;
  senderId: string;
  senderEmail: string;
  senderName: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date;
  sentAt?: Date | null;
  failureReason?: string | null;
  etherealMessageUrl?: string | null;
  createdAt: Date;
}

export class EmailIndexerService {
  /**
   * Upserts an email document into the Elasticsearch index.
   */
  public async indexEmail(doc: EmailIndexDocument): Promise<void> {
    try {
      await esClient.index({
        index: ES_INDEX_NAME,
        id: doc.emailId,
        document: {
          ...doc,
          scheduledAt: doc.scheduledAt.toISOString(),
          sentAt: doc.sentAt ? doc.sentAt.toISOString() : null,
          createdAt: doc.createdAt.toISOString(),
        },
        refresh: 'wait_for',
      });
      logger.debug({ emailId: doc.emailId }, 'Indexed email document in Elasticsearch');
    } catch (err: any) {
      logger.warn(
        { emailId: doc.emailId, err: err?.message || err },
        'Failed to index email in Elasticsearch (graceful degradation)'
      );
    }
  }

  /**
   * Updates status and delivery metadata of an existing email document in Elasticsearch.
   */
  public async updateEmailStatus(
    emailId: string,
    updates: {
      status: string;
      sentAt?: Date | null;
      scheduledAt?: Date | null;
      failureReason?: string | null;
      etherealMessageUrl?: string | null;
    }
  ): Promise<void> {
    try {
      await esClient.update({
        index: ES_INDEX_NAME,
        id: emailId,
        doc: {
          ...updates,
          sentAt: updates.sentAt ? updates.sentAt.toISOString() : undefined,
          scheduledAt: updates.scheduledAt ? updates.scheduledAt.toISOString() : undefined,
        },
        doc_as_upsert: true,
      });
      logger.debug({ emailId, status: updates.status }, 'Updated email document in Elasticsearch');
    } catch (err: any) {
      logger.warn(
        { emailId, err: err?.message || err },
        'Failed to update email status in Elasticsearch (graceful degradation)'
      );
    }
  }
}

export const emailIndexerService = new EmailIndexerService();
