import { Client } from '@elastic/elasticsearch';
import { config } from '../../config/env';
import { logger } from '../../config/logger';

export const ES_INDEX_NAME = 'emails';

export const esClient = new Client({
  node: config.ELASTICSEARCH_URL,
  requestTimeout: 5000,
  maxRetries: 3,
});

let isEsConnected = false;

export async function initElasticsearch(): Promise<void> {
  try {
    const health = await esClient.cluster.health();
    isEsConnected = true;
    logger.info({ clusterStatus: health.status }, 'Elasticsearch connected successfully');

    // Ensure index exists
    const indexExists = await esClient.indices.exists({ index: ES_INDEX_NAME });

    if (!indexExists) {
      logger.info({ index: ES_INDEX_NAME }, 'Creating Elasticsearch index with mappings...');
      await esClient.indices.create({
        index: ES_INDEX_NAME,
        mappings: {
          properties: {
            emailId: { type: 'keyword' },
            campaignId: { type: 'keyword' },
            userId: { type: 'keyword' },
            senderId: { type: 'keyword' },
            senderEmail: { type: 'keyword' },
            senderName: { type: 'text' },
            recipient: {
              type: 'text',
              fields: {
                keyword: { type: 'keyword', ignore_above: 256 },
              },
            },
            subject: {
              type: 'text',
              analyzer: 'standard',
            },
            body: {
              type: 'text',
              analyzer: 'standard',
            },
            status: { type: 'keyword' },
            scheduledAt: { type: 'date' },
            sentAt: { type: 'date' },
            failureReason: { type: 'text' },
            etherealMessageUrl: { type: 'keyword' },
            createdAt: { type: 'date' },
          },
        },
      });
      logger.info({ index: ES_INDEX_NAME }, 'Elasticsearch index created successfully');
    }
  } catch (err: any) {
    isEsConnected = false;
    logger.warn(
      { err: err?.message || err },
      'Elasticsearch is currently unavailable; continuing in degraded search mode'
    );
  }
}

export function isElasticsearchAvailable(): boolean {
  return isEsConnected;
}
