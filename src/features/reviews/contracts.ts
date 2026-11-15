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
