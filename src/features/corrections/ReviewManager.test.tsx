import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReviewManager } from './ReviewManager';
import type { ReviewData } from './review-contracts';
import type { ReportTarget } from './contracts';
test('denied report review renders no private queue, report detail or resolution form', () => {
  for (const code of ['unauthenticated', 'forbidden', 'expired', 'unavailable'] as const) {
    const html = renderToStaticMarkup(
      <ReviewManager result={{ ok: false, code, message: 'Access unavailable.' }} />,
    );
    assert.doesNotMatch(html, /<form|Original submission|Save resolution/);
    assert.match(html, /role="alert"/);
  }
});
test('report review escapes untrusted submissions and draft reasons with distinct target headings', () => {
  const target: ReportTarget = {
    kind: 'branch',
    id: 'branch',
    revision: 1,
    providerId: 'provider',
    providerName: 'Provider',
    branchId: 'branch',
    listingId: null,
    branchName: 'Branch',
    serviceName: null,
    providerServiceName: null,
    address: 'Known address',
    phone: null,
    website: null,
    openingHours: null,
    price: null,
  };
  const data: ReviewData = {
    query: { status: 'pending', limit: 30 },
    queue: { items: [], nextCursor: null },
    sources: { items: [], nextCursor: null },
    selectedSource: null,
    selected: {
      report: {
        id: 'report',
        issue: 'address',
        status: 'pending',
        createdAt: 1,
        target,
        details: '<script>literal submission text</script>',
        suggestedCorrection: null,
        evidenceUrl: null,
      },
      reporterId: 'account',
      current: target,
      active: true,
      pendingPriceReports: 0,
      resolution: null,
    },
  };
  const html = renderToStaticMarkup(
    <ReviewManager
      result={{ ok: true, data }}
      search={{ code: '__proto__' }}
      draft={{ reason: '<img src=x onerror=alert(1)>' }}
    />,
  );
  assert.doesNotMatch(html, /<script>|<img /);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;img /);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size);
});
