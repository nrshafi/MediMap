import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReportView } from './ReportView';
import type { ReportTarget } from './contracts';

const target: ReportTarget = {
  kind: 'listing',
  id: 'cbc-listing',
  revision: 1,
  providerId: 'provider',
  providerName: 'Provider',
  branchId: 'branch',
  listingId: 'cbc-listing',
  branchName: 'Branch',
  serviceName: 'Complete Blood Count',
  providerServiceName: 'CBC',
  address: 'Known address',
  phone: null,
  website: null,
  openingHours: null,
  price: null,
};
test('untrusted report text stays escaped in drafts and receipts', () => {
  const details = '<script>alert("report")</script> & literal details';
  const draft = renderToStaticMarkup(
    <ReportView
      data={{ target, access: 'allowed', receipt: null, error: 'invalid_request' }}
      draft={{ details }}
    />,
  );
  const receipt = renderToStaticMarkup(
    <ReportView
      data={{
        target,
        access: 'allowed',
        error: null,
        receipt: {
          id: 'receipt',
          issue: 'price',
          status: 'pending',
          createdAt: 1,
          target,
          details,
          suggestedCorrection: '<img src=x onerror=alert(1)>',
          evidenceUrl: null,
        },
      }}
    />,
  );
  for (const html of [draft, receipt]) {
    assert.doesNotMatch(html, /<script>|<img /);
    assert.match(html, /&lt;script&gt;/);
  }
  assert.match(receipt, /price remains unknown/);
  assert.doesNotMatch(receipt, /BDT 0/);
});
test('expired session leaves a recoverable draft and disables submission', () => {
  const html = renderToStaticMarkup(
    <ReportView
      data={{ target, access: 'expired', receipt: null, error: null }}
      draft={{ details: 'My retained report details', issue: 'availability' }}
    />,
  );
  assert.match(html, /Session expired/);
  assert.match(html, /My retained report details/);
  assert.match(html, /button type="submit" disabled/);
  assert.match(html, /returnTo=/);
});
