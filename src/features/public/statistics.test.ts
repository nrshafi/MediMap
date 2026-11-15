import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areaStatistics } from './statistics';
import type { BranchService } from '../catalog/contracts';
const center = { latitude: 23.8, longitude: 90.4 };
function listing(id: string, amount: number): BranchService {
  return {
    id,
    providerServiceName: 'Test',
    service: { id: 'cbc', name: 'CBC', category: { id: 'hematology', name: 'Hematology' } },
    branch: {
      id,
      provider: { id: 'one-provider', name: 'Provider', phone: null, website: null },
      name: id,
      address: 'Test address',
      phone: null,
      alternativePhone: null,
      website: null,
      openingHours: null,
      coordinates: center,
      contactSource: null,
    },
    price: {
      id: `price-${id}`,
      amountMinor: amount,
      amountBdt: amount / 100,
      currency: 'BDT',
      status: 'verified',
      verifiedAt: '2000-01-01T00:00:00Z',
      effectiveDate: null,
      verificationMethod: 'official_website_review',
      sourceRow: 1,
      source: {
        id: 'source',
        kind: 'official_tariff',
        url: 'https://example.test/tariff',
        retrievedAt: '2000-01-01T00:00:00Z',
        sourceUpdatedDate: null,
      },
    },
  };
}
test('area statistics require three unique branches and preserve old verified prices', () => {
  const rows = [listing('a', 10001), listing('b', 20002), listing('c', 30003), listing('d', 40004)];
  for (let n = 0; n < 3; n++)
    assert.equal(areaStatistics(rows.slice(0, n), center, 3).median, null);
  const odd = areaStatistics(rows.slice(0, 3), center, 3);
  assert.equal(odd.mean, 200.02);
  assert.equal(odd.median, 200.02);
  assert.equal(odd.providers, 1);
  assert.equal(areaStatistics(rows, center, 3).median, 250.025);
  assert.equal(areaStatistics([...rows, rows[0]], center, 3).count, 4);
  assert.equal(
    areaStatistics(
      rows.map((row) => ({ ...row, price: null })),
      center,
      3,
    ).count,
    0,
  );
  assert.equal(
    areaStatistics(
      rows.map((row) => ({ ...row, branch: { ...row.branch, coordinates: null } })),
      center,
      3,
    ).count,
    0,
  );
  assert.equal(
    areaStatistics(
      rows.map((row) => ({
        ...row,
        price: row.price ? { ...row.price, status: 'disputed' } : null,
      })),
      center,
      3,
    ).count,
    0,
  );
});
