import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { emailQueue } from '../queues/email.queue';
import { config } from '../config/env';
import { Request, Response, NextFunction } from 'express';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});

/**
 * Access control middleware for Bull Board dashboard.
 * Allows access if the user has an active session OR provides valid HTTP basic auth.
 */
export function bullBoardAuth(req: Request, res: Response, next: NextFunction) {
  // Allow if user is logged into session
  if (req.session?.userId) {
    return next();
  }

  // Check HTTP Basic Auth
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Basic ')) {
    const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString('ascii');
    const [user, pass] = credentials.split(':');

    if (user === config.BULL_BOARD_USER && pass === config.BULL_BOARD_PASSWORD) {
      return next();
    }
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Bull Board Access"');
  return res.status(401).send('Authentication required to access Bull Board dashboard.');
}

export const bullBoardRouter = serverAdapter.getRouter();
