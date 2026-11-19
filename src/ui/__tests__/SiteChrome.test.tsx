import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { SiteHeader, SiteFooter } from '../SiteChrome';

test('SiteHeader renders brand link with MediMap accessible name', () => {
  const html = renderToStaticMarkup(<SiteHeader />);
  assert.match(html, /href="\/"[^>]*>[\s\S]*?MediMap/);
  assert.match(html, /aria-label="Site"/);
});

test('SiteHeader renders desktop main navigation links', () => {
  const html = renderToStaticMarkup(<SiteHeader />);
  assert.match(html, /href="\/find"[^>]*>[\s\S]*?Find services/);
  assert.match(html, /href="\/compare"[^>]*>[\s\S]*?Compare/);
  assert.match(html, /href="\/account"[^>]*>[\s\S]*?Account/);
});

test('SiteHeader marks the current page with aria-current="page"', () => {
  const findHtml = renderToStaticMarkup(<SiteHeader currentPath="/find" />);
  assert.match(findHtml, /href="\/find"[^>]*aria-current="page"/);

  const compareHtml = renderToStaticMarkup(<SiteHeader currentPath="/compare" />);
  assert.match(compareHtml, /href="\/compare"[^>]*aria-current="page"/);

  const accountHtml = renderToStaticMarkup(<SiteHeader currentPath="/account" />);
  assert.match(accountHtml, /href="\/account"[^>]*aria-current="page"/);
});

test('SiteHeader renders mobile navigation toggle button', () => {
  const html = renderToStaticMarkup(<SiteHeader />);
  assert.match(html, /aria-label="Open navigation menu"/);
  assert.match(html, /aria-controls="mobile-navigation-panel"/);
  assert.match(html, /aria-expanded="false"/);
});

test('SiteFooter renders emergency statement and Google legal links', () => {
  const html = renderToStaticMarkup(<SiteFooter />);
  assert.match(html, /MediMap is not for emergencies and does not give medical advice\./);
  assert.match(html, /href="https:\/\/maps\.google\.com\/help\/terms_maps\/"/);
  assert.match(html, /Google Maps End User Additional Terms/);
  assert.match(html, /href="https:\/\/policies\.google\.com\/privacy"/);
  assert.match(html, /Google Privacy Policy/);
});
