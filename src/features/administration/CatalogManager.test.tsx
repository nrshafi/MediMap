import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { CatalogManager } from './CatalogManager';

test('denied catalog management never renders write forms', () => {
  for (const code of ['forbidden', 'unauthenticated', 'expired', 'unavailable'] as const) {
    const markup = renderToStaticMarkup(
      <CatalogManager result={{ ok: false, code, message: 'Access unavailable.' }} />,
    );
    assert.match(markup, /role="alert"/);
    assert.doesNotMatch(markup, /<form|Create service|Create category/);
  }
});
test('catalog management ignores inherited feedback codes', () => {
  const markup = renderToStaticMarkup(
    <CatalogManager
      code="__proto__"
      result={{
        ok: true,
        data: {
          categories: { items: [], nextCursor: null },
          services: { items: [], nextCursor: null },
          category: null,
          service: null,
          aliases: { items: [], nextCursor: null },
        },
      }}
    />,
  );
  assert.match(markup, /No categories on this page/);
  assert.doesNotMatch(markup, /role="alert"|__proto__/);
});
