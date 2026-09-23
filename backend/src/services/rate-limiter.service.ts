import { appRedis } from '../queues/redis.client';
import { config } from '../config/env';
import { logger } from '../config/logger';

export class RateLimiterService {
  /**
   * Generates a deterministic hour window key in UTC: YYYYMMDDHH
   */
  public static getHourWindow(date: Date = new Date()): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    return `${year}${month}${day}${hour}`;
  }

  /**
   * Calculates the exact start timestamp of the next UTC hour window.
   */
  public static getNextHourWindowStart(date: Date = new Date()): Date {
    const nextHour = new Date(date);
    nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 0, 0);
    return nextHour;
  }

  /**
   * Distributed atomic check-and-increment using Redis Lua.
   * Never exceeds the hourly limit regardless of worker concurrency.
   */
  public async checkAndIncrementHourlyLimit(
    senderId: string,
    customLimit?: number
  ): Promise<{ allowed: boolean; currentCount: number; hourWindow: string }> {
    const hourWindow = RateLimiterService.getHourWindow();
    const key = `email-rate:${senderId}:${hourWindow}`;
    const limit = customLimit ?? config.MAX_EMAILS_PER_HOUR_PER_SENDER;
    const ttlSeconds = 7200; // 2 hours

    const [allowedNum, count] = await appRedis.checkAndIncrRateLimit(
      key,
      limit,
      ttlSeconds
    );

    const allowed = allowedNum === 1;
    logger.debug(
      { senderId, hourWindow, limit, count, allowed },
      'Atomic hourly rate limit check evaluated'
    );

    return { allowed, currentCount: count, hourWindow };
  }

  /**
   * Distributed atomic reservation for per-sender minimum email delay.
   * Guarantees emails from the same sender are spaced by at least minDelayMs.
   */
  public async reserveSenderMinDelay(
    senderId: string,
    minDelayMs?: number
  ): Promise<{ allowedImmediately: boolean; waitMs: number }> {
    const delay = minDelayMs ?? config.MIN_EMAIL_DELAY_MS;
    const key = `sender:delay:${senderId}`;
    const now = Date.now();

    const [allowedNum, waitMs] = await appRedis.reserveSenderSlot(key, now, delay);

    return {
      allowedImmediately: allowedNum === 1,
      waitMs,
    };
  }

  /**
   * Atomic lock to ensure only ONE Slack rate-limit alert is sent per sender per hour window.
   */
  public async tryAcquireSlackNotificationLock(
    senderId: string,
    hourWindow: string
  ): Promise<boolean> {
    const key = `slack-rate-limit-notified:${senderId}:${hourWindow}`;
    // SETNX with 1 hour TTL
    const result = await appRedis.set(key, '1', 'EX', 3600, 'NX');
    return result === 'OK';
  }
}

export const rateLimiterService = new RateLimiterService();
