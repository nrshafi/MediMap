import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { PageHeader } from '../PageHeader';

test('PageHeader renders title, eyebrow, description, and actions', () => {
  const markup = renderToStaticMarkup(
    <PageHeader
      eyebrow="Administration"
      title="Pricing Overview"
      description="Inspect published rates and official evidence."
      actions={<button type="button">Add Price</button>}
    />,
  );

  assert.match(markup, /Administration/);
  assert.match(markup, /Pricing Overview/);
  assert.match(markup, /Inspect published rates and official evidence\./);
  assert.match(markup, /Add Price/);
});

test('PageHeader renders minimal header with title only', () => {
  const markup = renderToStaticMarkup(<PageHeader title="Diagnostic Services" />);
  assert.match(markup, /Diagnostic Services/);
  assert.doesNotMatch(markup, /Administration/);
});
