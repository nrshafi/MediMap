import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { EmptyState } from '../EmptyState';

test('EmptyState renders icon, title, single-line description, and optional action', () => {
  const markup = renderToStaticMarkup(
    <EmptyState
      icon={<span data-testid="empty-icon">Icon</span>}
      title="No diagnostic branches found"
      description="Try expanding your radius distance or searching another location."
      action={<button type="button">Expand radius</button>}
    />,
  );

  assert.match(markup, /role="status"/);
  assert.match(markup, /data-testid="empty-icon"/);
  assert.match(markup, /No diagnostic branches found/);
  assert.match(markup, /Try expanding your radius distance or searching another location\./);
  assert.match(markup, /Expand radius/);
});

test('EmptyState renders cleanly without optional icon and action', () => {
  const markup = renderToStaticMarkup(
    <EmptyState
      title="No active reviews"
      description="Be the first patient or caregiver to review this branch."
    />,
  );

  assert.match(markup, /No active reviews/);
  assert.match(markup, /Be the first patient or caregiver to review this branch\./);
  assert.doesNotMatch(markup, /empty-icon/);
  assert.doesNotMatch(markup, /<button/);
});
