import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { useBrowserSession } from './session-fixture';

const origin = 'http://127.0.0.1:3100';
const provider = 'addin-medical-college-hospital';
const branch = 'addin-moghbazar';
const listing = 'addin-moghbazar-complete-blood-count';
const details =
  'The official tariff shows a different price. Please check this source.\nবাংলা তথ্য যাচাই করুন।';
function reportUrl(target: string, id: string, issue?: string) {
  return `/report?${new URLSearchParams({ target, id, ...(issue ? { issue } : {}) })}`;
}
async function post(context: BrowserContext, path: string, form: Record<string, string>) {
  return context.request.post(path, { headers: { origin }, maxRedirects: 0, form });
}
async function fixture(context: BrowserContext) {
  await useBrowserSession(context, 'admin');
  const suffix = crypto.randomUUID();
  const branchId = `report-branch-${suffix}`;
  const id = `report-listing-${suffix}`;
  const created = await post(context, '/admin/providers/write', {
    entity: 'branch',
    mode: 'create',
    id: branchId,
    providerId: provider,
    name: `Reporting branch ${suffix}`,
    address: 'Synthetic correction fixture address',
    active: '1',
    contactSourceId: 'addin-contact-20261027',
    confirmContact: 'yes',
  });
  expect(created.headers().location).toContain('code=saved');
  const mapped = await post(context, '/admin/prices/write', {
    entity: 'listing',
    mode: 'create',
    id,
    branchId,
    serviceId: 'complete-blood-count',
    providerServiceName: 'Reporting CBC',
    active: '1',
    confirmMapping: 'yes',
  });
  expect(mapped.headers().location).toContain('code=saved');
  const price = await post(context, '/admin/prices/write', {
    entity: 'price',
    action: 'set',
    id,
    revision: '1',
    amount: '400',
    status: 'verified',
    sourceId: 'addin-hematology-20261027',
    sourceRow: '1',
    confirmReview: 'yes',
    standardPrice: 'yes',
  });
  expect(price.headers().location).toContain('code=saved');
  return id;
}
async function deactivate(page: Page, context: BrowserContext, id: string) {
  await useBrowserSession(context, 'admin');
  await page.goto(`/admin/prices?listing=${id}`);
  const revision = await page
    .getByRole('region', { name: 'Edit availability', exact: true })
    .locator('input[name=revision]')
    .inputValue();
  const response = await post(context, '/admin/prices/write', {
    entity: 'listing',
    mode: 'update',
    id,
    revision,
    providerServiceName: 'Reporting CBC',
    active: '0',
    confirmMapping: 'yes',
  });
  expect(response.headers().location).toContain('code=saved');
}
test('member submits a price report, retains a private receipt and immediately disputes the price', async ({
  page,
  context,
}, info) => {
  const id = await fixture(context);
  try {
    await useBrowserSession(
      context,
      info.project.name === 'mobile' ? 'report-mobile' : 'report-desktop',
    );
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(reportUrl('listing', id));
    await expect(page.getByText('Current price: BDT 400.00 · verified')).toBeVisible();
    await expect(page.getByLabel('Issue type')).toHaveValue('price');
    await expect(page.getByLabel('Issue type').locator('option')).toHaveCount(4);
    await page.getByLabel('What is incorrect?').fill(details);
    await page.getByLabel('Suggested correction (optional)').fill('BDT 450.00');
    await page
      .getByLabel('Evidence link (optional)')
      .fill('https://user:password@example.test/tariff');
    await page.getByLabel('I am reporting an issue with this specific record.').check();
    const failed = page.waitForResponse(
      (response) =>
        response.url().endsWith('/report/submit') && response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Submit report' }).click();
    expect((await failed).status()).toBe(400);
    await expect(page.getByRole('alert')).toContainText('Your report was not saved');
    await expect(page.getByLabel('What is incorrect?')).toHaveValue(details);
    await expect(page.getByLabel('Suggested correction (optional)')).toHaveValue('BDT 450.00');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (await page.getByRole('button', { name: 'Submit report' }).boundingBox())?.height,
    ).toBeGreaterThanOrEqual(44);
    await page.screenshot({
      path: `.bun-tmp/report-error-${info.project.name}.png`,
      fullPage: true,
    });
    await page.getByLabel('Evidence link (optional)').fill('https://example.test/tariff');
    await page.getByLabel('I am reporting an issue with this specific record.').check();
    await page.getByRole('button', { name: 'Submit report' }).click();
    await expect(page).toHaveURL(/\/report\?submitted=/);
    await expect(
      page.getByRole('heading', { name: 'Report submitted', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('status')).toContainText('disputed');
    await expect(page.getByText('Reported price: BDT 400.00 · verified')).toBeVisible();
    await expect(page.locator('.report-prose').first()).toHaveText(details);
    const receipt = page.url();
    const response = await page.reload();
    expect(response?.headers()['cache-control']).toContain('no-store');
    await page.screenshot({
      path: `.bun-tmp/report-receipt-${info.project.name}.png`,
      fullPage: true,
    });
    await useBrowserSession(context, 'member');
    await page.goto(receipt);
    await expect(
      page.getByRole('heading', { name: 'Record unavailable', exact: true }),
    ).toBeVisible();
    await expect(page.getByText(details, { exact: true })).toHaveCount(0);
    await useBrowserSession(context, 'admin');
    await page.goto(`/admin/prices?listing=${id}`);
    await expect(page.getByLabel('Price status', { exact: true })).toHaveValue('disputed');
    const edit = page.getByRole('region', { name: 'New price revision', exact: true });
    await edit.getByLabel('Price status', { exact: true }).selectOption('verified');
    await edit
      .getByLabel('I reviewed this tariff and price now. Required for verified status.')
      .check();
    await edit.getByLabel('This is a standard base price without a promotion or discount.').check();
    await edit.getByRole('button', { name: 'Save new price revision' }).click();
    await expect(page.getByRole('alert')).toContainText('pending price report');
    expect(errors).toEqual([]);
  } finally {
    await deactivate(page, context, id);
  }
});

test('reporting shows sign-in, expired, invalid-target and CSRF failures without saving', async ({
  page,
  context,
}) => {
  await page.goto(reportUrl('branch', branch, 'hours'));
  await expect(page.getByRole('heading', { name: 'Sign in to submit a report' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit report' })).toBeDisabled();
  const href = await page.getByRole('link', { name: 'Sign in with Google' }).getAttribute('href');
  expect(new URL(href ?? '', origin).searchParams.get('returnTo')).toContain('issue=hours');
  await useBrowserSession(context, 'expired');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Session expired', exact: true })).toBeVisible();
  await useBrowserSession(context, 'member');
  await page.goto(reportUrl('branch', 'missing-branch'));
  await expect(page.getByRole('heading', { name: 'Record unavailable' })).toBeVisible();
  await page.goto('/report?target=review&id=some-review');
  await expect(page.getByRole('alert')).toContainText('Check the selected issue');
  expect((await context.request.get('/report/submit')).status()).toBe(405);
  expect(
    (
      await context.request.post('/report/submit', {
        headers: { origin: 'https://attacker.test' },
        form: {},
      })
    ).status(),
  ).toBe(400);
});

test('report limit returns recoverable HTML with the draft intact', async ({
  page,
  context,
}, info) => {
  await useBrowserSession(
    context,
    info.project.name === 'mobile' ? 'report-limit-mobile' : 'report-limit-desktop',
  );
  for (const [target, id, issues] of [
    ['branch', branch, ['address', 'hours', 'phone']],
    ['provider', provider, ['provider_information', 'phone']],
  ] as const) {
    await page.goto(reportUrl(target, id));
    const revision = await page.locator('input[name=observedRevision]').inputValue();
    for (const issue of issues) {
      const response = await post(context, '/report/submit', {
        target,
        id,
        issue,
        observedRevision: revision,
        details,
        confirmReport: 'yes',
      });
      expect(response.status()).toBe(303);
    }
  }
  await page.goto(reportUrl('listing', listing, 'availability'));
  await page.getByLabel('What is incorrect?').fill(details);
  await page.getByLabel('I am reporting an issue with this specific record.').check();
  const response = page.waitForResponse((response) => response.url().endsWith('/report/submit'));
  await page.getByRole('button', { name: 'Submit report' }).click();
  expect((await response).status()).toBe(429);
  await expect(page.getByRole('alert')).toContainText('report limit');
  await expect(page.getByLabel('What is incorrect?')).toHaveValue(details);
});

test.describe('native reporting form', () => {
  test.use({ javaScriptEnabled: false });
  test('submits and rejects a duplicate without JavaScript', async ({ page, context }, info) => {
    await useBrowserSession(
      context,
      info.project.name === 'mobile' ? 'report-nojs-mobile' : 'report-nojs-desktop',
    );
    await page.goto(reportUrl('branch', branch, 'phone'));
    await expect(page.getByLabel('Issue type')).toHaveValue('phone');
    await expect(page.getByLabel('Issue type').locator('option')).toHaveCount(3);
    await page.getByLabel('What is incorrect?').fill(details);
    await page.getByLabel('I am reporting an issue with this specific record.').check();
    await page.getByRole('button', { name: 'Submit report' }).click();
    await expect(
      page.getByRole('heading', { name: 'Report submitted', exact: true }),
    ).toBeVisible();
    await page.goto(reportUrl('branch', branch, 'phone'));
    await page.getByLabel('What is incorrect?').fill(details);
    await page.getByLabel('I am reporting an issue with this specific record.').check();
    await page.getByRole('button', { name: 'Submit report' }).click();
    await expect(page.getByRole('alert')).toContainText('already have a pending report');
    await expect(page.getByLabel('What is incorrect?')).toHaveValue(details);
  });
});
