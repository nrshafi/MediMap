import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { Chip } from '../Chip';

test('Chip renders as toggle button with touch target, border, and unpressed state', () => {
  const markup = renderToStaticMarkup(<Chip>Option</Chip>);
  assert.match(markup, /<button/);
  assert.match(markup, /type="button"/);
  assert.match(markup, /min-h-touch/);
  assert.match(markup, /rounded-full/);
  assert.match(markup, /border-border/);
  assert.match(markup, /hover:border-border-strong/);
  assert.match(markup, /focus-visible:outline-focus/);
  assert.match(markup, /Option/);
});

test('Chip renders pressed state and aria-pressed attribute', () => {
  const markup = renderToStaticMarkup(<Chip pressed={true}>Active</Chip>);
  assert.match(markup, /aria-pressed="true"/);
  assert.match(markup, /aria-pressed:bg-ink/);
  assert.match(markup, /aria-pressed:text-on-ink/);
  assert.match(markup, /aria-pressed:border-ink/);
});

test('Chip renders aria-pressed when passed via aria-pressed prop', () => {
  const markup = renderToStaticMarkup(<Chip aria-pressed={true}>Active</Chip>);
  assert.match(markup, /aria-pressed="true"/);
});

test('Chip renders optional icon', () => {
  const markup = renderToStaticMarkup(
    <Chip icon={<span data-testid="test-icon">*</span>}>With icon</Chip>,
  );
  assert.match(markup, /data-testid="test-icon"/);
  assert.match(markup, /With icon/);
});

test('Chip handles disabled state', () => {
  const markup = renderToStaticMarkup(<Chip disabled={true}>Disabled</Chip>);
  assert.match(markup, /disabled=""/);
  assert.match(markup, /disabled:cursor-not-allowed/);
  assert.match(markup, /disabled:opacity-60/);
});

test('Chip merges custom className', () => {
  const markup = renderToStaticMarkup(<Chip className="justify-center">Centered</Chip>);
  assert.match(markup, /justify-center/);
});
