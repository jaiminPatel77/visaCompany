/**
 * Generates 1-2 uppercase characters representing the company name.
 * Fallback when no logo is available.
 */
export function getCompanyInitials(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (!trimmed) return '';

  // Replace symbols/punctuation with spaces, then split by whitespace
  const words = trimmed
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length === 0) {
    const chars = trimmed.replace(/[^\p{L}\p{N}]/gu, '');
    return chars.slice(0, 2).toUpperCase();
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return (words[0][0] + words[1][0]).toUpperCase();
}
