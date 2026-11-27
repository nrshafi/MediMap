import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccountManager } from './AccountManager';
import type { AccountRow } from './server/accounts.server';

const base: AccountRow = {
  id: 'a1',
  email: 'user@example.test',
  methods: ['Email and password'],
  isAdministrator: false,
  active: true,
  createdAt: Date.UTC(2026, 10, 20),
  lastSignedInAt: Date.UTC(2026, 10, 21),
};

function render(accounts: AccountRow[], search = {}, next: string | null = null) {
  return renderToStaticMarkup(
    <AccountManager result={{ accounts, next, currentAccountId: 'me' }} search={search} />,
  );
}

test('an active account offers a confirmed disable form with a reason', () => {
  const markup = render([base]);
  assert.match(markup, /action="\/admin\/accounts\/write"/);
  assert.match(markup, /name="action" value="disable"/);
  assert.match(markup, /<input[^>]*required[^>]*name="confirm"/);
  assert.match(markup, /<textarea[^>]*name="reason"[^>]*required/);
  assert.match(markup, /Disable account/);
  assert.match(markup, /Email and password/);
  assert.match(markup, /Active/);
});

test('a disabled account offers the enable form', () => {
  const markup = render([{ ...base, active: false }]);
  assert.match(markup, /name="action" value="enable"/);
  assert.match(markup, /Disabled/);
  assert.doesNotMatch(markup, /value="disable"/);
});

test('the own account has no disable form', () => {
  const markup = render([{ ...base, id: 'me', isAdministrator: true }]);
  assert.doesNotMatch(markup, /<form[^>]*action="\/admin\/accounts\/write"/);
  assert.match(markup, /You cannot disable it/);
  assert.match(markup, /Administrator/);
});

test('the page shows a result notice, keeps the search and links to more accounts', () => {
  const markup = render([base], { query: 'user', result: 'own_account' }, '123.a1');
  assert.match(markup, /You cannot disable your own account/);
  assert.match(markup, /value="user"/);
  assert.match(markup, /href="\/admin\/accounts\?query=user&amp;after=123\.a1"/);
  assert.doesNotMatch(render([base], { result: 'unknown-code' }), /role="status"/);
});

test('the list never renders a hash or a token', () => {
  const markup = render([base]);
  assert.doesNotMatch(markup, /pbkdf2|token|password_hash/i);
});

test('an empty list says that no account matches', () => {
  assert.match(render([], { query: 'zzz' }), /No accounts match/);
});
