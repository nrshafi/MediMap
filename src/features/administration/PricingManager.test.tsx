import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { PricingManager } from './PricingManager';

test('denied pricing administration does not render write forms', () => {
  for (const code of ['unauthenticated', 'forbidden', 'expired', 'unavailable'] as const) {
    const markup = renderToStaticMarkup(
      <PricingManager search={{}} result={{ ok: false, code, message: 'Access unavailable.' }} />,
    );
    assert.match(markup, /role="alert"/);
    assert.doesNotMatch(markup, /<form|Save new price revision|Create source snapshot/);
  }
});
