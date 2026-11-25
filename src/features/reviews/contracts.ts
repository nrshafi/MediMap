import { catalogId, record } from '../catalog/contracts';
export const ratingDimensions = [
  'Service quality',
  'Staff behavior',
  'Waiting time',
  'Cleanliness',
  'Value',
  'Report-delivery experience',
] as const;
export function reviewInput(value: unknown) {
  const input = record(value);
  const listing = catalogId(input.listing);
  const revision = Number(input.revision ?? 0);
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error('Invalid revision');
  if (typeof input.body !== 'string' || input.body.trim().length > 2000)
    throw new Error('Review text must have at most 2,000 characters.');
  const scores = ratingDimensions.map((_, i) => {
    const n = Number(input[`score${i}`]);
    if (!Number.isInteger(n) || n < 1 || n > 5)
      throw new Error('Each rating must be an integer from one to five.');
    return n;
  });
  return { listing, revision, body: input.body.trim(), scores };
}
export function reviewMean(scores: readonly number[]) {
  if (scores.length !== 6 || scores.some((n) => !Number.isInteger(n) || n < 1 || n > 5))
    throw new Error('Invalid ratings');
  return scores.reduce((a, b) => a + b, 0) / 6;
}

export const reviewResultMessages = {
  saved: 'Review saved.',
  reported: 'Review report saved for administrator review.',
} as const;
export type ReviewResultCode = keyof typeof reviewResultMessages;

export const reviewErrorMessages = {
  write_failed:
    'Review was not saved. Check sign-in, ratings, submission limits, and whether the review changed. Reload before trying again.',
  report_failed:
    'Review report was not saved. Check sign-in, the reason, duplicates, and submission limits.',
} as const;
export type ReviewErrorCode = keyof typeof reviewErrorMessages;

export function parseReviewResult(value: unknown): ReviewResultCode | undefined {
  return typeof value === 'string' && Object.hasOwn(reviewResultMessages, value)
    ? (value as ReviewResultCode)
    : undefined;
}

export function parseReviewError(value: unknown): ReviewErrorCode | undefined {
  return typeof value === 'string' && Object.hasOwn(reviewErrorMessages, value)
    ? (value as ReviewErrorCode)
    : undefined;
}
