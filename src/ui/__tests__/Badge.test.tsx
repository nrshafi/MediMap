import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import type { CurrentPrice } from '../../features/catalog/contracts';
import { Badge, StatusBadge } from '../Badge';

const mockPrice = (status: CurrentPrice['status']): CurrentPrice => ({
  id: 'price-test-1',
  amountMinor: 40000,
  amountBdt: 400,
  currency: 'BDT',
  status,
  verifiedAt: '2026-10-15T00:00:00Z',
  effectiveDate: null,
  verificationMethod: 'official_website_review',
  source: null,
  sourceRow: null,
});

test('Badge renders tones with appropriate background and text colors', () => {
  const verified = renderToStaticMarkup(<Badge tone="verified">Verified</Badge>);
  assert.match(verified, /bg-verified-soft/);
  assert.match(verified, /text-verified/);

  const disputed = renderToStaticMarkup(<Badge tone="disputed">Disputed</Badge>);
  assert.match(disputed, /bg-disputed-soft/);
  assert.match(disputed, /text-disputed/);

  const unknown = renderToStaticMarkup(<Badge tone="unknown">Unknown</Badge>);
  assert.match(unknown, /bg-unknown-soft/);
  assert.match(unknown, /text-unknown/);

  const error = renderToStaticMarkup(<Badge tone="error">Failed</Badge>);
  assert.match(error, /bg-error-soft/);
  assert.match(error, /text-error/);
});

test('StatusBadge maps verified, disputed, and unknown price states correctly', () => {
  const verifiedMarkup = renderToStaticMarkup(<StatusBadge price={mockPrice('verified')} />);
  assert.match(verifiedMarkup, /bg-verified-soft/);
  assert.match(verifiedMarkup, /Verified/);

  const disputedMarkup = renderToStaticMarkup(<StatusBadge price={mockPrice('disputed')} />);
  assert.match(disputedMarkup, /bg-disputed-soft/);
  assert.match(disputedMarkup, /Disputed, under review/);

  const nullPriceMarkup = renderToStaticMarkup(<StatusBadge price={null} />);
  assert.match(nullPriceMarkup, /bg-unknown-soft/);
  assert.match(nullPriceMarkup, /Price unknown/);
});

test('StatusBadge handles explicit tone and custom labels', () => {
  const custom = renderToStaticMarkup(<StatusBadge tone="disputed" label="Under Investigation" />);
  assert.match(custom, /bg-disputed-soft/);
  assert.match(custom, /Under Investigation/);
});
