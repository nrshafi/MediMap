import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPassword, passwordMaxLength, passwordMinLength } from './passwordRules';

const codes = (password: string, email?: string) =>
  checkPassword(password, email).failures.map((failure) => failure.code);

test('length boundaries are 9, 10, 128 and 129 characters', () => {
  assert.deepEqual(codes('x7!kq2m9z'), ['too_short']);
  assert.deepEqual(codes('x7!kq2m9zv'), []);
  assert.deepEqual(codes('aB3$'.repeat(32)), []);
  assert.deepEqual(codes('aB3$'.repeat(32) + 'x'), ['too_long']);
  assert.equal(passwordMinLength, 10);
  assert.equal(passwordMaxLength, 128);
});

test('length counts characters after NFC normalization, not bytes or code units', () => {
  // Nine accented letters in decomposed form. NFC gives nine characters.
  assert.deepEqual(codes('é'.repeat(9)), ['too_short']);
  assert.deepEqual(codes('é'.repeat(10)), []);
  // Emoji use two UTF-16 code units. Ten of them are ten characters.
  assert.deepEqual(codes('\u{1F510}'.repeat(10)), []);
  assert.deepEqual(codes('\u{1F510}'.repeat(9)), ['too_short']);
  assert.deepEqual(codes('ü'.repeat(128)), []);
  assert.deepEqual(codes('ü'.repeat(129)), ['too_long']);
});

test('NFC form is returned and outer spaces are kept', () => {
  const result = checkPassword('  ' + 'é'.repeat(10) + '  ');
  assert.equal(result.normalized, '  ' + 'é'.repeat(10) + '  ');
  assert.equal(result.ok, true);
});

test('common passwords fail in any letter case', () => {
  assert.deepEqual(codes('1234567890'), ['common']);
  assert.deepEqual(codes('QWERTYUIOP'), ['common']);
  assert.deepEqual(codes('Liverpool1'), ['common']);
});

test('email and the part before @ fail', () => {
  assert.deepEqual(codes('Jane.Doe@Example.test', ' jane.doe@example.test '), ['matches_email']);
  assert.deepEqual(codes('janedoe-person', 'janedoe-person@example.test'), ['matches_email']);
  assert.deepEqual(codes('janedoe-person-2', 'janedoe-person@example.test'), []);
  assert.deepEqual(codes('unrelated-pass1', 'x@example.test'), []);
});

test('each failure has a message and weak strength', () => {
  const result = checkPassword('short');
  assert.equal(result.ok, false);
  assert.ok(result.failures[0]?.message?.includes('at least 10'));
  assert.equal(result.strength, 'weak');
});

test('strength hint', () => {
  assert.equal(checkPassword('qazwsxedcr').strength, 'fair');
  assert.equal(checkPassword('abcdefghijklmnopqrstu').strength, 'strong');
  assert.equal(checkPassword('Tr0ub4dor&3x').strength, 'strong');
  assert.equal(checkPassword('maplesyrupab').strength, 'fair');
});
