import { test, expect, type Page } from '@playwright/test';
import { useBrowserSession } from './session-fixture';

async function createService(page: Page, suffix: string) {
  const category = page.getByRole('region', { name: 'Add category', exact: true });
  await category.getByLabel('Stable ID').fill(`category-${suffix}`);
  await category.getByLabel('Name', { exact: true }).fill(`Category ${suffix}`);
  await category.getByRole('button', { name: 'Create category' }).click();
  await expect(page.getByRole('status')).toContainText('Catalog change saved.');
  const service = page.getByRole('region', { name: 'Add canonical service', exact: true });
  await service.getByLabel('Stable ID').fill(`service-${suffix}`);
  await service.getByLabel('Name', { exact: true }).fill(`Diagnostic service ${suffix}`);
  await service.getByLabel('Category', { exact: true }).selectOption(`category-${suffix}`);
  await service.getByRole('button', { name: 'Create service' }).click();
  await expect(page.getByRole('status')).toContainText('Catalog change saved.');
}

test('administrator creates, corrects and deactivates catalog data through persisted reads', async ({
  page,
  context,
}) => {
  await useBrowserSession(context, 'admin');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const suffix = crypto.randomUUID();
  const response = await page.goto('/admin/catalog/manage');
  expect(response?.headers()['cache-control']).toContain('no-store');
  await expect(page.getByRole('heading', { name: 'Manage diagnostic catalog' })).toBeVisible();
  await page.screenshot({
    path: `.bun-tmp/catalog-management-start-${test.info().project.name}.png`,
  });
  await createService(page, suffix);
  const alias = page.getByRole('region', { name: 'Add alias', exact: true });
  await alias.getByLabel('Stable ID').fill(`alias-${suffix}`);
  await alias.getByLabel('Alias text').fill(`Alias ${suffix}`);
  await alias.getByRole('button', { name: 'Create alias' }).click();
  await page.reload();
  const existing = page.getByRole('region', { name: `Edit alias Alias ${suffix}` });
  await expect(existing.getByLabel('Alias text')).toHaveValue(`Alias ${suffix}`);
  await existing.getByLabel('Alias text').fill(`Corrected alias ${suffix}`);
  await existing.getByLabel('This correction keeps the same diagnostic meaning.').check();
  await existing.getByRole('button', { name: 'Save alias' }).click();
  const bangla = page.getByRole('region', { name: 'Add alias', exact: true });
  await bangla.getByLabel('Stable ID').fill(`bangla-${suffix}`);
  await bangla.getByLabel('Alias text').fill(`সেবা ${suffix}`);
  await bangla.getByLabel('Language').selectOption('bn');
  await bangla.getByRole('button', { name: 'Create alias' }).click();
  const edit = page.getByRole('region', { name: 'Edit service', exact: true });
  await expect(edit.getByLabel('Name', { exact: true })).toHaveValue(
    `Diagnostic service ${suffix}`,
  );
  for (const control of [
    edit.getByLabel('Name', { exact: true }),
    edit.getByRole('button', { name: 'Save service' }),
  ]) {
    expect((await control.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `.bun-tmp/catalog-management-${test.info().project.name}.png`,
    fullPage: true,
  });
  await edit.screenshot({
    path: `.bun-tmp/catalog-management-editor-${test.info().project.name}.png`,
  });
  await page.getByRole('link', { name: 'Inspect published service' }).click();
  const selected = page.getByRole('region', { name: 'Selected catalog record' });
  await expect(selected).toContainText(`Corrected alias ${suffix}`);
  await expect(selected).toContainText(`সেবা ${suffix}`);
  await expect(page.getByRole('heading', { name: 'No published listings' })).toBeVisible();
  await page.goto(`/admin/catalog/manage?service=service-${suffix}`);
  const correction = page.getByRole('region', { name: 'Edit service', exact: true });
  await correction.getByLabel('Name', { exact: true }).fill(`Corrected service ${suffix}`);
  await correction.getByLabel('Status').selectOption('0');
  await correction.getByLabel('This correction keeps the same diagnostic meaning.').check();
  await correction.getByRole('button', { name: 'Save service' }).click();
  await expect(
    page.getByRole('region', { name: 'Edit service', exact: true }).getByLabel('Status'),
  ).toHaveValue('0');
  await page.getByRole('link', { name: 'Inspect published service' }).click();
  await expect(page.getByRole('region', { name: 'Selected catalog record' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('write endpoint rejects guests, members, cross-origin requests and GET', async ({
  page,
  context,
}) => {
  const input = {
    entity: 'category',
    mode: 'create',
    id: 'unauthorized',
    name: 'Unauthorized',
    active: '1',
  };
  const response = await context.request.post('/admin/catalog/write', {
    form: input,
    headers: { origin: 'http://127.0.0.1:3100', 'x-role': 'administrator' },
  });
  expect(response.status()).toBe(401);
  await useBrowserSession(context, 'member');
  await page.goto('/admin/catalog/manage');
  await expect(page.getByRole('heading', { name: 'Administrator access required' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create service' })).toHaveCount(0);
  expect(
    (
      await context.request.post('/admin/catalog/write', {
        form: input,
        headers: { origin: 'http://127.0.0.1:3100' },
      })
    ).status(),
  ).toBe(403);
  await context.clearCookies();
  await useBrowserSession(context, 'admin');
  expect(
    (
      await context.request.post('/admin/catalog/write', {
        form: input,
        headers: { origin: 'https://attacker.test' },
      })
    ).status(),
  ).toBe(400);
  expect((await context.request.get('/admin/catalog/write')).status()).toBe(405);
  await page.goto('/admin/catalog/manage?code=__proto__');
  await expect(page.getByRole('heading', { name: 'Manage diagnostic catalog' })).toBeVisible();
});

test('duplicate errors and outdated forms preserve the current stored record', async ({
  page,
  context,
}) => {
  await useBrowserSession(context, 'admin');
  const suffix = crypto.randomUUID();
  await page.goto('/admin/catalog/manage');
  await createService(page, suffix);
  const edit = page.getByRole('region', { name: 'Edit service', exact: true });
  const revision = await edit.locator('input[name=revision]').inputValue();
  const input = {
    entity: 'service',
    mode: 'update',
    id: `service-${suffix}`,
    name: `Updated ${suffix}`,
    categoryId: `category-${suffix}`,
    active: '1',
    revision,
    confirm: 'yes',
  };
  const response = await context.request.post('/admin/catalog/write', {
    form: input,
    maxRedirects: 0,
    headers: { origin: 'http://127.0.0.1:3100' },
  });
  expect(response.headers().location).toContain('code=saved');
  await edit.getByLabel('This correction keeps the same diagnostic meaning.').check();
  await edit.getByRole('button', { name: 'Save service' }).click();
  await expect(page.getByRole('alert')).toContainText('This record changed');
  await expect(
    page
      .getByRole('region', { name: 'Edit service', exact: true })
      .getByLabel('Name', { exact: true }),
  ).toHaveValue(`Updated ${suffix}`);
  const add = page.getByRole('region', { name: 'Add canonical service', exact: true });
  await add.getByLabel('Stable ID').fill(`duplicate-${suffix}`);
  await add.getByLabel('Name', { exact: true }).fill(`UPDATED ${suffix}`);
  await add.getByLabel('Category', { exact: true }).selectOption(`category-${suffix}`);
  await add.getByRole('button', { name: 'Create service' }).click();
  await expect(page.getByRole('alert')).toContainText('already reserved');
});

test.describe('catalog administration without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('native forms persist a service and its alias', async ({ page, context }) => {
    await useBrowserSession(context, 'admin');
    const suffix = crypto.randomUUID();
    await page.goto('/admin/catalog/manage');
    await createService(page, suffix);
    const alias = page.getByRole('region', { name: 'Add alias', exact: true });
    await alias.getByLabel('Stable ID').fill(`alias-${suffix}`);
    await alias.getByLabel('Alias text').fill(`No script alias ${suffix}`);
    await alias.getByRole('button', { name: 'Create alias' }).click();
    await page.getByRole('link', { name: 'Inspect published service' }).click();
    await expect(page.getByRole('region', { name: 'Selected catalog record' })).toContainText(
      `No script alias ${suffix}`,
    );
  });
});
