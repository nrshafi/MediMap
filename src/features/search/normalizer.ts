/**
 * Unicode and script normalization for diagnostic queries.
 * Supports English and Bengali text.
 */

const ZERO_WIDTH_REGEX = /[\u200B-\u200D\u2060\uFEFF]/g;
const WHITESPACE_COLLAPSE_REGEX = /\s+/g;
const TOKEN_REGEX = /[\u0980-\u09FFa-z0-9]+/g;

/**
 * Remove zero-width formatting characters.
 */
export function stripZeroWidth(text: string): string {
  return text.replace(ZERO_WIDTH_REGEX, '');
}

/**
 * Normalize input query text.
 * Applies NFKC normalization, removes zero-width characters,
 * converts characters to lowercase, and collapses whitespace.
 */
export function normalizeText(text: string): string {
  if (!text) {
    return '';
  }

  const nfkc = text.normalize('NFKC');
  const withoutZeroWidth = stripZeroWidth(nfkc);
  const lowercased = withoutZeroWidth.toLowerCase();
  return lowercased.trim().replace(WHITESPACE_COLLAPSE_REGEX, ' ');
}

/**
 * Extract tokens from normalized text.
 * Supports English alphanumeric and Bengali script words.
 */
export function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) {
    return [];
  }

  const matches = normalized.match(TOKEN_REGEX);
  return matches ? Array.from(matches) : [];
}
