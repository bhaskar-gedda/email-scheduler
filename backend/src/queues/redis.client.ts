import Redis, { RedisOptions } from 'ioredis';
import { config } from '../config/env';
import { logger } from '../config/logger';

export const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    logger.warn({ retryAttempt: times, delay }, 'Reconnecting to Redis...');
    return delay;
  },
};

export const redis = new Redis(config.REDIS_URL, redisOptions);

redis.on('connect', () => {
  logger.info('Connected to Redis');
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

// ============================================================================
// Redis Lua Scripts
// ============================================================================

/**
 * 1. Atomic Check-and-Increment for Distributed Hourly Rate Limiting
 * KEYS[1]: "email-rate:{senderId}:{YYYYMMDDHH}"
 * ARGV[1]: maxLimit (number)
 * ARGV[2]: ttlInSeconds (number)
 * Returns: [allowed (1 or 0), currentCount (number)]
 */
const CHECK_AND_INCR_RATE_LIMIT_LUA = `
local key = KEYS[1]
local maxLimit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

local current = redis.call('get', key)
if current and tonumber(current) >= maxLimit then
    return {0, tonumber(current)}
end

local newCount = redis.call('incr', key)
if newCount == 1 then
    redis.call('expire', key, ttl)
end
return {1, newCount}
`;

/**
 * 2. Atomic Reservation for Per-Sender Minimum Delay
 * KEYS[1]: "sender:delay:{senderId}"
 * ARGV[1]: nowMs (number)
 * ARGV[2]: minDelayMs (number)
 * Returns: [allowedImmediately (1 or 0), requiredDelayMs (number)]
 */
const RESERVE_SENDER_SLOT_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local minDelay = tonumber(ARGV[2])

local nextAvailable = redis.call('get', key)
if not nextAvailable or tonumber(nextAvailable) <= now then
    redis.call('set', key, now + minDelay, 'PX', minDelay * 10)
    return {1, 0}
else
    local scheduledTime = tonumber(nextAvailable)
    redis.call('set', key, scheduledTime + minDelay, 'PX', minDelay * 10)
    return {0, scheduledTime - now}
end
`;

// Define commands on the redis instance
redis.defineCommand('checkAndIncrRateLimit', {
  numberOfKeys: 1,
  lua: CHECK_AND_INCR_RATE_LIMIT_LUA,
});

redis.defineCommand('reserveSenderSlot', {
  numberOfKeys: 1,
  lua: RESERVE_SENDER_SLOT_LUA,
});

export interface CustomRedisCommands {
  checkAndIncrRateLimit(
    key: string,
    maxLimit: number,
    ttlInSeconds: number
  ): Promise<[number, number]>;
  reserveSenderSlot(
    key: string,
    nowMs: number,
    minDelayMs: number
  ): Promise<[number, number]>;
}

export type AppRedis = Redis & CustomRedisCommands;
export const appRedis = redis as AppRedis;
