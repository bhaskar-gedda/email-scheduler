import { parse } from 'csv-parse/sync';
import { validateAndDeduplicateEmails, ValidationResult } from './email-validator';

export function parseLeadsContent(content: string): ValidationResult {
  if (!content || !content.trim()) {
    return { validEmails: [], invalidEntries: [], totalDuplicates: 0 };
  }

  const rawCandidateEmails: string[] = [];

  try {
    // Attempt CSV parsing first
    const records = parse(content, {
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as string[][];

    if (records.length > 0) {
      // Check if header exists
      const header = records[0].map((h) => h.toLowerCase());
      const emailColIdx = header.findIndex(
        (col) => col.includes('email') || col.includes('mail') || col.includes('recipient')
      );

      if (emailColIdx !== -1) {
        // Has header column
        for (let i = 1; i < records.length; i++) {
          const row = records[i];
          if (row[emailColIdx]) {
            rawCandidateEmails.push(row[emailColIdx]);
          }
        }
      } else {
        // No obvious header, inspect all fields in every row
        for (const row of records) {
          for (const cell of row) {
            const trimmed = cell?.trim();
            if (trimmed) {
              rawCandidateEmails.push(trimmed);
            }
          }
        }
      }
    }
  } catch {
    // Fallback: simple line-by-line split
    const lines = content.split(/[\r\n,;]+/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        rawCandidateEmails.push(trimmed);
      }
    }
  }

  // If CSV parsing produced no candidate emails, also try fallback line split
  if (rawCandidateEmails.length === 0) {
    const lines = content.split(/[\r\n,;]+/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        rawCandidateEmails.push(trimmed);
      }
    }
  }

  return validateAndDeduplicateEmails(rawCandidateEmails);
}
