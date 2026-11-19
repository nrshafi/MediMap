import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { Field, fieldControlStyles } from '../Field';

test('Field links label, control, hint and error with aria-describedby and htmlFor', () => {
  const markup = renderToStaticMarkup(
    <Field
      id="test-input"
      label="Branch Address"
      hint="Provide official published address"
      error="Address cannot be empty"
      required={true}
    >
      <input className={fieldControlStyles} type="text" />
    </Field>,
  );

  assert.match(markup, /<label[^>]*for="test-input"/);
  assert.match(markup, /id="test-input"/);
  assert.match(markup, /aria-describedby="test-input-error test-input-hint"/);
  assert.match(markup, /aria-invalid="true"/);
  assert.match(markup, /aria-required="true"/);
  assert.match(markup, /id="test-input-hint"/);
  assert.match(markup, /Provide official published address/);
  assert.match(markup, /id="test-input-error"/);
  assert.match(markup, /role="alert"/);
  assert.match(markup, /Address cannot be empty/);
  assert.match(markup, /border-border-strong/);
});

test('Field handles hint only without error', () => {
  const markup = renderToStaticMarkup(
    <Field id="hint-only" label="Search Radius" hint="Straight-line distance in km">
      <input type="number" />
    </Field>,
  );

  assert.match(markup, /for="hint-only"/);
  assert.match(markup, /id="hint-only"/);
  assert.match(markup, /aria-describedby="hint-only-hint"/);
  assert.doesNotMatch(markup, /aria-invalid/);
  assert.doesNotMatch(markup, /role="alert"/);
});

test('Field handles function as child render prop', () => {
  const markup = renderToStaticMarkup(
    <Field id="fn-field" label="Postal Code" error="Invalid format">
      {({ id, 'aria-describedby': describedBy, 'aria-invalid': invalid }) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          data-custom="render-prop"
        />
      )}
    </Field>,
  );

  assert.match(markup, /id="fn-field"/);
  assert.match(markup, /data-custom="render-prop"/);
  assert.match(markup, /aria-describedby="fn-field-error"/);
  assert.match(markup, /aria-invalid="true"/);
});
