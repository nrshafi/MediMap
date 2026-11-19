import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { Card } from '../Card';

test('Card renders default variant with decorative border', () => {
  const markup = renderToStaticMarkup(<Card>Content</Card>);
  assert.match(markup, /border-border/);
  assert.match(markup, /bg-surface/);
  assert.match(markup, /rounded-md/);
  assert.match(markup, /Content/);
  assert.doesNotMatch(markup, /shadow-card/);
});

test('Card renders raised variant with shadow-card and lifts on hover only when interactive', () => {
  const nonInteractive = renderToStaticMarkup(<Card variant="raised">Static</Card>);
  assert.match(nonInteractive, /shadow-card/);
  assert.doesNotMatch(nonInteractive, /hover:shadow-lift/);

  const interactive = renderToStaticMarkup(
    <Card variant="raised" interactive={true}>
      Clickable
    </Card>,
  );
  assert.match(interactive, /shadow-card/);
  assert.match(interactive, /hover:shadow-lift/);
  assert.match(interactive, /hover:border-border-strong/);
  assert.match(interactive, /cursor-pointer/);
});

test('Card renders sunken variant with bg-surface-sunken', () => {
  const markup = renderToStaticMarkup(<Card variant="sunken">Sunken Tile</Card>);
  assert.match(markup, /bg-surface-sunken/);
  assert.match(markup, /rounded-md/);
  assert.doesNotMatch(markup, /shadow-card/);
});

test('Card renders custom semantic element through as prop', () => {
  const article = renderToStaticMarkup(<Card as="article">Article Card</Card>);
  assert.match(article, /^<article/);

  const section = renderToStaticMarkup(<Card as="section">Section Card</Card>);
  assert.match(section, /^<section/);

  const link = renderToStaticMarkup(
    <Card as="a" href="/find?service=cbc" aria-label="Find CBC">
      Link Card
    </Card>,
  );
  assert.match(link, /^<a\s/);
  assert.match(link, /href="\/find\?service=cbc"/);
  assert.match(link, /aria-label="Find CBC"/);
});
