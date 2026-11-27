import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BranchService } from '../catalog/contracts';
import {
  applyListingFilters,
  parsePriceFilter,
  parsePriceRange,
  parseRatingFilter,
} from './filters';

function makeListing(id: string, amountMinor: number | null): BranchService {
  return {
    id,
    providerServiceName: 'CBC',
    service: {
      id: 'cbc',
      name: 'Complete Blood Count',
      category: { id: 'hem', name: 'Hematology' },
    },
    branch: {
      id: `branch-${id}`,
      name: id,
      provider: { id: 'provider-1', name: 'Provider', phone: null, website: null },
      address: 'Dhaka',
      phone: null,
      alternativePhone: null,
      website: null,
      openingHours: null,
      coordinates: { latitude: 23.75, longitude: 90.4 },
      contactSource: null,
    },
    price:
      amountMinor === null
        ? null
        : {
            id: `price-${id}`,
            amountMinor,
            amountBdt: amountMinor / 100,
            currency: 'BDT',
            status: 'verified',
            verifiedAt: '2026-10-27T11:20:41Z',
            effectiveDate: null,
            verificationMethod: 'official_website_review',
            source: null,
            sourceRow: 1,
          },
  };
}

test('URL validation helpers reject invalid price and rating values', () => {
  for (const invalid of ['', ' ', '-1', 'abc', '2000000', '12.5', undefined, null]) {
    assert.equal(parsePriceFilter(invalid), undefined);
  }
  assert.equal(parsePriceFilter('0'), 0);
  assert.equal(parsePriceFilter('1500'), 1500);
  assert.equal(parsePriceFilter('1000000'), 1000000);

  assert.deepEqual(parsePriceRange('500', '400'), {});
  assert.deepEqual(parsePriceRange('400', '1500'), { minPrice: 400, maxPrice: 1500 });
  assert.deepEqual(parsePriceRange('400', ''), { minPrice: 400 });

  for (const invalid of ['', '0', '5', '-1', 'abc', '3.5', undefined, null]) {
    assert.equal(parseRatingFilter(invalid), undefined);
  }
  assert.equal(parseRatingFilter('1'), 1);
  assert.equal(parseRatingFilter('4'), 4);
});

test('applyListingFilters converts BDT to paisa, includes range ends, and counts unknown values', () => {
  const rows = [
    makeListing('low', 40000),
    makeListing('mid', 150000),
    makeListing('high', 300000),
    makeListing('unknown-price', null),
  ];
  const ratings: Record<string, number | null> = {
    low: 4.5,
    mid: 3.0,
    high: null,
    'unknown-price': null,
  };

  // No active filter returns all listings
  assert.deepEqual(applyListingFilters(rows, ratings, {}), {
    visible: rows,
    hiddenUnknownPrice: 0,
    hiddenNoRating: 0,
  });

  // Inclusive endpoints and BDT-to-paisa conversion (1500 BDT = 150000 paisa)
  const ranged = applyListingFilters(rows, ratings, { minPrice: 400, maxPrice: 1500 });
  assert.deepEqual(
    ranged.visible.map((r) => r.id),
    ['low', 'mid'],
  );
  assert.equal(ranged.hiddenUnknownPrice, 1);
  assert.equal(ranged.hiddenNoRating, 0);

  // minPrice only
  assert.deepEqual(
    applyListingFilters(rows, ratings, { minPrice: 1500 }).visible.map((r) => r.id),
    ['mid', 'high'],
  );

  // maxPrice only
  assert.deepEqual(
    applyListingFilters(rows, ratings, { maxPrice: 400 }).visible.map((r) => r.id),
    ['low'],
  );

  // Rating filter only
  const rated = applyListingFilters(rows, ratings, { minRating: 4 });
  assert.deepEqual(
    rated.visible.map((r) => r.id),
    ['low'],
  );
  assert.equal(rated.hiddenUnknownPrice, 0);
  assert.equal(rated.hiddenNoRating, 2);

  // Both filters active: unknown-price with no rating counts once under price
  const both = applyListingFilters(rows, ratings, { maxPrice: 3000, minRating: 3 });
  assert.deepEqual(
    both.visible.map((r) => r.id),
    ['low', 'mid'],
  );
  assert.equal(both.hiddenUnknownPrice, 1);
  assert.equal(both.hiddenNoRating, 1);
});
