import { Router, Request, Response, NextFunction } from 'express';
import { slackController } from '../controllers/slack.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Callback is triggered by Slack redirect (uses state query parameter for user correlation)
router.get('/callback', (req: Request, res: Response) => slackController.callback(req, res));

// Authenticated Slack endpoints
router.get('/status', requireAuth, (req: Request, res: Response, next: NextFunction) =>
  slackController.getStatus(req, res, next)
);
router.get('/connect', requireAuth, (req: Request, res: Response) => slackController.connect(req, res));
router.post('/disconnect', requireAuth, (req: Request, res: Response, next: NextFunction) =>
  slackController.disconnect(req, res, next)
);

export const slackRoutes = router;
