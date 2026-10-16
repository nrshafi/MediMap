/**
 * Typo matching using the Damerau-Levenshtein distance algorithm.
 * Applies distance thresholds and guards against fuzzy matching short acronyms.
 */

export interface TypoMatchResult {
  readonly isMatch: boolean;
  readonly distance: number;
  readonly similarity: number;
}

/**
 * Calculate Damerau-Levenshtein distance between two strings.
 * Accounts for insertions, deletions, substitutions, and transpositions.
 */
export function damerauLevenshteinDistance(source: string, target: string): number {
  const sourceLength = source.length;
  const targetLength = target.length;

  if (sourceLength === 0) {
    return targetLength;
  }
  if (targetLength === 0) {
    return sourceLength;
  }

  const matrix: number[][] = Array.from({ length: sourceLength + 1 }, () =>
    new Array<number>(targetLength + 1).fill(0)
  );

  for (let i = 0; i <= sourceLength; i += 1) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= targetLength; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= sourceLength; i += 1) {
    const sourceChar = source[i - 1];

    for (let j = 1; j <= targetLength; j += 1) {
      const targetChar = target[j - 1];
      const substitutionCost = sourceChar === targetChar ? 0 : 1;

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + substitutionCost
      );

      if (
        i > 1 &&
        j > 1 &&
        source[i - 1] === target[j - 2] &&
        source[i - 2] === target[j - 1]
      ) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
      }
    }
  }

  return matrix[sourceLength][targetLength];
}

/**
 * Calculate string similarity ratio from 0 to 1 based on distance.
 */
export function calculateSimilarity(
  source: string,
  target: string,
  distance: number
): number {
  const maxLength = Math.max(source.length, target.length);
  if (maxLength === 0) {
    return 1;
  }
  return Math.max(0, (maxLength - distance) / maxLength);
}

/**
 * Check if the query is a plausible typo match for the target string.
 *
 * Enforces the short acronym guard:
 * Strings with three or fewer characters must not match with fuzzy search.
 *
 * Distance and similarity thresholds:
 * - 4 to 6 characters: maximum distance 1, minimum similarity 0.8.
 * - 7 or more characters: maximum distance 2, minimum similarity 0.75.
 */
export function checkTypoMatch(query: string, target: string): TypoMatchResult {
  if (query.length <= 3 || target.length <= 3) {
    return {
      isMatch: false,
      distance: Infinity,
      similarity: 0,
    };
  }

  if (Math.abs(query.length - target.length) > 2) {
    return { isMatch: false, distance: Infinity, similarity: 0 };
  }

  const distance = damerauLevenshteinDistance(query, target);
  const similarity = calculateSimilarity(query, target, distance);
  const referenceLength = Math.max(query.length, target.length);

  if (referenceLength >= 4 && referenceLength <= 6) {
    const isMatch = distance <= 1 && similarity >= 0.8;
    return { isMatch, distance, similarity };
  }

  if (referenceLength >= 7) {
    const isMatch = distance <= 2 && similarity >= 0.75;
    return { isMatch, distance, similarity };
  }

  return { isMatch: false, distance, similarity };
}

