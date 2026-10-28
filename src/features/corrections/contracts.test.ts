import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseReport, reportTargetQuery } from './contracts';
const report = {
  target: 'listing',
  id: 'complete-blood-count-listing',
  issue: 'price',
  observedRevision: '1',
  observedPriceId: 'price-one',
  details: 'The current published tariff shows a different standard price.',
  confirmReport: 'yes',
};
test('report issue types stay bound to the selected target', () => {
  assert.equal(parseReport(report).issue, 'price');
  assert.throws(() => parseReport({ ...report, target: 'branch' }));
  assert.throws(() =>
    parseReport({ ...report, target: 'provider', issue: 'provider_information' }),
  );
  assert.equal(
    parseReport({
      ...report,
      target: 'provider',
      issue: 'provider_information',
      observedPriceId: '',
    }).target,
    'provider',
  );
});
test('report validation rejects forged target paths, unsupported issues and invalid snapshots', () => {
  for (const changes of [
    { id: "' OR 1=1" },
    { issue: 'review_abuse' },
    { observedRevision: '0' },
    { observedPriceId: '../bad' },
    { confirmReport: '' },
    { details: 'Too short' },
  ])
    assert.throws(() => parseReport({ ...report, ...changes }));
  assert.throws(() => reportTargetQuery({ target: 'review', id: 'review' }));
});
test('report text remains literal, bounded, and independent from published values', () => {
  const result = parseReport({
    ...report,
    details: '<script>literal report text is not executable</script>\nSecond line.',
    suggestedCorrection: '450 taka',
    evidenceUrl: 'https://example.test/tariff',
  });
  assert.match(result.details, /<script>/);
  assert.equal(result.suggestedCorrection, '450 taka');
  assert.throws(() => parseReport({ ...report, evidenceUrl: 'javascript:alert(1)' }));
  assert.throws(() =>
    parseReport({ ...report, evidenceUrl: 'https://user:password@example.test/' }),
  );
  assert.throws(() => parseReport({ ...report, details: 'x'.repeat(2001) }));
});
