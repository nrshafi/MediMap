import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBdt,
  formatKm,
  formatMeters,
  formatReviewDate,
  priceStatus,
  directionsUrl,
} from './format';

test('formatReviewDate formats ISO dates in Asia/Dhaka time zone', () => {
  // 18:14 UTC on 19 Nov is 00:14 on 20 Nov in Asia/Dhaka (+06:00)
  assert.equal(formatReviewDate('2026-11-19T18:14:00.000Z'), '20 Nov 2026');
  // 12:00 UTC on 19 Nov is 18:00 on 19 Nov in Asia/Dhaka (+06:00)
  assert.equal(formatReviewDate('2026-11-19T12:00:00.000Z'), '19 Nov 2026');
  // Also accepts timestamps as number
  assert.equal(formatReviewDate(Date.parse('2026-11-19T12:00:00.000Z')), '19 Nov 2026');
});

test('formatReviewDate handles null, undefined, and invalid values gracefully', () => {
  assert.equal(formatReviewDate(null), 'Unknown');
  assert.equal(formatReviewDate(undefined), 'Unknown');
  assert.equal(formatReviewDate('not-a-date'), 'not-a-date');
});

test('formatBdt formats numbers as standard BDT currency strings', () => {
  assert.equal(formatBdt(400), 'BDT 400.00');
  assert.equal(formatBdt(1250.5), 'BDT 1,250.50');
});

test('priceStatus returns correct label and tone based on price record', () => {
  assert.deepEqual(priceStatus(null), { tone: 'unknown', label: 'Price unknown' });
  assert.deepEqual(
    priceStatus({
      id: 'price-1',
      amountMinor: 40000,
      amountBdt: 400,
      currency: 'BDT',
      status: 'verified',
      verifiedAt: '2026-10-27T11:20:41Z',
      effectiveDate: null,
      verificationMethod: 'official_website_review',
      source: null,
      sourceRow: 1,
    }),
    { tone: 'verified', label: 'Verified' },
  );
  assert.deepEqual(
    priceStatus({
      id: 'price-2',
      amountMinor: 40000,
      amountBdt: 400,
      currency: 'BDT',
      status: 'disputed',
      verifiedAt: '2026-10-27T11:20:41Z',
      effectiveDate: null,
      verificationMethod: 'official_website_review',
      source: null,
      sourceRow: 1,
    }),
    { tone: 'disputed', label: 'Disputed, under review' },
  );
});

test('formatKm and formatMeters format distance values', () => {
  assert.equal(formatKm(3.456), '3.5 km');
  assert.equal(formatMeters(450), '450 m');
  assert.equal(formatMeters(1250), '1.3 km');
});

test('directionsUrl builds Google Maps directions links', () => {
  assert.equal(
    directionsUrl({ coordinates: { latitude: 23.75, longitude: 90.4 }, address: 'Dhaka' }),
    'https://www.google.com/maps/dir/?api=1&destination=23.75%2C90.4',
  );
  assert.equal(
    directionsUrl({ coordinates: null, address: 'Moghbazar, Dhaka' }),
    'https://www.google.com/maps/dir/?api=1&destination=Moghbazar%2C%20Dhaka',
  );
});
