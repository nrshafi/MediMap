import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodePolyline } from './polyline';

test('decodes the documented Google polyline example', () => {
  // Example from Google's Encoded Polyline Algorithm Format page.
  assert.deepEqual(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@'), [
    { latitude: 38.5, longitude: -120.2 },
    { latitude: 40.7, longitude: -120.95 },
    { latitude: 43.252, longitude: -126.453 },
  ]);
});

test('rejects malformed, truncated, single-point and oversized paths', () => {
  for (const bad of ['', ' ', '_p~iF~ps|U_ulL', '_p~iF~ps|U', 'abc\u0000', 12, null, undefined])
    assert.throws(() => decodePolyline(bad), Error);
  assert.throws(() => decodePolyline('?'.repeat(40_001)), Error);
});
