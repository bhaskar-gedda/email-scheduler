import { describe, it, expect } from 'vitest';
import {
  generateEmailIdempotencyKey,
  generateClientMessageId,
  getBullJobId,
} from '../src/utils/idempotency';

describe('Idempotency & Message-ID', () => {
  it('generates consistent deterministic idempotency keys for identical inputs', () => {
    const campaignId = 'camp-123';
    const recipient = 'lead@example.com';
    const scheduledAt = new Date('2026-09-22T10:00:00Z');

    const key1 = generateEmailIdempotencyKey(campaignId, recipient, scheduledAt);
    const key2 = generateEmailIdempotencyKey(campaignId, 'LEAD@example.com ', scheduledAt);

    expect(key1).toBe(key2);
    expect(key1.length).toBe(64); // SHA-256 hex
  });

  it('generates different idempotency keys for different recipients or times', () => {
    const campaignId = 'camp-123';
    const date1 = new Date('2026-09-22T10:00:00Z');
    const date2 = new Date('2026-09-22T10:00:02Z');

    const keyA = generateEmailIdempotencyKey(campaignId, 'lead-a@example.com', date1);
    const keyB = generateEmailIdempotencyKey(campaignId, 'lead-b@example.com', date1);
    const keyC = generateEmailIdempotencyKey(campaignId, 'lead-a@example.com', date2);

    expect(keyA).not.toBe(keyB);
    expect(keyA).not.toBe(keyC);
  });

  it('formats deterministic RFC 5322 Message-ID correctly', () => {
    const key = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    const sender = 'outreach@sales.outboxlabs.com';

    const msgId = generateClientMessageId(key, sender);
    expect(msgId).toBe(`<${key.slice(0, 32)}@sales.outboxlabs.com>`);
  });

  it('formats BullMQ job ID with email prefix', () => {
    const emailId = 'email-uuid-999';
    expect(getBullJobId(emailId)).toBe('email:email-uuid-999');
  });
});
