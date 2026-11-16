import { test } from 'node:test';
import assert from 'node:assert/strict';
import { providerJson } from './provider.server';
test('mapping responses reject failed, malformed and oversized provider bodies', async () => {
  assert.deepEqual(await providerJson(new Response('{"ok":true}')), { ok: true });
  await assert.rejects(providerJson(new Response('bad', { status: 503 })));
  await assert.rejects(providerJson(new Response('{bad}')));
  await assert.rejects(providerJson(new Response('x'.repeat(65537))));
});
