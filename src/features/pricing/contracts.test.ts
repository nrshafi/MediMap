import { test } from 'node:test';
import assert from 'node:assert/strict';
import { amountMinor, parsePricingEdit, utcTimestamp } from './contracts';
const now = Date.parse('2026-10-28T10:00:00Z');
const base = {
  entity: 'price',
  action: 'set',
  id: 'listing',
  revision: '1',
  amount: '400.01',
  status: 'unverified',
  standardPrice: 'yes',
};
test('BDT decimal input becomes exact integer paisa without rounding', () => {
  assert.equal(amountMinor('400.01'), 40001);
  assert.equal(amountMinor('0.01'), 1);
  assert.equal(amountMinor('90071992547409.91'), Number.MAX_SAFE_INTEGER);
  for (const value of ['0', '-1', '1.001', '1e2', '1,000', ' 10', '01', '90071992547409.92', 'NaN'])
    assert.throws(() => amountMinor(value));
});
test('verified prices require source evidence, standard-price assertion and a new review confirmation', () => {
  assert.throws(() => parsePricingEdit({ ...base, status: 'verified' }, now));
  assert.throws(() =>
    parsePricingEdit({ ...base, status: 'verified', sourceId: 'source', sourceRow: '1' }, now),
  );
  assert.equal(
    parsePricingEdit(
      { ...base, status: 'verified', sourceId: 'source', sourceRow: '1', confirmReview: 'yes' },
      now,
    ).entity,
    'price',
  );
  assert.throws(() => parsePricingEdit({ ...base, standardPrice: undefined }, now));
  assert.throws(() => parsePricingEdit({ ...base, effectiveDate: '2026-10-29' }, now));
  assert.throws(() => parsePricingEdit({ ...base, sourceRow: '1' }, now));
  assert.throws(() => parsePricingEdit({ ...base, confirmReview: 'yes' }, now));
});
test('unknown-price clearing and diagnostic mappings need explicit confirmation', () => {
  assert.throws(() =>
    parsePricingEdit({ entity: 'price', action: 'clear', id: 'listing', revision: '1' }, now),
  );
  assert.equal(
    parsePricingEdit(
      { entity: 'price', action: 'clear', id: 'listing', revision: '1', confirmClear: 'yes' },
      now,
    ).entity,
    'price',
  );
  const input = {
    entity: 'listing',
    mode: 'create',
    id: 'listing',
    branchId: 'branch',
    serviceId: 'service',
    providerServiceName: 'CBC',
    active: '1',
  };
  assert.throws(() => parsePricingEdit(input, now));
  assert.equal(parsePricingEdit({ ...input, confirmMapping: 'yes' }, now).entity, 'listing');
});
test('source metadata needs a real UTC collection timestamp, hash, collector and confirmation', () => {
  const source = {
    entity: 'source',
    id: 'source',
    providerId: 'provider',
    url: 'https://example.test/tariff',
    kind: 'official_tariff',
    retrievedAt: '2026-10-28T09:00:00Z',
    sha256: 'a'.repeat(64),
    collector: 'Actual collector',
    confirmSource: 'yes',
    currencyEvidence: 'explicit_taka_header',
  };
  assert.equal(parsePricingEdit(source, now).entity, 'source');
  for (const changes of [
    { retrievedAt: '2026-10-28T11:00:00Z' },
    { retrievedAt: '2026-02-30T09:00:00Z' },
    { collector: '' },
    { sha256: 'bad' },
    { url: 'javascript:alert(1)' },
    { confirmSource: undefined },
    { sourceUpdatedDate: '2026-10-29' },
  ])
    assert.throws(() => parsePricingEdit({ ...source, ...changes }, now));
  assert.throws(() => utcTimestamp('2026-10-28T09:00:00+06:00'));
});
