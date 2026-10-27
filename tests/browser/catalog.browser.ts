import { test, expect } from '@playwright/test';

test('catalog inspector reads reviewed D1 data and preserves unknown metadata', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await page.goto('/admin/catalog');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Catalog inspector', exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Complete Blood Count', exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('dd').filter({ hasText: 'Ad-din Medical College Hospital' }),
  ).toBeVisible();
  await expect(page.getByText('Provider label: CBC', { exact: true })).toBeVisible();
  await expect(page.locator('.catalog-price')).toContainText('400');
  await expect(page.getByText('Verified on official website', { exact: true })).toBeVisible();
  await expect(page.getByText('27 October 2026', { exact: true })).toBeVisible();
  await expect(page.getByText('23 February 2026', { exact: true })).toBeVisible();
  await expect(page.locator('dd').filter({ hasText: /^Unknown$/ })).toHaveCount(4);
  await expect(page.getByRole('link', { name: 'Official tariff · row 1' })).toHaveAttribute(
    'href',
    'https://awmch.addinhospital.org/hematology-service-charge',
  );
  await expect(page.getByRole('link', { name: 'Official branch contact page' })).toHaveAttribute(
    'href',
    'https://awmch.addinhospital.org/contact/',
  );
  await expect(page.getByText(/sample price/i)).toHaveCount(0);
  await page.getByLabel('Canonical service').selectOption('complete-blood-count');
  await page.getByRole('button', { name: 'Apply service' }).click();
  await expect(page).toHaveURL(/service=complete-blood-count/);
  await page.reload();
  await expect(page.getByLabel('Canonical service')).toHaveValue('complete-blood-count');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  for (const control of [
    page.getByLabel('Canonical service'),
    page.getByRole('button', { name: 'Apply service' }),
  ]) {
    const box = await control.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByLabel('Canonical service').focus();
  expect(
    await page
      .getByLabel('Canonical service')
      .evaluate((element) => getComputedStyle(element).outlineStyle),
  ).not.toBe('none');
  await page.screenshot({
    path: `.bun-tmp/catalog-${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test('catalog inspector has empty and invalid-request states', async ({ page }) => {
  await page.goto('/admin/catalog?service=unlisted-service');
  await expect(page.getByRole('heading', { name: 'No published listings' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
  await page.getByRole('link', { name: 'Show all services' }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.goto('/admin/catalog?service=%27%20OR%201%3D1');
  await expect(page.getByRole('alert')).toContainText('Invalid catalog request');
  await expect(page.getByRole('article')).toHaveCount(0);
  await page.getByRole('link', { name: 'Reload catalog' }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
});

test.describe('server-rendered catalog', () => {
  test.use({ javaScriptEnabled: false });

  test('service filtering works without JavaScript', async ({ page }) => {
    await page.goto('/admin/catalog');
    await page.getByLabel('Canonical service').selectOption('complete-blood-count');
    await page.getByRole('button', { name: 'Apply service' }).click();
    await expect(page).toHaveURL(/service=complete-blood-count/);
    await expect(page.getByRole('article')).toHaveCount(1);
    await page.getByLabel('Canonical service').selectOption('');
    await page.getByRole('button', { name: 'Apply service' }).click();
    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});
