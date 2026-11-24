import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAILY_MAPPING_LIMIT,
  PER_SECOND_MAPPING_LIMIT,
  providerJson,
  reserveMappingRequest,
} from './provider.server';

test('mapping responses reject failed, malformed and oversized provider bodies', async () => {
  assert.deepEqual(await providerJson(new Response('{"ok":true}')), { ok: true });
  await assert.rejects(providerJson(new Response('bad', { status: 503 })));
  await assert.rejects(providerJson(new Response('{bad}')));
  await assert.rejects(providerJson(new Response('x'.repeat(65537))));
});

function fakeDb(counts: { day: number; second: number }) {
  const touched: string[] = [];
  const prepare = ((sql: string) => {
    if (sql.startsWith('DELETE')) return { bind: () => ({ run: async () => ({}) }) };
    return {
      bind: (bucket: string, _expires: number, limit: number) => ({
        all: async () => {
          const key = bucket.startsWith('day:') ? 'day' : 'second';
          touched.push(key);
          if (counts[key] < limit) {
            counts[key] += 1;
            return { results: [{ requests: counts[key] }] };
          }
          return { results: [] };
        },
      }),
    };
  }) as D1Database['prepare'];
  return { db: { prepare }, touched };
}

test('mapping budget allows four requests per second and preserves daily quota when per-second refuses', async () => {
  assert.equal(DAILY_MAPPING_LIMIT, 600);
  assert.equal(PER_SECOND_MAPPING_LIMIT, 4);

  const ok = fakeDb({ day: 0, second: 3 });
  assert.equal(await reserveMappingRequest(ok.db), true);
  assert.deepEqual(ok.touched, ['second', 'day']);

  const secondFull = fakeDb({ day: 10, second: 4 });
  assert.equal(await reserveMappingRequest(secondFull.db), false);
  assert.deepEqual(secondFull.touched, ['second']);

  const dayFull = fakeDb({ day: 600, second: 0 });
  assert.equal(await reserveMappingRequest(dayFull.db), false);
  assert.deepEqual(dayFull.touched, ['second', 'day']);
});
