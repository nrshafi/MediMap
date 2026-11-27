import { test } from 'node:test';
import assert from 'node:assert/strict';
import { passwordIterations, verifyPassword } from './password.server';
import { dummyPasswordHash, methodNotAllowed } from './passwordHttp.server';

test('the dummy hash is well formed and uses the current iteration count', async () => {
  assert.ok(dummyPasswordHash.startsWith(`pbkdf2-sha256$${passwordIterations}$`));
  // Well formed means verification runs the full derivation. It must not take the malformed shortcut.
  const started = performance.now();
  assert.equal(await verifyPassword('not the password', dummyPasswordHash), false);
  assert.ok(performance.now() - started > 1);
});

test('GET answers 405 with an Allow header and no caching', () => {
  const response = methodNotAllowed('Use POST to sign in.');
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Allow'), 'POST');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});
