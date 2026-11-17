import { test } from 'node:test';
import assert from 'node:assert/strict';
import { providerJson, reserveMappingRequest } from './provider.server';
test('mapping responses reject failed, malformed and oversized provider bodies', async () => {
  assert.deepEqual(await providerJson(new Response('{"ok":true}')), { ok: true });
  await assert.rejects(providerJson(new Response('bad', { status: 503 })));
  await assert.rejects(providerJson(new Response('{bad}')));
  await assert.rejects(providerJson(new Response('x'.repeat(65537))));
});

type Bucket = { limit: number; key: 'day' | 'second' };
function fakeDb(counts: { day: number; second: number }) {
  return {
    prepare: (sql: string) => {
      if (sql.startsWith('DELETE')) return { bind: () => ({ run: async () => ({}) }) };
      const day = sql.includes('requests<600');
      return { bind: (): Bucket => ({ limit: day ? 600 : 2, key: day ? 'day' : 'second' }) };
    },
    batch: async (items: Bucket[]) =>
      items.map((item) => ({ results: counts[item.key] < item.limit ? [{ requests: 1 }] : [] })),
  } as unknown as D1Database;
}
test('mapping budget refuses requests when the daily or per-second ceiling is exhausted', async () => {
  assert.equal(await reserveMappingRequest(fakeDb({ day: 0, second: 0 })), true);
  assert.equal(await reserveMappingRequest(fakeDb({ day: 600, second: 0 })), false);
  assert.equal(await reserveMappingRequest(fakeDb({ day: 0, second: 2 })), false);
});
