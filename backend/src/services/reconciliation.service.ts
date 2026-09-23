import { prisma } from '../models/prisma';
import { emailQueue, enqueueEmailJob } from '../queues/email.queue';
import { logger } from '../config/logger';

export class ReconciliationService {
  /**
   * Idempotent startup reconciliation routine.
   * Runs once on startup to recover any missing BullMQ jobs for pending emails
   * and reset stale PROCESSING leases without re-sending SENT emails.
   */
  public async reconcile(): Promise<{ recoveredCount: number; resetLeasesCount: number }> {
    logger.info('Starting email queue startup reconciliation...');
    let recoveredCount = 0;
    let resetLeasesCount = 0;

    try {
      const now = new Date();

      // 1. Recover stale PROCESSING leases where worker crashed
      const staleProcessingEmails = await prisma.email.findMany({
        where: {
          status: 'PROCESSING',
          processingLeaseExpiresAt: {
            lt: now,
          },
        },
      });

      for (const email of staleProcessingEmails) {
        // Dual-write check: If send was already attempted before crash, check attempts
        if (email.sendAttemptedAt && email.attempts > 1) {
          logger.warn(
            { emailId: email.id, attempts: email.attempts, sendAttemptedAt: email.sendAttemptedAt },
            'Email had prior send attempt before crash. Marking FAILED/AMBIGUOUS to avoid duplicate send.'
          );
          await prisma.email.update({
            where: { id: email.id },
            data: {
              status: 'FAILED',
              failureReason: 'Worker crashed during SMTP dispatch; delivery status ambiguous',
              processingLeaseExpiresAt: null,
              processingWorkerId: null,
            },
          });
          continue;
        }

        // Reset lease and revert to SCHEDULED
        await prisma.email.update({
          where: { id: email.id },
          data: {
            status: 'SCHEDULED',
            processingLeaseExpiresAt: null,
            processingWorkerId: null,
          },
        });
        resetLeasesCount++;
      }

      // 2. Find all pending emails that SHOULD be in BullMQ
      // (STRICTLY excludes SENT emails)
      const pendingEmails = await prisma.email.findMany({
        where: {
          status: {
            in: ['SCHEDULED', 'RATE_LIMITED'],
          },
        },
      });

      for (const email of pendingEmails) {
        const jobId = email.bullJobId || `email_${email.id}`;
        const existingJob = await emailQueue.getJob(jobId);

        if (!existingJob) {
          // Job is missing from Redis (e.g., Redis restart/flush)
          logger.warn(
            { emailId: email.id, jobId, scheduledAt: email.scheduledAt },
            'Missing job detected in Redis. Idempotently restoring delayed job.'
          );
          await enqueueEmailJob(email.id, email.scheduledAt, jobId);
          recoveredCount++;
        }
      }

      logger.info(
        { pendingChecked: pendingEmails.length, recoveredCount, resetLeasesCount },
        'Startup reconciliation completed successfully'
      );
    } catch (err: any) {
      logger.error({ err }, 'Error during queue startup reconciliation');
    }

    return { recoveredCount, resetLeasesCount };
  }
}

export const reconciliationService = new ReconciliationService();
