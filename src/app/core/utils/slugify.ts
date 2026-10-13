/**
 * Canonical slugify function matching Apps Script and Angular implementation.
 *
 * Rules:
 * 1. Convert to string, trim.
 * 2. normalize('NFKD'), then remove combining marks (\p{M}).
 * 3. Lowercase.
 * 4. Replace every run of characters that are not \p{L} or \p{N} with a single '-'.
 * 5. Strip leading/trailing '-'.
 * 6. An empty result means invalid (returns empty string).
 */
export function slugify(input: unknown): string {
  if (input === null || input === undefined) {
    return '';
  }

  const str = String(input).trim();
  if (!str) {
    return '';
  }

  // Step 2: Normalize NFKD and remove combining marks (\p{M})
  const decomposed = str.normalize('NFKD').replace(/\p{M}/gu, '');

  // Step 3: Lowercase
  const lower = decomposed.toLowerCase();

  // Step 4: Replace runs of non-letters/non-numbers with a single '-'
  const hyphenated = lower.replace(/[^\p{L}\p{N}]+/gu, '-');

  // Step 5: Strip leading and trailing '-'
  const cleaned = hyphenated.replace(/^-+|-+$/g, '');

  // Step 6: Empty result is invalid
  return cleaned;
}

export function isValidSlug(slug: string): boolean {
  return typeof slug === 'string' && slug.length > 0 && !slug.includes('/');
}
