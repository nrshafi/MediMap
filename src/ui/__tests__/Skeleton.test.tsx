import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { Skeleton } from '../Skeleton';

test('Skeleton renders block variant with shimmer animation', () => {
  const markup = renderToStaticMarkup(<Skeleton variant="block" className="h-32 w-full" />);
  assert.match(markup, /role="status"/);
  assert.match(markup, /aria-label="Loading\.\.\."/);
  assert.match(markup, /animate-shimmer/);
  assert.match(markup, /bg-surface-sunken/);
  assert.match(markup, /motion-reduce:before:animate-none/);
});

test('Skeleton renders text lines variant with specified number of rows', () => {
  const markup = renderToStaticMarkup(<Skeleton variant="text" lines={3} />);
  assert.match(markup, /role="status"/);
  assert.match(markup, /aria-label="Loading\.\.\."/);
  assert.match(markup, /animate-shimmer/);
  assert.match(markup, /w-3\/4/);

  // Should have 3 line items
  const matches = markup.match(/h-4/g);
  assert.equal(matches?.length, 3);
});
