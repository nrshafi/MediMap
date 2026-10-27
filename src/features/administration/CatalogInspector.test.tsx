import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { CatalogInspector } from './CatalogInspector';
import { AdminLayout } from './AdminLayout';

test('catalog failure stays explicit without records or sample prices', () => {
  const markup = renderToStaticMarkup(
    <CatalogInspector
      result={{ ok: false, code: 'unavailable', message: 'The catalog is unavailable. Try again.' }}
      serviceId=""
    />,
  );
  assert.match(markup, /role="alert"/);
  assert.match(markup, /Catalog unavailable/);
  assert.match(markup, /Reload catalog/);
  assert.doesNotMatch(markup, /<article|400|Sample price/);
});

test('administration layout accepts separate navigation extensions', () => {
  const markup = renderToStaticMarkup(
    <AdminLayout
      activeHref="/admin/reviews"
      navigation={[{ href: '/admin/reviews', label: 'Review moderation' }]}
    >
      <h1>Review moderation</h1>
    </AdminLayout>,
  );
  assert.match(markup, /href="\/admin\/catalog"/);
  assert.match(markup, /href="\/admin\/reviews" aria-current="page"/);
  assert.doesNotMatch(markup, /href="\/admin\/catalog" aria-current/);
});
