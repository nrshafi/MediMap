import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { ratingDimensions } from './contracts';
import { RatingChart } from './RatingChart';

test('RatingChart renders six bars, exact text values, widths, and a visually hidden table', () => {
  const scores = [4.2, 3.5, 2.0, 5.0, 4.0, 1.5];
  const html = renderToStaticMarkup(<RatingChart dimensions={scores} count={3} />);

  assert.match(html, /Based on 3 reviews/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /<table class="sr-only">/);
  assert.match(
    html,
    /<caption>Rating averages across six dimensions \(Based on 3 reviews\)<\/caption>/,
  );

  for (let i = 0; i < ratingDimensions.length; i++) {
    const name = ratingDimensions[i]!;
    const value = scores[i]!.toFixed(1);
    const width = `${((scores[i]! / 5) * 100).toFixed(1)}%`;
    assert.ok(html.includes(name), `Missing dimension name: ${name}`);
    assert.ok(html.includes(`>${value}<`), `Missing formatted value: ${value}`);
    assert.ok(html.includes(`width:${width}`), `Missing bar width: ${width}`);
  }
});

test('RatingChart supports singular count, compact mode, showCount=false, and empty state', () => {
  const scores = [4, 4, 4, 4, 4, 4];
  const singular = renderToStaticMarkup(<RatingChart dimensions={scores} count={1} compact />);
  assert.match(singular, /Based on 1 review</);
  assert.match(singular, /h-1\.5/);

  const noCount = renderToStaticMarkup(
    <RatingChart dimensions={scores} count={2} showCount={false} />,
  );
  assert.doesNotMatch(noCount, /<p[^>]*>Based on 2 reviews<\/p>/);

  assert.equal(renderToStaticMarkup(<RatingChart dimensions={scores} count={0} />), '');
});
