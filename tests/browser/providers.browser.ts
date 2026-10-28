import { test, expect, type Page } from '@playwright/test';
import { useBrowserSession } from './session-fixture';

async function createProvider(page: Page, suffix: string) {
  const form = page.getByRole('region', { name: 'Add provider', exact: true });
  await form.getByLabel('Stable ID').fill(`provider-${suffix}`);
  await form.getByLabel('Provider name').fill(`Provider ${suffix}`);
  await form.getByLabel('Website', { exact: true }).fill('https://provider.example.test/');
  await form.getByLabel('Primary telephone').fill('01712345678');
  await form.getByLabel('Status').selectOption('1');
  await form.getByRole('button', { name: 'Create provider' }).click();
  await expect(page.getByRole('status')).toContainText('change saved');
}
async function fillBranch(page: Page, suffix: string) {
  const form = page.getByRole('region', { name: 'Add branch', exact: true });
  await form.getByLabel('Stable ID').fill(`branch-${suffix}`);
  await form.getByLabel('Branch name').fill(`Branch ${suffix}`);
  await form
    .getByLabel('Address', { exact: true })
    .fill('Synthetic branch address for isolated testing');
  return form;
}

test('administrator persists provider and branch contacts, coordinates and weekly hours', async ({
  page,
  context,
}) => {
  await useBrowserSession(context, 'admin');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const suffix = crypto.randomUUID();
  const response = await page.goto('/admin/providers');
  expect(response?.headers()['cache-control']).toContain('no-store');
  await page.screenshot({
    path: `.bun-tmp/provider-start-${test.info().project.name}.png`,
    caret: 'initial',
  });
  await createProvider(page, suffix);
  const form = await fillBranch(page, suffix);
  await form.getByLabel('Latitude').fill('91');
  expect(
    await form
      .getByLabel('Latitude')
      .evaluate((element) => element instanceof HTMLInputElement && element.checkValidity()),
  ).toBe(false);
  await form.getByLabel('Latitude').fill('0');
  await form.getByLabel('Longitude').fill('0');
  await form.getByLabel('Sunday', { exact: true }).fill('22:00-02:00');
  await form.getByLabel('Monday', { exact: true }).fill('08:00-12:00, 14:00-18:00');
  await form.getByLabel('Friday', { exact: true }).fill('closed');
  await form.getByRole('button', { name: 'Create branch' }).click();
  await expect(page.getByRole('status')).toContainText('change saved');
  await page.reload();
  const edit = page.getByRole('region', { name: 'Edit branch', exact: true });
  await expect(edit.getByLabel('Status')).toHaveValue('0');
  await expect(edit.getByLabel('Primary telephone')).toHaveValue('');
  await expect(edit.getByLabel('Tuesday', { exact: true })).toHaveValue('');
  await expect(edit.getByLabel('Sunday', { exact: true })).toHaveValue('22:00-02:00');
  await expect(edit.getByLabel('Latitude')).toHaveValue('0');
  await edit.getByLabel('Address', { exact: true }).fill('Corrected synthetic address');
  await edit.getByLabel('Primary telephone').fill('01798765432');
  await edit.getByLabel('Alternative telephone').fill('10606');
  await edit.getByLabel('Website', { exact: true }).fill('https://branch.example.test/');
  await edit.getByLabel('Latitude').fill('23.75');
  await edit.getByLabel('Longitude').fill('90.4');
  await edit.getByRole('button', { name: 'Save branch' }).click();
  const saved = page.getByRole('region', { name: 'Edit branch', exact: true });
  await expect(saved.getByLabel('Address', { exact: true })).toHaveValue(
    'Corrected synthetic address',
  );
  await expect(saved.getByLabel('Alternative telephone')).toHaveValue('10606');
  await expect(saved.getByLabel('Latitude')).toHaveValue('23.75');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (await saved.getByRole('button', { name: 'Save branch' }).boundingBox())?.height,
  ).toBeGreaterThanOrEqual(44);
  await saved.screenshot({
    path: `.bun-tmp/provider-edit-${test.info().project.name}.png`,
    caret: 'initial',
  });
  await saved.locator('fieldset').screenshot({
    path: `.bun-tmp/provider-hours-${test.info().project.name}.png`,
    caret: 'initial',
  });
  const provider = page.getByRole('region', { name: 'Edit provider', exact: true });
  await provider.getByLabel('Status').selectOption('0');
  await provider.getByRole('button', { name: 'Save provider' }).click();
  await expect(
    page.getByRole('region', { name: 'Edit provider', exact: true }).getByLabel('Status'),
  ).toHaveValue('0');
  expect(errors).toEqual([]);
});

test('provider forms and writes reject guests, ordinary users, expired sessions and forged roles', async ({
  page,
  context,
}) => {
  const input = {
    entity: 'provider',
    mode: 'create',
    id: 'forged-provider',
    name: 'Forged provider',
    active: '1',
  };
  expect(
    (
      await context.request.post('/admin/providers/write', {
        form: input,
        headers: { origin: 'http://127.0.0.1:3100', 'x-role': 'administrator' },
      })
    ).status(),
  ).toBe(401);
  await useBrowserSession(context, 'member');
  await page.goto('/admin/providers');
  await expect(page.getByRole('heading', { name: 'Administrator access required' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create provider' })).toHaveCount(0);
  expect(
    (
      await context.request.post('/admin/providers/write', {
        form: input,
        headers: { origin: 'http://127.0.0.1:3100' },
      })
    ).status(),
  ).toBe(403);
  await context.clearCookies();
  await useBrowserSession(context, 'expired');
  await page.goto('/admin/providers');
  await expect(page.getByRole('heading', { name: 'Session expired' })).toBeVisible();
  await context.clearCookies();
  await useBrowserSession(context, 'admin');
  expect((await context.request.get('/admin/providers/write')).status()).toBe(405);
  expect(
    (
      await context.request.post('/admin/providers/write', {
        form: input,
        headers: { origin: 'https://attacker.test' },
      })
    ).status(),
  ).toBe(400);
  const invalid = await context.request.post('/admin/providers/write', {
    form: { ...input, website: 'javascript:alert(1)' },
    maxRedirects: 0,
    headers: { origin: 'http://127.0.0.1:3100' },
  });
  expect(invalid.headers().location).toContain('code=invalid_request');
  await page.goto('/admin/providers?code=__proto__');
  await expect(page.getByRole('heading', { name: 'Manage providers and branches' })).toBeVisible();
});

test('active branch publication requires its provider contact source and confirmation', async ({
  page,
  context,
}) => {
  await useBrowserSession(context, 'admin');
  await page.goto('/admin/providers?provider=addin-medical-college-hospital');
  const form = await fillBranch(page, crypto.randomUUID());
  await form
    .getByLabel('Official contact source', { exact: true })
    .selectOption('addin-contact-20261027');
  await form
    .getByLabel('I checked these branch details against the selected official contact source.')
    .check();
  await form.getByLabel('Status').selectOption('1');
  await form.getByRole('button', { name: 'Create branch' }).click();
  await expect(page.getByRole('status')).toContainText('change saved');
  const edit = page.getByRole('region', { name: 'Edit branch', exact: true });
  await expect(edit.getByLabel('Status')).toHaveValue('1');
  await expect(edit.getByLabel('Official contact source', { exact: true })).toHaveValue(
    'addin-contact-20261027',
  );
  await edit.getByLabel('Status').selectOption('0');
  await edit.getByRole('button', { name: 'Save branch' }).click();
  await expect(
    page.getByRole('region', { name: 'Edit branch', exact: true }).getByLabel('Status'),
  ).toHaveValue('0');
});

test.describe('provider administration without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('native provider and branch forms persist unknown fields without defaults', async ({
    page,
    context,
  }) => {
    await useBrowserSession(context, 'admin');
    const suffix = crypto.randomUUID();
    await page.goto('/admin/providers');
    await createProvider(page, suffix);
    const form = await fillBranch(page, suffix);
    await form.getByRole('button', { name: 'Create branch' }).click();
    await expect(page.getByRole('status')).toContainText('change saved');
    await page.reload();
    const edit = page.getByRole('region', { name: 'Edit branch', exact: true });
    await expect(edit.getByLabel('Latitude')).toHaveValue('');
    await expect(edit.getByLabel('Sunday', { exact: true })).toHaveValue('');
    await expect(edit.getByLabel('Primary telephone')).toHaveValue('');
  });
});
