import { app } from './app';
import { config } from './config/env';
import { logger } from './config/logger';
import { prisma } from './models/prisma';
import { redis } from './queues/redis.client';
import { initElasticsearch } from './integrations/elasticsearch/elasticsearch.client';
import { reconciliationService } from './services/reconciliation.service';
import { emailWorker } from './workers/email.worker';

async function bootstrap() {
  try {
    logger.info('Bootstrapping Outbox Labs Email Scheduler Backend...');

    // 1. Initialize Elasticsearch index & mappings
    await initElasticsearch();

    // 2. Perform idempotent startup reconciliation for BullMQ queue
    // (Never crons; runs once on startup)
    await reconciliationService.reconcile();

    // 3. Start Express HTTP Server
    const server = app.listen(config.PORT, () => {
      logger.info(
        {
          port: config.PORT,
          env: config.NODE_ENV,
          bullBoardUrl: `http://localhost:${config.PORT}/admin/queues`,
          frontendUrl: config.FRONTEND_URL,
        },
        '🚀 Email Scheduler Backend is running'
      );
    });

    // 4. Graceful Shutdown Handler
    const handleShutdown = async (signal: string) => {
      logger.info({ signal }, 'Received termination signal. Starting graceful shutdown...');

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Pause and close BullMQ worker
          await emailWorker.close();
          logger.info('BullMQ worker closed');

          // Disconnect Redis
          await redis.quit();
          logger.info('Redis connection closed');

          // Disconnect Prisma
          await prisma.$disconnect();
          logger.info('Prisma database disconnected');

          process.exit(0);
        } catch (err) {
          logger.error({ err }, 'Error during graceful shutdown');
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (err) {
    logger.fatal({ err }, 'Fatal error during backend bootstrap');
    process.exit(1);
  }
}

bootstrap();
