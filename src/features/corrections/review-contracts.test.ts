import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseResolution, reviewQuery } from './review-contracts';
const form = {
  reportId: 'report-one',
  outcome: 'accepted',
  reason: 'Reviewed the official source and corrected this price.',
  sourceId: 'official-tariff',
  sourceRow: '1',
  reviewedRevision: '2',
  reviewedPriceId: 'price-disputed',
  confirmReview: 'yes',
  priceAction: 'review_price',
  amount: '450.05',
  standardPrice: 'yes',
};
test('resolution validation requires explicit review and exact positive BDT amounts', () => {
  assert.equal(parseResolution(form).amountMinor, 45005);
  for (const changes of [
    { confirmReview: '' },
    { standardPrice: '' },
    { amount: '1.999' },
    { amount: '0' },
    { sourceRow: '' },
    { outcome: 'pending' },
    { reviewedRevision: '0' },
    { effectiveDate: '2026-02-30' },
  ])
    assert.throws(() => parseResolution({ ...form, ...changes }));
});
test('resolution reasons remain literal, bounded text and IDs cannot contain target paths', () => {
  const reason = '<script>literal text only</script>\nSecond line.';
  assert.equal(parseResolution({ ...form, reason }).reason, reason);
  assert.throws(() => parseResolution({ ...form, reason: 'x'.repeat(2001) }));
  assert.throws(() => parseResolution({ ...form, sourceId: '../source' }));
  assert.throws(() => parseResolution({ ...form, reportId: "' OR 1=1" }));
  const unknown = parseResolution({ ...form, priceAction: 'unknown', amount: '999' });
  assert.equal(unknown.amountMinor, null);
});
test('queue cursors retain timestamp and stable ID with bounded page size', () => {
  assert.deepEqual(
    reviewQuery({ status: 'all', after: '1793180000000:report-one', limit: '2' }).after,
    { time: 1793180000000, id: 'report-one' },
  );
  for (const input of [
    { status: '__proto__' },
    { after: 'invalid' },
    { after: '9999999999999999:report-one' },
    { limit: 101 },
    { report: '../private' },
  ])
    assert.throws(() => reviewQuery(input));
});
