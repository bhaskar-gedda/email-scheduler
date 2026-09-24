import { Queue, JobsOptions } from 'bullmq';
import { redis } from './redis.client';
import { logger } from '../config/logger';

export const EMAIL_QUEUE_NAME = 'email-sending-queue';

export interface EmailJobData {
  emailId: string;
}

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24h for audit/Bull Board inspection
      count: 10000,
    },
    removeOnFail: {
      age: 86400 * 3, // Keep failed jobs for 3 days
    },
  },
});

emailQueue.on('error', (err) => {
  logger.error({ err }, 'BullMQ emailQueue error');
});

/**
 * Enqueues a delayed email job in BullMQ.
 * Uses deterministic jobId to prevent duplicate queueing.
 */
export async function enqueueEmailJob(
  emailId: string,
  scheduledAt: Date,
  bullJobId: string
): Promise<void> {
  const now = Date.now();
  const scheduledTime = new Date(scheduledAt).getTime();
  const delay = Math.max(0, scheduledTime - now);

  const options: JobsOptions = {
    jobId: bullJobId,
    delay,
  };

  await emailQueue.add('send-email', { emailId }, options);
  logger.debug(
    { emailId, bullJobId, scheduledAt, delayMs: delay },
    'Enqueued delayed email job in BullMQ'
  );
}

/**
 * Reschedules an email job to a new time (e.g. after hitting the hourly rate limit).
 * Removes previous job if needed and re-adds with the new delay.
 */
export async function rescheduleEmailJob(
  emailId: string,
  newScheduledAt: Date,
  bullJobId: string
): Promise<void> {
  const existingJob = await emailQueue.getJob(bullJobId);
  if (existingJob) {
    try {
      await existingJob.remove();
    } catch (e) {
      logger.warn({ err: e, bullJobId }, 'Could not remove existing job before rescheduling');
    }
  }

  const delay = Math.max(0, new Date(newScheduledAt).getTime() - Date.now());
  await emailQueue.add('send-email', { emailId }, { jobId: bullJobId, delay });
  logger.info(
    { emailId, bullJobId, newScheduledAt, delayMs: delay },
    'Rescheduled email job to new window'
  );
}
