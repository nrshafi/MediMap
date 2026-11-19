import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { StatTile } from '../StatTile';

test('StatTile renders label and value in dl-item structure', () => {
  const markup = renderToStaticMarkup(
    <StatTile label="Price" value="BDT 400.00" subtext="Standard tariff" />,
  );

  assert.match(markup, /bg-surface-sunken/);
  assert.match(markup, /<dt[^>]*>Price<\/dt>/);
  assert.match(markup, /<dd[^>]*>BDT 400\.00<\/dd>/);
  assert.match(markup, /Standard tariff/);
  assert.match(markup, /tnum/);
});

test('StatTile renders div structure when requested', () => {
  const markup = renderToStaticMarkup(<StatTile as="div" label="Road Distance" value="4.2 km" />);

  assert.match(markup, /<div[^>]*>Road Distance<\/div>/);
  assert.match(markup, /<div[^>]*>4\.2 km<\/div>/);
  assert.doesNotMatch(markup, /<dt/);
  assert.doesNotMatch(markup, /<dd/);
});
