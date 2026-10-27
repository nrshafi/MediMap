import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccountView } from './AccountView';

test('sign-in page remains usable for unknown or inherited reason names', () => {
  for (const reason of ['__proto__', 'constructor', '<script>alert(1)</script>']) {
    const markup = renderToStaticMarkup(
      <AccountView
        result={{ ok: true, session: { status: 'anonymous' }, signInAvailable: true }}
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
