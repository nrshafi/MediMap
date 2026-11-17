import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRoadEstimate, parseDurationSeconds, type FetchImpl } from './routes.server';

const input = {
  from: { latitude: 23.78, longitude: 90.4 },
  to: { latitude: 23.74, longitude: 90.39 },
};
const ok =
  (body: unknown): FetchImpl =>
  async () =>
    new Response(JSON.stringify(body));

test('route request uses the documented method, header key and field mask', async () => {
  let seen: { url: string; init: RequestInit } | undefined;
  const result = await computeRoadEstimate('k1', input, async (url, init) => {
    seen = { url, init };
    return new Response(JSON.stringify({ routes: [{ distanceMeters: 5200, duration: '1336s' }] }));
  });
  assert.deepEqual(result, { roadKm: 5.2, minutes: 1336 / 60 });
  assert.equal(seen?.url, 'https://routes.googleapis.com/directions/v2:computeRoutes');
  assert.ok(!seen?.url.includes('k1'));
  const headers = seen?.init.headers as Record<string, string>;
  assert.equal(headers['X-Goog-Api-Key'], 'k1');
  assert.equal(headers['X-Goog-FieldMask'], 'routes.distanceMeters,routes.duration');
  const body = JSON.parse(String(seen?.init.body));
  assert.equal(body.travelMode, 'DRIVE');
  assert.equal(body.routingPreference, 'TRAFFIC_UNAWARE');
  assert.deepEqual(body.origin.location.latLng, { latitude: 23.78, longitude: 90.4 });
  assert.ok(seen?.init.signal);
});

test('duration parsing is strict', () => {
  assert.equal(parseDurationSeconds('1336s'), 1336);
  assert.equal(parseDurationSeconds('3.5s'), 3.5);
  assert.equal(parseDurationSeconds('0s'), 0);
  for (const bad of ['-5s', 'abc', '12', '1e3s', 'Infinitys', '', ' 5s', 12, null, undefined])
    assert.throws(() => parseDurationSeconds(bad), Error);
});

test('route adapter rejects missing key, bad status and malformed fields', async () => {
  await assert.rejects(computeRoadEstimate('', input, ok({})));
  await assert.rejects(
    computeRoadEstimate('k', input, async () => new Response('no', { status: 403 })),
  );
  const bad = [
    {},
    { routes: [] },
    { routes: [{}] },
    { routes: [{ distanceMeters: -1, duration: '5s' }] },
    { routes: [{ distanceMeters: '5', duration: '5s' }] },
    { routes: [{ distanceMeters: 5, duration: '-5s' }] },
    { routes: [{ distanceMeters: 5 }] },
    { routes: [null] },
    null,
  ];
  for (const body of bad) await assert.rejects(computeRoadEstimate('k', input, ok(body)));
  await assert.rejects(
    computeRoadEstimate('k', { ...input, from: { latitude: NaN, longitude: 90 } }, ok({})),
  );
});

test('route adapter rejects oversized bodies and propagates aborts', async () => {
  await assert.rejects(
    computeRoadEstimate('k', input, async () => new Response('x'.repeat(65537))),
  );
  await assert.rejects(
    computeRoadEstimate('k', input, async () => {
      throw new DOMException('timeout', 'TimeoutError');
    }),
  );
});
