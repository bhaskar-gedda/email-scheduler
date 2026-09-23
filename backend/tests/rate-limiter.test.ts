import { describe, it, expect } from 'vitest';
import { RateLimiterService } from '../src/services/rate-limiter.service';

describe('Rate Limiter Windows & Rescheduling Calculation', () => {
  it('formats UTC hour window as YYYYMMDDHH correctly', () => {
    const fixedDate = new Date(Date.UTC(2026, 8, 22, 14, 30, 0)); // September is month index 8
    const window = RateLimiterService.getHourWindow(fixedDate);
    expect(window).toBe('2026092214');
  });

  it('calculates the exact start of the next hour window', () => {
    const fixedDate = new Date(Date.UTC(2026, 8, 22, 14, 45, 12, 500));
    const nextHour = RateLimiterService.getNextHourWindowStart(fixedDate);

    expect(nextHour.getUTCFullYear()).toBe(2026);
    expect(nextHour.getUTCMonth()).toBe(8);
    expect(nextHour.getUTCDate()).toBe(22);
    expect(nextHour.getUTCHours()).toBe(15);
    expect(nextHour.getUTCMinutes()).toBe(0);
    expect(nextHour.getUTCSeconds()).toBe(0);
    expect(nextHour.getUTCMilliseconds()).toBe(0);
  });

  it('rolls over month/year boundary correctly for next hour calculation', () => {
    const newYearsEve = new Date(Date.UTC(2026, 11, 31, 23, 59, 0)); // Dec 31 23:59 UTC
    const nextHour = RateLimiterService.getNextHourWindowStart(newYearsEve);

    expect(nextHour.getUTCFullYear()).toBe(2027);
    expect(nextHour.getUTCMonth()).toBe(0); // January
    expect(nextHour.getUTCDate()).toBe(1);
    expect(nextHour.getUTCHours()).toBe(0);
  });
});
