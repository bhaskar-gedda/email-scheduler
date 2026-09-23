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

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Outbox Labs Email Scheduler API',
  });
});

export const apiRoutes = router;
