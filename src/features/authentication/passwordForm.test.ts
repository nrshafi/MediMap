import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emailMaxLength,
  errorField,
  formError,
  normalizeEmail,
  parseEmail,
  passwordFormMessages,
} from './passwordForm';

test('email is trimmed and lower-cased by one function', () => {
  assert.equal(normalizeEmail('  Member@Example.TEST '), 'member@example.test');
  assert.deepEqual(parseEmail('  Member@Example.TEST '), {
    email: 'Member@Example.TEST',
    normalized: 'member@example.test',
  });
  // Code lower-cases non-ASCII letters. SQL lower() does not.
  assert.equal(normalizeEmail('ÉCOLE@Example.test'), 'école@example.test');
});

test('email must have a local part, an @ sign and a domain with a dot', () => {
  for (const bad of [
    '',
    'a@b',
    '@example.test',
    'a@.test',
    'a b@example.test',
    'a@@example.test',
  ]) {
    assert.equal(parseEmail(bad), null, bad);
  }
  assert.equal(parseEmail(null), null);
  assert.equal(parseEmail(42), null);
  assert.equal(parseEmail('a\u0000b@example.test'), null);
});

test('email length is 3 to 320 characters', () => {
  const local = 'a'.repeat(emailMaxLength - '@e.co'.length);
  assert.ok(parseEmail(`${local}@e.co`));
  assert.equal(parseEmail(`${local}a@e.co`), null);
});

test('error codes map to a message and a field, and unknown codes are ignored', () => {
  assert.equal(formError('credentials'), 'credentials');
  assert.equal(formError('__proto__'), null);
  assert.equal(formError('constructor'), null);
  assert.equal(formError(undefined), null);
  assert.equal(errorField('email_in_use'), 'email');
  assert.equal(errorField('common'), 'password');
  assert.equal(errorField('mismatch'), 'confirm');
  assert.equal(errorField('current_incorrect'), 'current');
  assert.equal(errorField('unavailable'), null);
  assert.equal(passwordFormMessages.credentials, 'Email or password is incorrect.');
});
