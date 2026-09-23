import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  sanitizeEmail,
  validateAndDeduplicateEmails,
} from '../src/utils/email-validator';

describe('Email Validator', () => {
  it('correctly validates valid email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('first.last@domain.co.uk')).toBe(true);
    expect(isValidEmail('dev+test123@sub.domain.org')).toBe(true);
  });

  it('rejects invalid email formats', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('plainaddress')).toBe(false);
    expect(isValidEmail('@missingusername.com')).toBe(false);
    expect(isValidEmail('username@.com')).toBe(false);
    expect(isValidEmail('user@domain')).toBe(false);
  });

  it('sanitizes and normalizes emails to lowercase trimmed', () => {
    expect(sanitizeEmail('  USER@EXAMPLE.COM ')).toBe('user@example.com');
  });

  it('deduplicates emails and tracks duplicate count', () => {
    const raw = [
      'alice@example.com',
      'bob@example.com',
      'ALICE@example.com', // Duplicate
      'invalid-email',
      '  bob@example.com  ', // Duplicate
      'charlie@example.com',
    ];

    const result = validateAndDeduplicateEmails(raw);

    expect(result.validEmails).toEqual([
      'alice@example.com',
      'bob@example.com',
      'charlie@example.com',
    ]);
    expect(result.totalDuplicates).toBe(2);
    expect(result.invalidEntries).toEqual(['invalid-email']);
  });
});
