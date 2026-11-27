import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { SignUpView } from './SignUpView';
import { passwordRuleSummary } from './passwordRules';

test('sign-up page shows the password rules before the user types', () => {
  const markup = renderToStaticMarkup(<SignUpView />);
  for (const rule of passwordRuleSummary) assert.ok(markup.includes(rule), rule);
  assert.match(markup, /action="\/auth\/password\/sign-up"/);
  assert.match(markup, /autoComplete="new-password"|autocomplete="new-password"/i);
  assert.match(markup, /href="\/sign-in"/);
});

test('sign-up page shows a server error next to its field and ignores unknown codes', () => {
  const duplicate = renderToStaticMarkup(<SignUpView error="email_in_use" returnTo="/reviews" />);
  assert.match(duplicate, /This email already has an account\./);
  assert.match(duplicate, /aria-describedby="sign-up-email-error"/);
  assert.match(duplicate, /name="returnTo" value="\/reviews"/);
  const unknown = renderToStaticMarkup(<SignUpView error="__proto__" returnTo="//evil.test" />);
  assert.doesNotMatch(unknown, /role="alert"/);
  assert.match(unknown, /name="returnTo" value="\/account"/);
});
