import { test } from 'node:test';
import assert from 'node:assert/strict';
import { autocompletePlaces, fetchPlace, isPlaceId, isSessionToken } from './places.server';
import type { FetchImpl } from './routes.server';

const token = '123e4567-e89b-42d3-a456-426614174000';
const ok =
  (body: unknown): FetchImpl =>
  async () =>
    new Response(JSON.stringify(body));
const prediction = (placeId: string, text: unknown) => ({
  placePrediction: { placeId, text: { text } },
});

test('session token and place id validation', () => {
  assert.ok(isSessionToken(token));
  for (const bad of ['', 'abc', token.replace('-42d3-', '-12d3-'), `${token}x`, 5, null])
    assert.ok(!isSessionToken(bad), String(bad));
  assert.ok(isPlaceId('ChIJ-abc_123'));
  for (const bad of ['', 'a/b', 'a?b', '../x', 'a b', 'x'.repeat(513), 5, undefined])
    assert.ok(!isPlaceId(bad), String(bad));
});

test('autocomplete sends a restricted request and caps results', async () => {
  let seen: { url: string; init: RequestInit } | undefined;
  const suggestions: unknown[] = Array.from({ length: 8 }, (_, i) =>
    prediction(`id${i}`, i === 0 ? 'x'.repeat(400) : `Place ${i}`),
  );
  suggestions.splice(1, 0, { queryPrediction: {} });
  const result = await autocompletePlaces(
    'k1',
    { query: '  Gulshan ', sessionToken: token },
    async (url, init) => {
      seen = { url, init };
      return new Response(JSON.stringify({ suggestions }));
    },
  );
  assert.equal(result.length, 5);
  assert.equal(result[0]?.label.length, 300);
  assert.equal(seen?.url, 'https://places.googleapis.com/v1/places:autocomplete');
  const headers = seen?.init.headers as Record<string, string>;
  assert.equal(headers['X-Goog-Api-Key'], 'k1');
  assert.equal(
    headers['X-Goog-FieldMask'],
    'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text',
  );
  const body = JSON.parse(String(seen?.init.body));
  assert.equal(body.input, 'Gulshan');
  assert.equal(body.sessionToken, token);
  assert.deepEqual(body.includedRegionCodes, ['bd']);
  assert.deepEqual(body.locationRestriction.rectangle, {
    low: { latitude: 23.6, longitude: 90.2 },
    high: { latitude: 24, longitude: 90.6 },
  });
});

test('autocomplete handles empty results and rejects failures', async () => {
  const run = (f: FetchImpl, key = 'k', query = 'Gulshan', sessionToken = token) =>
    autocompletePlaces(key, { query, sessionToken }, f);
  assert.deepEqual(await run(ok({})), []);
  await assert.rejects(run(ok({}), ''));
  await assert.rejects(run(ok({}), 'k', 'ab'));
  await assert.rejects(run(ok({}), 'k', 'x'.repeat(161)));
  await assert.rejects(run(ok({}), 'k', 'Gulshan', 'not-a-uuid'));
  await assert.rejects(run(async () => new Response('no', { status: 500 })));
  await assert.rejects(run(async () => new Response('x'.repeat(65537))));
  await assert.rejects(
    run(async () => {
      throw new DOMException('timeout', 'TimeoutError');
    }),
  );
  await assert.rejects(run(ok({ suggestions: 'bad' })));
  await assert.rejects(run(ok({ suggestions: [prediction('a/b', 'x')] })));
  await assert.rejects(run(ok({ suggestions: [{ placePrediction: { placeId: 'ok' } }] })));
  await assert.rejects(run(ok({ suggestions: [prediction('ok', 5)] })));
});

test('place details builds a safe URL and returns the place', async () => {
  let seen: { url: string; init: RequestInit } | undefined;
  const place = await fetchPlace(
    'k1',
    { placeId: 'ChIJ_a-1', sessionToken: token },
    async (url, init) => {
      seen = { url, init };
      return new Response(
        JSON.stringify({
          location: { latitude: 23.78, longitude: 90.4 },
          formattedAddress: 'Gulshan',
        }),
      );
    },
  );
  assert.deepEqual(place, { label: 'Gulshan', latitude: 23.78, longitude: 90.4 });
  assert.equal(seen?.url, `https://places.googleapis.com/v1/places/ChIJ_a-1?sessionToken=${token}`);
  assert.ok(!seen?.url.includes('k1'));
  const headers = seen?.init.headers as Record<string, string>;
  assert.equal(headers['X-Goog-Api-Key'], 'k1');
  assert.equal(headers['X-Goog-FieldMask'], 'location,formattedAddress');
});

test('place details rejects bad input, failures, malformed fields and outside coordinates', async () => {
  const run = (f: FetchImpl, key = 'k', placeId = 'abc', sessionToken = token) =>
    fetchPlace(key, { placeId, sessionToken }, f);
  const good = { location: { latitude: 23.78, longitude: 90.4 }, formattedAddress: 'A' };
  await run(ok(good));
  await assert.rejects(run(ok(good), ''));
  await assert.rejects(run(ok(good), 'k', '../evil'));
  await assert.rejects(run(ok(good), 'k', 'abc', 'bad'));
  await assert.rejects(run(async () => new Response('no', { status: 404 })));
  await assert.rejects(run(async () => new Response('x'.repeat(65537))));
  await assert.rejects(
    run(async () => {
      throw new DOMException('aborted', 'AbortError');
    }),
  );
  const bad = [
    {},
    null,
    { ...good, formattedAddress: 5 },
    { ...good, formattedAddress: ' ' },
    { ...good, location: null },
    { ...good, location: { latitude: '23.7', longitude: 90.4 } },
    { ...good, location: { latitude: 23.5, longitude: 90.4 } },
    { ...good, location: { latitude: 24.1, longitude: 90.4 } },
    { ...good, location: { latitude: 23.78, longitude: 90.1 } },
    { ...good, location: { latitude: 23.78, longitude: 90.7 } },
    { ...good, location: { latitude: 23.78, longitude: null } },
  ];
  for (const body of bad) await assert.rejects(run(ok(body)), JSON.stringify(body));
});
