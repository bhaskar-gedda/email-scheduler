import crypto from 'crypto';

/**
 * Generates a deterministic idempotency key for an individual email within a campaign.
 */
export function generateEmailIdempotencyKey(
  campaignId: string,
  recipient: string
): string {
  const payload = `${campaignId}:${recipient.toLowerCase().trim()}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Generates a deterministic RFC 5322 Message-ID for outbound SMTP messages.
 * Used to correlate pre-send intent with SMTP server response to prevent duplicate deliveries.
 */
export function generateClientMessageId(idempotencyKey: string, senderEmail: string): string {
  const domain = senderEmail.includes('@') ? senderEmail.split('@')[1] : 'outboxlabs.local';
  return `<${idempotencyKey.slice(0, 32)}@${domain}>`;
}

/**
 * Formats deterministic BullMQ job ID.
 */
export function getBullJobId(emailId: string): string {
  return `email_${emailId}`;
}
