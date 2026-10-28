import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProviderManager } from './ProviderManager';

test('denied provider administration does not render write forms', () => {
  for (const code of ['unauthenticated', 'forbidden', 'expired', 'unavailable'] as const) {
    const markup = renderToStaticMarkup(
      <ProviderManager search={{}} result={{ ok: false, code, message: 'Access unavailable.' }} />,
    );
    assert.match(markup, /role="alert"/);
    assert.doesNotMatch(markup, /<form|Create branch|Create provider/);
  }
});
