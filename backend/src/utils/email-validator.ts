// RFC 5322 official standard regex subset
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  return EMAIL_REGEX.test(trimmed);
}

export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface ValidationResult {
  validEmails: string[];
  invalidEntries: string[];
  totalDuplicates: number;
}

export function validateAndDeduplicateEmails(rawList: string[]): ValidationResult {
  const validSet = new Set<string>();
  const invalidEntries: string[] = [];
  let totalDuplicates = 0;

  for (const raw of rawList) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    if (isValidEmail(trimmed)) {
      const normalized = sanitizeEmail(trimmed);
      if (validSet.has(normalized)) {
        totalDuplicates++;
      } else {
        validSet.add(normalized);
      }
    } else {
      invalidEntries.push(trimmed);
    }
  }

  return {
    validEmails: Array.from(validSet),
    invalidEntries,
    totalDuplicates,
  };
}
