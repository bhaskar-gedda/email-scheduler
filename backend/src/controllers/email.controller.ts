import { Request, Response, NextFunction } from 'express';
import { emailService } from '../services/email.service';

export class EmailController {
  public async getScheduled(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const result = await emailService.getScheduledEmails(req.user!.id, page, pageSize);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public async getSent(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const result = await emailService.getSentEmails(req.user!.id, page, pageSize);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public async searchEmails(req: Request, res: Response, next: NextFunction) {
    try {
      const q = (req.query.q as string) || '';
      const status = req.query.status as string | undefined;

      const results = await emailService.searchEmails(req.user!.id, q, status);
      res.json({
        success: true,
        data: results,
        total: results.length,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const emailController = new EmailController();
