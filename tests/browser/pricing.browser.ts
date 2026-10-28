import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { useBrowserSession } from './session-fixture';
const origin = 'http://127.0.0.1:3100';
async function newListing(page: Page, context: BrowserContext, suffix: string, active = true) {
  const branchId = `pricing-branch-${suffix}`;
  const result = await context.request.post('/admin/providers/write', {
    headers: { origin },
    maxRedirects: 0,
    form: {
      entity: 'branch',
      mode: 'create',
      id: branchId,
      providerId: 'addin-medical-college-hospital',
      name: `Pricing branch ${suffix}`,
      address: 'Synthetic pricing fixture address',
      active: '1',
      contactSourceId: 'addin-contact-20261027',
      confirmContact: 'yes',
    },
  });
  expect(result.headers().location).toContain('code=saved');
  await page.goto('/admin/prices?provider=addin-medical-college-hospital');
  const form = page.getByRole('region', { name: 'Add branch-service listing', exact: true });
  await form.getByLabel('Stable ID').fill(`pricing-listing-${suffix}`);
  await form.getByLabel('Branch', { exact: true }).selectOption(branchId);
  await form.getByLabel('Canonical service', { exact: true }).selectOption('complete-blood-count');
  await form.getByLabel('Original provider service label').fill('Browser CBC');
  if (active) await form.getByLabel('Availability').selectOption('1');
  await form
    .getByLabel('The provider label refers to this canonical diagnostic service and variant.')
    .check();
  await form.getByRole('button', { name: 'Create branch-service listing' }).click();
  await expect(page.getByRole('status')).toContainText('change saved');
  return { id: `pricing-listing-${suffix}`, branchName: `Pricing branch ${suffix}` };
}
async function deactivate(page: Page, context: BrowserContext, id: string) {
  await page.goto(`/admin/prices?listing=${id}`);
  const form = page.getByRole('region', { name: 'Edit availability', exact: true });
  if (!(await form.count())) return;
  const revision = await form.locator('input[name=revision]').inputValue();
  const response = await context.request.post('/admin/prices/write', {
    headers: { origin },
    maxRedirects: 0,
    form: {
      entity: 'listing',
      mode: 'update',
      id,
      revision,
      providerServiceName: 'Browser CBC',
      active: '0',
      confirmMapping: 'yes',
    },
  });
  expect(response.headers().location).toContain('code=saved');
}

test('administrator verifies, disputes and clears a branch price while retaining source and price history', async ({
  page,
  context,
}) => {
  await useBrowserSession(context, 'admin');
  const suffix = crypto.randomUUID();
  const fixture = await newListing(page, context, suffix);
  try {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const form = page.getByRole('region', { name: 'New price revision', exact: true });
    await form.getByLabel('Standard price (BDT)').fill('400.00');
    await form.getByLabel('Price status', { exact: true }).selectOption('verified');
    await form
      .getByLabel('Official tariff source', { exact: true })
      .selectOption('addin-hematology-20261027');
    await form.getByLabel('Source row number').fill('1');
    await form
      .getByLabel('I reviewed this tariff and price now. Required for verified status.')
      .check();
    await form.getByLabel('This is a standard base price without a promotion or discount.').check();
    await form
      .getByLabel('Revision notes')
      .fill('Synthetic test revision.\nSource history must remain.');
    await form.getByRole('button', { name: 'Save new price revision' }).click();
    await page.waitForLoadState('load');
    await expect(page.getByRole('status')).toContainText('change saved');
    await expect(
      page
        .getByRole('region', { name: 'Retained price revisions', exact: true })
        .getByRole('article'),
    ).toHaveCount(1);
    const saved = page.getByRole('region', { name: 'New price revision', exact: true });
    expect(
      (await saved.getByRole('button', { name: 'Save new price revision' }).boundingBox())?.height,
    ).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await saved.screenshot({
      path: `.bun-tmp/pricing-editor-${test.info().project.name}.png`,
      caret: 'initial',
    });
    await page.getByRole('link', { name: 'Inspect published service' }).click();
    const listing = page.getByRole('article').filter({ hasText: fixture.branchName });
    await expect(listing.locator('.catalog-price')).toContainText('400');
    await expect(listing).toContainText('Verified on official website');
    await page.goto(`/admin/prices?listing=${fixture.id}`);
    const dispute = page.getByRole('region', { name: 'New price revision', exact: true });
    await dispute.getByLabel('Price status', { exact: true }).selectOption('disputed');
    await dispute
      .getByLabel('This is a standard base price without a promotion or discount.')
      .check();
    await dispute.getByRole('button', { name: 'Save new price revision' }).click();
    await page.waitForLoadState('load');
    await expect(
      page
        .getByRole('region', { name: 'Retained price revisions', exact: true })
        .getByRole('article'),
    ).toHaveCount(2);
    const clear = page.getByRole('region', { name: 'Unknown current price', exact: true });
    await clear
      .getByLabel('Set the current price to unknown and retain all previous revisions.')
      .check();
    await clear.getByRole('button', { name: 'Set current price to unknown' }).click();
    await page.waitForLoadState('load');
    await expect(
      page.getByRole('region', { name: 'New price revision', exact: true }),
    ).toContainText('Current price unknown');
    await expect(
      page
        .getByRole('region', { name: 'Retained price revisions', exact: true })
        .getByRole('article'),
    ).toHaveCount(2);
    await page.getByRole('link', { name: 'Inspect published service' }).click();
    await expect(
      page.getByRole('article').filter({ hasText: fixture.branchName }).locator('.catalog-price'),
    ).toContainText('Price unknown');
    expect(errors).toEqual([]);
  } finally {
    await deactivate(page, context, fixture.id);
  }
});

test('source forms preserve actual collection metadata and create retained snapshots', async ({
  page,
  context,
}) => {
  await useBrowserSession(context, 'admin');
  await page.goto('/admin/prices?provider=addin-medical-college-hospital');
  const suffix = crypto.randomUUID();
  const form = page.getByRole('region', { name: 'Add source snapshot', exact: true });
  await form.getByLabel('Stable ID').fill(`browser-source-${suffix}`);
  await form.getByLabel('Official source URL').fill(`https://example.test/fixture-${suffix}`);
  await form.getByLabel('Source kind', { exact: true }).selectOption('official_contact');
  await form.getByLabel('Collection timestamp (UTC)').fill('2026-10-27T09:00:00Z');
  await form.getByLabel('Snapshot SHA-256').fill('b'.repeat(64));
  await form.getByLabel('Actual collector reference').fill('Isolated browser fixture');
  await form
    .getByLabel('These are the actual details of a reviewed official source snapshot.')
    .check();
  await form.getByRole('button', { name: 'Create source snapshot' }).click();
  await expect(page.getByRole('status')).toContainText('change saved');
  const source = page
    .getByRole('region', { name: 'Official source snapshots', exact: true })
    .getByRole('article')
    .filter({ hasText: `browser-source-${suffix}` });
  await expect(source).toContainText('Isolated browser fixture');
  await expect(source).toContainText('2026-10-27T09:00:00Z');
});

test('pricing endpoints reject guests, ordinary users, expired sessions, forged roles and cross-origin writes', async ({
  page,
  context,
}) => {
  const form = {
    entity: 'price',
    action: 'clear',
    id: 'addin-moghbazar-complete-blood-count',
    revision: '1',
    confirmClear: 'yes',
  };
  expect(
    (
      await context.request.post('/admin/prices/write', {
        form,
        headers: { origin, 'x-role': 'administrator' },
      })
    ).status(),
  ).toBe(401);
  await useBrowserSession(context, 'member');
  await page.goto('/admin/prices');
  await expect(page.getByRole('heading', { name: 'Administrator access required' })).toBeVisible();
  expect(
    (await context.request.post('/admin/prices/write', { form, headers: { origin } })).status(),
  ).toBe(403);
  await context.clearCookies();
  await useBrowserSession(context, 'expired');
  expect(
    (await context.request.post('/admin/prices/write', { form, headers: { origin } })).status(),
  ).toBe(401);
  await context.clearCookies();
  await useBrowserSession(context, 'admin');
  expect(
    (
      await context.request.post('/admin/prices/write', {
        form,
        headers: { origin: 'https://attacker.test' },
      })
    ).status(),
  ).toBe(400);
  expect((await context.request.get('/admin/prices/write')).status()).toBe(405);
  await page.goto('/admin/prices?code=__proto__');
  await expect(page.getByRole('heading', { name: 'Manage branch prices' })).toBeVisible();
});

test.describe('price administration without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('native price forms retain an unverified decimal price', async ({ page, context }) => {
    await useBrowserSession(context, 'admin');
    const fixture = await newListing(page, context, crypto.randomUUID(), false);
    try {
      const form = page.getByRole('region', { name: 'New price revision', exact: true });
      await form.getByLabel('Standard price (BDT)').fill('500.05');
      await form
        .getByLabel('This is a standard base price without a promotion or discount.')
        .check();
      await form.getByRole('button', { name: 'Save new price revision' }).click();
      await expect(page.getByRole('status')).toContainText('change saved');
      await page.reload();
      await expect(
        page
          .getByRole('region', { name: 'New price revision', exact: true })
          .getByLabel('Standard price (BDT)'),
      ).toHaveValue('500.05');
      await expect(
        page.getByRole('region', { name: 'Retained price revisions', exact: true }),
      ).toContainText('unverified');
    } finally {
      await deactivate(page, context, fixture.id);
    }
  });
});
