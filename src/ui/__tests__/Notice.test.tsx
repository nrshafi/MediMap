import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { Notice } from '../Notice';

test('Notice renders info, warning, and error styles', () => {
  const info = renderToStaticMarkup(<Notice kind="info">General note</Notice>);
  assert.match(info, /border-border/);
  assert.match(info, /bg-surface-sunken/);
  assert.match(info, /text-muted/);
  assert.match(info, /role="status"/);

  const warning = renderToStaticMarkup(<Notice kind="warning">Pending review</Notice>);
  assert.match(warning, /border-disputed\/40/);
  assert.match(warning, /bg-disputed-soft/);
  assert.match(warning, /text-disputed/);
  assert.match(warning, /role="status"/);

  const error = renderToStaticMarkup(<Notice kind="error">System failure</Notice>);
  assert.match(error, /border-error\/40/);
  assert.match(error, /bg-error-soft/);
  assert.match(error, /text-error/);
  assert.match(error, /role="alert"/);
});

test('Notice respects custom role and renders optional title', () => {
  const custom = renderToStaticMarkup(
    <Notice kind="info" role="alert" title="Important notice">
      Body details
    </Notice>,
  );
  assert.match(custom, /role="alert"/);
  assert.match(custom, /Important notice/);
  assert.match(custom, /Body details/);
});
