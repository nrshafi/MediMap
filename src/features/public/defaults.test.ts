import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CENTER,
  DEFAULT_RADIUS_KM,
  RADIUS_PRESETS,
  parseBoundedNumber,
  parseCoordinate,
  parseRadius,
} from './defaults';

test('default center, radius, and presets match the Dhaka discovery defaults', () => {
  assert.deepEqual(DEFAULT_CENTER, { latitude: 23.8103, longitude: 90.4125 });
  assert.equal(DEFAULT_RADIUS_KM, 10);
  assert.deepEqual([...RADIUS_PRESETS], [1, 3, 5, 10]);
});

test('parseCoordinate rejects empty, blank, non-finite, and out-of-range values', () => {
  assert.equal(parseCoordinate('', 90, DEFAULT_CENTER.latitude), DEFAULT_CENTER.latitude);
  assert.equal(parseCoordinate(' ', 90, DEFAULT_CENTER.latitude), DEFAULT_CENTER.latitude);
  assert.equal(parseCoordinate('abc', 90, DEFAULT_CENTER.latitude), DEFAULT_CENTER.latitude);
  assert.equal(parseCoordinate('91', 90, DEFAULT_CENTER.latitude), DEFAULT_CENTER.latitude);
  assert.equal(parseCoordinate('-91', 90, DEFAULT_CENTER.latitude), DEFAULT_CENTER.latitude);
  assert.equal(parseCoordinate(undefined, 90, DEFAULT_CENTER.latitude), DEFAULT_CENTER.latitude);
  assert.equal(parseCoordinate(null, 90, DEFAULT_CENTER.latitude), DEFAULT_CENTER.latitude);
  assert.equal(parseCoordinate('23.75', 90, DEFAULT_CENTER.latitude), 23.75);
  assert.equal(parseCoordinate(23.75, 90, DEFAULT_CENTER.latitude), 23.75);
});

test('parseRadius and parseBoundedNumber handle boundaries and blanks', () => {
  assert.equal(parseRadius(''), DEFAULT_RADIUS_KM);
  assert.equal(parseRadius(' '), DEFAULT_RADIUS_KM);
  assert.equal(parseRadius('0'), DEFAULT_RADIUS_KM);
  assert.equal(parseRadius('101'), DEFAULT_RADIUS_KM);
  assert.equal(parseRadius('7.5'), 7.5);
  assert.equal(parseBoundedNumber('0', 0, 100), 0);
  assert.equal(parseBoundedNumber('', 0, 100), undefined);
});
