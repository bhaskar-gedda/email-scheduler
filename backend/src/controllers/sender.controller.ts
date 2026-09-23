import { Request, Response, NextFunction } from 'express';
import { senderService } from '../services/sender.service';
import { z } from 'zod';

export const createSenderSchema = z.object({
  email: z.string().email('Valid email required'),
  displayName: z.string().min(1, 'Display name required'),
  smtpHost: z.string().min(1, 'SMTP host required'),
  smtpPort: z.coerce.number().min(1).max(65535).default(587),
  smtpUser: z.string().optional().default(''),
  smtpPassword: z.string().optional().default(''),
});

export class SenderController {
  public async listSenders(req: Request, res: Response, next: NextFunction) {
    try {
      const senders = await senderService.getSendersForUser(req.user!.id);
      res.json({ success: true, data: senders });
    } catch (err) {
      next(err);
    }
  }

  public async createSender(req: Request, res: Response, next: NextFunction) {
    try {
      const sender = await senderService.createSender(req.user!.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Sender created successfully',
        data: sender,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const senderController = new SenderController();
