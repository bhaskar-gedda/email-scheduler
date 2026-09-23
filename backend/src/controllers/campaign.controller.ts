import { Request, Response, NextFunction } from 'express';
import { campaignService } from '../services/campaign.service';
import { parseLeadsContent } from '../utils/csv-parser';
import { z } from 'zod';

export const createCampaignSchema = z.object({
  senderId: z.string().uuid('Valid sender ID required'),
  subject: z.string().min(1, 'Subject line cannot be empty'),
  body: z.string().min(1, 'Email body cannot be empty'),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Valid ISO start time required',
  }),
  delayBetweenEmails: z.coerce.number().min(500).default(2000),
  hourlyLimit: z.coerce.number().min(1).max(10000).default(200),
  recipients: z.array(z.string()).min(1, 'At least one recipient email is required'),
});

export class CampaignController {
  /**
   * Parses CSV or text files and validates email recipients without scheduling.
   */
  public async previewLeads(req: Request, res: Response, next: NextFunction) {
    try {
      let content = '';

      if (req.file) {
        content = req.file.buffer.toString('utf8');
      } else if (req.body.content) {
        content = String(req.body.content);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Please provide a CSV/text file or raw content of email leads',
        });
      }

      const result = parseLeadsContent(content);

      res.json({
        success: true,
        data: {
          validEmails: result.validEmails,
          invalidEntries: result.invalidEntries,
          totalDuplicates: result.totalDuplicates,
          validCount: result.validEmails.length,
          invalidCount: result.invalidEntries.length,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Creates an email campaign and schedules delayed BullMQ jobs.
   */
  public async createCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await campaignService.createAndScheduleCampaign(req.user!.id, req.body);

      res.status(201).json({
        success: true,
        message: `${result.totalScheduled} emails scheduled successfully.`,
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || 'Unable to schedule emails',
      });
    }
  }

  /**
   * Gets details for a specific campaign.
   */
  public async getCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const campaign = await campaignService.getCampaignById(req.params.id, req.user!.id);
      if (!campaign) {
        return res.status(404).json({ success: false, message: 'Campaign not found' });
      }
      res.json({ success: true, data: campaign });
    } catch (err) {
      next(err);
    }
  }
}

export const campaignController = new CampaignController();
