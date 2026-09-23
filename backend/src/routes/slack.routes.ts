import { Router } from 'express';
import { slackController } from '../controllers/slack.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Callback is triggered by Slack redirect (uses state query parameter for user correlation)
router.get('/callback', (req, res) => slackController.callback(req, res));

// Authenticated Slack endpoints
router.get('/status', requireAuth, (req, res, next) =>
  slackController.getStatus(req, res, next)
);
router.get('/connect', requireAuth, (req, res) => slackController.connect(req, res));
router.post('/disconnect', requireAuth, (req, res, next) =>
  slackController.disconnect(req, res, next)
);

export const slackRoutes = router;
