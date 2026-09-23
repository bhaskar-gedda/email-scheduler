import { describe, it, expect } from 'vitest';
import { parseLeadsContent } from '../src/utils/csv-parser';

describe('CSV & Text Leads Parser', () => {
  it('parses CSV with standard header column "Email"', () => {
    const csv = `Name,Email,Company
John Doe,john@example.com,Acme Corp
Jane Smith,jane@example.com,Global Inc
Invalid Person,bad-email,Tech LLC`;

    const result = parseLeadsContent(csv);

    expect(result.validEmails).toEqual(['john@example.com', 'jane@example.com']);
    expect(result.invalidEntries).toEqual(['bad-email']);
    expect(result.totalDuplicates).toBe(0);
  });

  it('parses plain text newline-delimited lists', () => {
    const text = `
lead1@example.com
lead2@example.com
lead3@example.com
`;

    const result = parseLeadsContent(text);

    expect(result.validEmails).toEqual([
      'lead1@example.com',
      'lead2@example.com',
      'lead3@example.com',
    ]);
    expect(result.totalDuplicates).toBe(0);
  });

  it('handles duplicates and mixed formats', () => {
    const mixed = `
lead1@example.com
LEAD1@example.com
invalid-entry
lead2@example.com, lead3@example.com
`;

    const result = parseLeadsContent(mixed);

    expect(result.validEmails).toContain('lead1@example.com');
    expect(result.validEmails).toContain('lead2@example.com');
    expect(result.validEmails).toContain('lead3@example.com');
    expect(result.totalDuplicates).toBe(1);
    expect(result.invalidEntries).toContain('invalid-entry');
  });

  it('returns empty result for blank content', () => {
    const result = parseLeadsContent('');
    expect(result.validEmails).toEqual([]);
    expect(result.invalidEntries).toEqual([]);
    expect(result.totalDuplicates).toBe(0);
  });
});
