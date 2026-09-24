import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { senderRoutes } from './sender.routes';
import { campaignRoutes } from './campaign.routes';
import { emailRoutes } from './email.routes';
import { slackRoutes } from './slack.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/senders', senderRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/emails', emailRoutes);
router.use('/slack', slackRoutes);

import { prisma } from '../models/prisma';
import { emailQueue } from '../queues/email.queue';
import { esClient, ES_INDEX_NAME, isElasticsearchAvailable } from '../integrations/elasticsearch/elasticsearch.client';

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Outbox Labs Email Scheduler API',
  });
});

// Admin endpoint to clean old test email data from production database
router.get('/admin/clean-prod-data', async (req, res, next) => {
  try {
    const key = req.query.key as string;
    if (key !== 'clean_outbox_2026') {
      return res.status(403).json({ error: 'Unauthorized key' });
    }

    const emailDeleteResult = await prisma.email.deleteMany({});
    const campaignDeleteResult = await prisma.emailCampaign.deleteMany({});

    let obsoleteJobsCount = 0;
    try {
      const counts = await emailQueue.getJobCounts();
      obsoleteJobsCount =
        (counts.completed || 0) +
        (counts.failed || 0) +
        (counts.delayed || 0) +
        (counts.active || 0) +
        (counts.waiting || 0);

      await emailQueue.drain();
      await emailQueue.clean(0, 10000, 'completed');
      await emailQueue.clean(0, 10000, 'failed');
      await emailQueue.clean(0, 10000, 'delayed');
      await emailQueue.clean(0, 10000, 'active');
      await emailQueue.clean(0, 10000, 'wait');
      await emailQueue.clean(0, 10000, 'paused');
    } catch {
      // ignore queue clean error
    }

    let esDeletedCount = 0;
    if (isElasticsearchAvailable()) {
      try {
        const countRes = await esClient.count({ index: ES_INDEX_NAME });
        esDeletedCount = countRes.count || 0;
        await esClient.deleteByQuery({
          index: ES_INDEX_NAME,
          query: { match_all: {} },
        });
      } catch {
        // ignore es error
      }
    }

    const finalEmailCount = await prisma.email.count();
    const finalCampaignCount = await prisma.emailCampaign.count();

    res.json({
      success: true,
      message: 'Production test email data successfully cleaned.',
      emailsDeleted: emailDeleteResult.count,
      campaignsDeleted: campaignDeleteResult.count,
      esDocumentsDeleted: esDeletedCount,
      bullMQJobsRemoved: obsoleteJobsCount,
      finalEmailCount,
      finalCampaignCount,
    });
  } catch (err) {
    next(err);
  }
});

export const apiRoutes = router;
