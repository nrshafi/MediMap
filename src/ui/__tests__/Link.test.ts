import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isInternalPageRoute } from '../Link';

test('isInternalPageRoute accepts internal pages and rejects external and special targets', () => {
  assert.equal(isInternalPageRoute('/find'), true);
  assert.equal(isInternalPageRoute('/find?service=complete-blood-count'), true);
  assert.equal(isInternalPageRoute('https://example.com/find'), false);
  assert.equal(isInternalPageRoute('http://example.com/find'), false);
  assert.equal(isInternalPageRoute('mailto:patient@example.com'), false);
  assert.equal(isInternalPageRoute('tel:+8801711000000'), false);
  assert.equal(isInternalPageRoute('/auth/google/start'), false);
  assert.equal(isInternalPageRoute('/auth/password/sign-in'), false);
  assert.equal(isInternalPageRoute('/src/routes/find.ts'), false);
  assert.equal(isInternalPageRoute('/src/routes/find.ts?x=1'), false);
});
