import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeRoadEstimate,
  computeRoadRoute,
  parseDurationSeconds,
  type FetchImpl,
} from './routes.server';

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
  assert.equal(body.languageCode, undefined);
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

const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';

test('route request adds only Essentials path and step fields', async () => {
  let headers: Record<string, string> | undefined;
  let body: Record<string, unknown> | undefined;
  const result = await computeRoadRoute('k1', input, async (_url, init) => {
    headers = init.headers as Record<string, string>;
    body = JSON.parse(String(init.body));
    return new Response(
      JSON.stringify({
        routes: [
          {
            distanceMeters: 5200,
            duration: '1336s',
            polyline: { encodedPolyline: encoded },
            legs: [
              {
                steps: [
                  {
                    distanceMeters: 120,
                    navigationInstruction: { maneuver: 'TURN_LEFT', instructions: ' Turn left ' },
                  },
                  { distanceMeters: 40 },
                  { navigationInstruction: { instructions: 'Arrive' } },
                ],
              },
            ],
          },
        ],
      }),
    );
  });
  assert.equal(
    headers?.['X-Goog-FieldMask'],
    'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.steps.distanceMeters,routes.legs.steps.navigationInstruction',
  );
  assert.equal(body?.routingPreference, 'TRAFFIC_UNAWARE');
  assert.equal(body?.extraComputations, undefined);
  assert.equal(body?.languageCode, 'en');
  assert.equal(result.roadKm, 5.2);
  assert.equal(result.path.length, 3);
  assert.deepEqual(result.steps, [
    { instruction: 'Turn left', maneuver: 'TURN_LEFT', distanceMeters: 120 },
    { instruction: 'Arrive', maneuver: null, distanceMeters: null },
  ]);
});

test('route adapter rejects a missing path and malformed steps', async () => {
  const base = { distanceMeters: 5, duration: '5s', polyline: { encodedPolyline: encoded } };
  const bad = [
    { distanceMeters: 5, duration: '5s' },
    { ...base, polyline: { encodedPolyline: '_p~iF' } },
    { ...base, legs: 'x' },
    { ...base, legs: [{ steps: 'x' }] },
    { ...base, legs: [{ steps: [null] }] },
    { ...base, legs: [{ steps: [{ navigationInstruction: { instructions: 5 } }] }] },
    { ...base, legs: [{ steps: [{ navigationInstruction: { instructions: '' } }] }] },
    {
      ...base,
      legs: [{ steps: [{ navigationInstruction: { instructions: 'x', maneuver: '<b>' } }] }],
    },
    {
      ...base,
      legs: [{ steps: [{ distanceMeters: -1, navigationInstruction: { instructions: 'x' } }] }],
    },
  ];
  for (const route of bad)
    await assert.rejects(computeRoadRoute('k', input, ok({ routes: [route] })));
  const ok200 = await computeRoadRoute('k', input, ok({ routes: [base] }));
  assert.deepEqual(ok200.steps, []);
});
