import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { useBrowserSession } from './session-fixture';
const origin = 'http://127.0.0.1:3100';
const provider = 'addin-medical-college-hospital';
const reason =
  'Reviewed the official provider evidence and confirmed this decision.\nআগের তথ্য সংরক্ষিত আছে।';
async function post(context: BrowserContext, path: string, form: Record<string, string>) {
  return context.request.post(path, { headers: { origin }, maxRedirects: 0, form });
}
async function fixture(context: BrowserContext, withPrice = true) {
  await useBrowserSession(context, 'admin');
  const suffix = crypto.randomUUID();
  const branch = `resolution-branch-${suffix}`;
  const listing = `resolution-listing-${suffix}`;
  expect(
    (
      await post(context, '/admin/providers/write', {
        entity: 'branch',
        mode: 'create',
        id: branch,
        providerId: provider,
        name: `Review branch ${suffix}`,
        address: 'Synthetic review fixture address',
        active: '1',
        contactSourceId: 'addin-contact-20261027',
        confirmContact: 'yes',
      })
    ).headers().location,
  ).toContain('code=saved');
  if (withPrice) {
    expect(
      (
        await post(context, '/admin/prices/write', {
          entity: 'listing',
          mode: 'create',
          id: listing,
          branchId: branch,
          serviceId: 'complete-blood-count',
          providerServiceName: 'Review CBC',
          active: '1',
          confirmMapping: 'yes',
        })
      ).headers().location,
    ).toContain('code=saved');
    expect(
      (
        await post(context, '/admin/prices/write', {
          entity: 'price',
          action: 'set',
          id: listing,
          revision: '1',
          amount: '400',
          status: 'verified',
          sourceId: 'addin-hematology-20261027',
          sourceRow: '1',
          confirmReview: 'yes',
          standardPrice: 'yes',
        })
      ).headers().location,
    ).toContain('code=saved');
  }
  return { branch, listing };
}
async function report(
  page: Page,
  context: BrowserContext,
  id: string,
  target: 'branch' | 'listing',
  role: Parameters<typeof useBrowserSession>[1],
) {
  await useBrowserSession(context, role);
  await page.goto(
    `/report?${new URLSearchParams({ target, id, issue: target === 'listing' ? 'price' : 'phone' })}`,
  );
  const revision = await page.locator('input[name=observedRevision]').inputValue();
  const priceId = await page.locator('input[name=observedPriceId]').inputValue();
  const response = await post(context, '/report/submit', {
    target,
    id,
    issue: target === 'listing' ? 'price' : 'phone',
    observedRevision: revision,
    observedPriceId: priceId,
    details: 'The published details differ from this official source.',
    confirmReport: 'yes',
  });
  expect(response.status()).toBe(303);
  const reportId = new URL(response.headers().location, origin).searchParams.get('submitted');
  expect(reportId).toBeTruthy();
  return reportId!;
}
async function deactivate(page: Page, context: BrowserContext, id: string) {
  await useBrowserSession(context, 'admin');
  await page.goto(`/admin/prices?listing=${id}`);
  const revision = await page
    .getByRole('region', { name: 'Edit availability', exact: true })
    .locator('input[name=revision]')
    .inputValue();
  expect(
    (
      await post(context, '/admin/prices/write', {
        entity: 'listing',
        mode: 'update',
        id,
        revision,
        providerServiceName: 'Review CBC',
        active: '0',
        confirmMapping: 'yes',
      })
    ).headers().location,
  ).toContain('code=saved');
}

test('administrator resolves competing price reports with retained evidence and final verification', async ({
  page,
  context,
}, info) => {
  const target = await fixture(context);
  try {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const first = await report(
      page,
      context,
      target.listing,
      'listing',
      info.project.name === 'mobile' ? 'review-mobile' : 'review-desktop',
    );
    const second = await report(
      page,
      context,
      target.listing,
      'listing',
      info.project.name === 'mobile' ? 'review-nojs-mobile' : 'review-nojs-desktop',
    );
    await useBrowserSession(context, 'admin');
    await page.goto(`/admin/reports?report=${first}&status=all`);
    await expect(page.getByRole('region', { name: 'Current target', exact: true })).toContainText(
      'Pending price reports for this listing: 2',
    );
    const form = page.getByRole('region', { name: 'Resolve report', exact: true });
    await form.getByLabel('Resolution decision').selectOption('accepted');
    await form.getByLabel('Reviewed standard price (BDT)').fill('450.05');
    await form.getByLabel('Resolution reason').fill(reason);
    await form.getByLabel('Reviewed official source').selectOption('addin-contact-20261027');
    await form
      .getByLabel('The reviewed amount is a standard base price without a promotion or discount.')
      .check();
    await form.getByLabel('I reviewed this official source and the current target now.').check();
    await form.getByRole('button', { name: 'Save resolution' }).click();
    await expect(page.getByRole('alert')).toContainText('official source');
    await expect(page.getByLabel('Resolution reason')).toHaveValue(reason);
    await page.getByLabel('Reviewed official source').selectOption('addin-hematology-20261027');
    await page.getByLabel('I reviewed this official source and the current target now.').check();
    await page
      .getByLabel('The reviewed amount is a standard base price without a promotion or discount.')
      .check();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole('region', { name: 'Resolve report', exact: true }).screenshot({
      path: `.bun-tmp/resolution-editor-${info.project.name}.png`,
      caret: 'initial',
    });
    await page.getByRole('button', { name: 'Save resolution' }).click();
    await expect(page.getByRole('status')).toContainText('resolution saved');
    const history = page.getByRole('region', { name: 'Recorded resolution', exact: true });
    await expect(history).toContainText('Decision: accepted');
    await expect(history).toContainText('Price outcome at resolution: disputed');
    await expect(page.getByRole('region', { name: 'Current target', exact: true })).toContainText(
      'BDT 450.05 · disputed',
    );
    await page.goto(`/admin/reports?report=${second}&status=all`);
    await page.getByLabel('Resolution reason').fill(reason);
    await page.getByLabel('I reviewed this official source and the current target now.').check();
    await page
      .getByLabel('The reviewed amount is a standard base price without a promotion or discount.')
      .check();
    const revision = await page.locator('input[name=reviewedRevision]').inputValue();
    const priceId = await page.locator('input[name=reviewedPriceId]').inputValue();
    expect(
      (await page.getByRole('button', { name: 'Save resolution' }).boundingBox())?.height,
    ).toBeGreaterThanOrEqual(44);
    await page.getByRole('button', { name: 'Save resolution' }).click();
    await expect(
      page.getByRole('region', { name: 'Recorded resolution', exact: true }),
    ).toContainText('Price outcome at resolution: verified');
    await expect(page.getByRole('region', { name: 'Current target', exact: true })).toContainText(
      'BDT 450.05 · verified',
    );
    await page.screenshot({
      path: `.bun-tmp/resolution-history-${info.project.name}.png`,
      fullPage: true,
      caret: 'initial',
    });
    const response = await post(context, '/admin/reports/resolve', {
      reportId: second,
      reviewedRevision: revision,
      reviewedPriceId: priceId,
      outcome: 'rejected',
      reason,
      sourceId: 'addin-hematology-20261027',
      sourceRow: '1',
      priceAction: 'review_price',
      amount: '450.05',
      confirmReview: 'yes',
      standardPrice: 'yes',
    });
    expect(response.status()).toBe(409);
    await useBrowserSession(
      context,
      info.project.name === 'mobile' ? 'review-desktop' : 'review-mobile',
    );
    await page.goto(`/report?submitted=${first}`);
    await expect(
      page.getByRole('heading', { name: 'Record unavailable', exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await deactivate(page, context, target.listing);
  }
});

test('report review denies guests, members, expired sessions, GET and cross-origin decisions', async ({
  page,
  context,
}) => {
  await page.goto('/admin/reports');
  await expect(
    page.getByRole('heading', { name: 'Sign in to continue', exact: true }),
  ).toBeVisible();
  await useBrowserSession(context, 'member');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Administrator access required', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: 'Report queue', exact: true })).toHaveCount(0);
  await useBrowserSession(context, 'expired');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Session expired', exact: true })).toBeVisible();
  expect((await context.request.get('/admin/reports/resolve')).status()).toBe(405);
  await useBrowserSession(context, 'admin');
  expect(
    (
      await context.request.post('/admin/reports/resolve', {
        headers: { origin: 'https://attacker.test' },
        form: {},
      })
    ).status(),
  ).toBe(400);
  await page.goto('/admin/reports?status=invalid');
  await expect(page.getByRole('alert')).toContainText('Check the decision');
});

test.describe('administrator resolution without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('native form requires a correction before accepting a branch report', async ({
    page,
    context,
  }, info) => {
    const target = await fixture(context, false);
    const id = await report(
      page,
      context,
      target.branch,
      'branch',
      info.project.name === 'mobile' ? 'review-nojs-mobile' : 'review-nojs-desktop',
    );
    await useBrowserSession(context, 'admin');
    await page.goto(`/admin/reports?report=${id}`);
    await page.getByLabel('Resolution decision').selectOption('accepted');
    await page.getByLabel('Resolution reason').fill(reason);
    await page.getByLabel('Reviewed official source').selectOption('addin-contact-20261027');
    await page.getByLabel('I reviewed this official source and the current target now.').check();
    await page.getByRole('button', { name: 'Save resolution' }).click();
    await expect(page.getByRole('alert')).toContainText('existing editor before accepting');
    await expect(page.getByLabel('Resolution reason')).toHaveValue(reason);
    await page.getByRole('link', { name: 'Open record editor', exact: true }).click();
    const editor = page.getByRole('region', { name: 'Edit branch', exact: true });
    await editor.getByLabel('Primary telephone').fill('0255555000');
    await editor
      .getByLabel('I checked these branch details against the selected official contact source.')
      .check();
    await editor.getByRole('button', { name: 'Save branch' }).click();
    await page.goto(`/admin/reports?report=${id}`);
    await page.getByLabel('Resolution decision').selectOption('accepted');
    await page.getByLabel('Resolution reason').fill(reason);
    await page.getByLabel('Reviewed official source').selectOption('addin-contact-20261027');
    await page.getByLabel('I reviewed this official source and the current target now.').check();
    await page.getByRole('button', { name: 'Save resolution' }).click();
    await expect(
      page.getByRole('region', { name: 'Recorded resolution', exact: true }),
    ).toContainText('Decision: accepted');
    await expect(page.getByRole('region', { name: 'Current target', exact: true })).toContainText(
      '0255555000',
    );
    await page.getByLabel('Report status').selectOption('accepted');
    await page.getByRole('button', { name: 'Filter reports' }).click();
    await expect(page).toHaveURL(/status=accepted/);
    await expect(page.getByRole('region', { name: 'Report queue', exact: true })).toContainText(
      'accepted',
    );
  });
});
