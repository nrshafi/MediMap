import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button, ButtonLink } from '../Button';

test('Button renders variants with required touch target and styles', () => {
  const primary = renderToStaticMarkup(<Button variant="primary">Confirm</Button>);
  assert.match(primary, /bg-primary/);
  assert.match(primary, /min-h-touch/);
  assert.match(primary, /Confirm/);

  const secondary = renderToStaticMarkup(<Button variant="secondary">Cancel</Button>);
  assert.match(secondary, /border-border-strong/);
  assert.match(secondary, /bg-surface/);

  const ghost = renderToStaticMarkup(<Button variant="ghost">Dismiss</Button>);
  assert.match(ghost, /text-primary/);
  assert.match(ghost, /hover:bg-primary-soft/);

  const danger = renderToStaticMarkup(<Button variant="danger">Delete</Button>);
  assert.match(danger, /bg-error/);
  assert.match(danger, /text-white/);
});

test('Button supports default and small sizes while preserving min-h-touch', () => {
  const def = renderToStaticMarkup(<Button size="default">Default</Button>);
  assert.match(def, /min-h-touch/);
  assert.match(def, /text-small/);

  const small = renderToStaticMarkup(<Button size="small">Small</Button>);
  assert.match(small, /min-h-touch/);
  assert.match(small, /text-label/);
});

test('Button handles pending state with spinner, aria-busy and disabled state', () => {
  const markup = renderToStaticMarkup(<Button pending={true}>Saving</Button>);
  assert.match(markup, /aria-busy="true"/);
  assert.match(markup, /disabled=""/);
  assert.match(markup, /animate-spin/);
  assert.match(markup, /Saving/);
});

test('Button handles explicit disabled state', () => {
  const markup = renderToStaticMarkup(<Button disabled={true}>Action</Button>);
  assert.match(markup, /disabled=""/);
  assert.match(markup, /disabled:cursor-not-allowed/);
});

test('Button renders link variant when href is provided or via ButtonLink', () => {
  const viaProp = renderToStaticMarkup(
    <Button href="/find" variant="primary">
      Find services
    </Button>,
  );
  assert.match(viaProp, /<a /);
  assert.match(viaProp, /href="\/find"/);
  assert.match(viaProp, /bg-primary/);

  const viaComponent = renderToStaticMarkup(
    <ButtonLink href="/compare" variant="secondary">
      Compare
    </ButtonLink>,
  );
  assert.match(viaComponent, /<a /);
  assert.match(viaComponent, /href="\/compare"/);
  assert.match(viaComponent, /border-border-strong/);
});
