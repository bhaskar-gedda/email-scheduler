import { Request, Response, NextFunction } from 'express';
import { slackService } from '../integrations/slack/slack.service';
import { config } from '../config/env';
import { logger } from '../config/logger';

export class SlackController {
  public async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await slackService.getStatus(req.user!.id);
      res.json({ success: true, data: status });
    } catch (err) {
      next(err);
    }
  }

  public connect(req: Request, res: Response) {
    if (!slackService.isConfigured()) {
      return res.status(400).json({
        success: false,
        message:
          'Slack OAuth is not configured. Please set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET in .env',
      });
    }

    try {
      // Pass userId as state for correlation in callback
      const url = slackService.getAuthorizeUrl(req.user!.id);
      res.redirect(url);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Failed to initialize Slack OAuth',
      });
    }
  }

  public async callback(req: Request, res: Response) {
    const code = req.query.code as string;
    const error = req.query.error as string;
    const stateUserId = (req.query.state as string) || req.session?.userId;

    if (error) {
      logger.warn({ error }, 'Slack OAuth returned an error parameter');
      return res.redirect(`${config.FRONTEND_URL}/dashboard?slack_error=${encodeURIComponent(error)}`);
    }

    if (!code || !stateUserId) {
      return res.redirect(
        `${config.FRONTEND_URL}/dashboard?slack_error=missing_code_or_session`
      );
    }

    try {
      await slackService.handleCallback(code, stateUserId);
      res.redirect(`${config.FRONTEND_URL}/dashboard?slack_connected=true`);
    } catch (err: any) {
      logger.error({ err: err?.message || err }, 'Failed to complete Slack OAuth exchange');
      res.redirect(
        `${config.FRONTEND_URL}/dashboard?slack_error=${encodeURIComponent(
          err?.message || 'slack_auth_failed'
        )}`
      );
    }
  }

  public async disconnect(req: Request, res: Response, next: NextFunction) {
    try {
      await slackService.disconnect(req.user!.id);
      res.json({ success: true, message: 'Slack disconnected successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export const slackController = new SlackController();
