import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, passwordIterations, verifyPassword } from './password.server';

test('hash format is versioned with documented parameters', async () => {
  const stored = await hashPassword('correct horse battery');
  const [scheme, iterations, salt, hash] = stored.split('$');
  assert.equal(scheme, 'pbkdf2-sha256');
  assert.equal(Number(iterations), passwordIterations);
  assert.match(salt, /^[A-Za-z0-9_-]{22}$/);
  assert.match(hash, /^[A-Za-z0-9_-]{43}$/);
});

test('verify accepts the right password and rejects a wrong one', async () => {
  const stored = await hashPassword('correct horse battery');
  assert.equal(await verifyPassword('correct horse battery', stored), true);
  assert.equal(await verifyPassword('correct horse batterz', stored), false);
  assert.equal(await verifyPassword('', stored), false);
});

test('two hashes of one password differ and both verify', async () => {
  const first = await hashPassword('same password here');
  const second = await hashPassword('same password here');
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('same password here', first), true);
  assert.equal(await verifyPassword('same password here', second), true);
});

test('Unicode passwords verify across normalization forms', async () => {
  const stored = await hashPassword('pässwörd-\u{1F510}-日本');
  assert.equal(await verifyPassword('pässwörd-\u{1F510}-日本', stored), true);
  assert.equal(await verifyPassword('passwoerd-\u{1F510}-日本', stored), false);
});

test('malformed stored strings return false and never throw', async () => {
  const good = await hashPassword('correct horse battery');
  const [scheme, iterations, salt, hash] = good.split('$');
  const malformed = [
    '',
    'plain',
    'a$b$c',
    `md5$${iterations}$${salt}$${hash}`,
    `${scheme}$abc$${salt}$${hash}`,
    `${scheme}$0$${salt}$${hash}`,
    `${scheme}$99999999999$${salt}$${hash}`,
    `${scheme}$${iterations}$!!!$${hash}`,
    `${scheme}$${iterations}$${salt}$short`,
    `${scheme}$${iterations}$${salt}`,
    `${good}$extra`,
    `${scheme}$${iterations}$${salt}$${hash}=`,
  ];
  for (const value of malformed)
    assert.equal(await verifyPassword('correct horse battery', value), false);
});
