import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccountView } from './AccountView';

test('sign-in page remains usable for unknown or inherited reason names', () => {
  for (const reason of ['__proto__', 'constructor', '<script>alert(1)</script>']) {
    const markup = renderToStaticMarkup(
      <AccountView
        result={{
          ok: true,
          session: { status: 'anonymous' },
          signInAvailable: true,
          method: 'google',
        }}
        reason={reason}
      />,
    );
    assert.match(markup, /Sign in with Google/);
    assert.doesNotMatch(markup, /alert\(1\)|\[object Object\]/);
  }
});

test('database failure keeps sign-in disabled and displays a fixed public message', () => {
  const markup = renderToStaticMarkup(
    <AccountView
      result={{
        ok: false,
        code: 'unavailable',
        message: 'Sign-in is unavailable. Try again later.',
      }}
    />,
  );
  assert.match(markup, /Your account is unavailable/);
  assert.match(markup, /disabled=""/);
  assert.doesNotMatch(markup, /Signed in as|Administrator<\/dd>/);
});

const member = {
  status: 'authenticated',
  user: { id: 'a', email: 'member@example.test', isAdministrator: false },
  expiresAt: Date.now() + 86400_000,
} as const;

test('signed-in password account shows its method and the change-password form', () => {
  const markup = renderToStaticMarkup(
    <AccountView
      result={{ ok: true, session: member, signInAvailable: true, method: 'password' }}
      error="current_incorrect"
    />,
  );
  assert.match(markup, /Email and password/);
  assert.match(markup, /action="\/auth\/password\/change"/);
  assert.match(markup, /autoComplete="current-password"|autocomplete="current-password"/i);
  assert.match(markup, /The current password is incorrect\./);
  assert.match(markup, /aria-describedby="change-current-error"/);
});

test('signed-in Google account shows no change-password form', () => {
  const markup = renderToStaticMarkup(
    <AccountView result={{ ok: true, session: member, signInAvailable: true, method: 'google' }} />,
  );
  assert.doesNotMatch(markup, /auth\/password\/change/);
  assert.match(markup, /<dd[^>]*>Google<\/dd>/);
});

test('sign-in page lists Google first, then the email form with a link to sign-up', () => {
  const markup = renderToStaticMarkup(
    <AccountView
      result={{
        ok: true,
        session: { status: 'anonymous' },
        signInAvailable: false,
        method: 'google',
      }}
      error="credentials"
    />,
  );
  assert.ok(markup.indexOf('/auth/google/start') < markup.indexOf('/auth/password/sign-in'));
  assert.match(markup, /Email or password is incorrect\./);
  assert.match(markup, /href="\/sign-up"/);
  assert.doesNotMatch(markup, /type="password"[^>]*value=/);
});
