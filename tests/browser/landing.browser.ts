import { test, expect } from '@playwright/test';

test('landing page renders all required sections with real catalog data', async ({ page }) => {
  await page.goto('/');

  // 1. Hero
  const heroHeading = page.getByRole('heading', {
    name: /Find the test\.\s*Know the published price\./,
  });
  await expect(heroHeading).toBeVisible();

  // Search box works and submits
  const searchInput = page.getByLabel('Service name or abbreviation');
  await expect(searchInput).toBeVisible();
  await searchInput.fill('CBC');
  await page.getByRole('button', { name: 'Search services' }).click();
  await expect(page).toHaveURL(/\/find\?.*q=CBC/);

  // Return to home
  await page.goto('/');

  // 2. How it works
  await expect(page.getByRole('heading', { name: 'How it works' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Search a test' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Choose your area' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Compare verified prices' })).toBeVisible();

  // 3. Popular services from D1
  const popularHeading = page.getByRole('heading', { name: 'Popular services' });
  await expect(popularHeading).toBeVisible();

  // Popular service cards link to /find?service=<id> without prices
  const popularSection = page.getByRole('region', { name: 'Popular services' });
  const serviceLinks = popularSection.getByRole('link', { name: /^Find/ });
  await expect(serviceLinks.first()).toBeVisible();
  const count = await serviceLinks.count();
  expect(count).toBeGreaterThanOrEqual(1);
  expect(count).toBeLessThanOrEqual(8);
  await expect(popularSection).not.toContainText('BDT');
  await expect(popularSection).not.toContainText('From');

  // Verify first popular service card links to /find?service=
  const firstServiceHref = await serviceLinks.first().getAttribute('href');
  expect(firstServiceHref).toMatch(/\/find\?service=/);

  // 4. Why you can trust the prices
  await expect(page.getByRole('heading', { name: 'Why you can trust the prices' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Official price sources' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recorded review dates' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Community dispute reporting' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Report incorrect data' })).toHaveAttribute(
    'href',
    '/report',
  );

  // 5. Hospitals covered
  await expect(page.getByRole('heading', { name: 'Hospitals covered' })).toBeVisible();
  await expect(page.getByText('Hospitals with published prices in MediMap')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Ad-din Medical College Hospital' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Moghbazar' })).toHaveAttribute(
    'href',
    '/branches/addin-moghbazar',
  );

  // 6. Final call to action
  const ctaSection = page.getByRole('region', { name: 'Find diagnostic services' });
  await expect(ctaSection).toBeVisible();
  const ctaLink = ctaSection.getByRole('link', { name: 'Find services' });
  await expect(ctaLink).toHaveAttribute('href', '/find');

  // Verify no horizontal overflow at any width
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('popular service cards navigate to /find with service parameter', async ({ page }) => {
  await page.goto('/');

  const popularSection = page.getByRole('region', { name: 'Popular services' });
  const firstLink = popularSection.getByRole('link', { name: /^Find/ }).first();
  const targetHref = await firstLink.getAttribute('href');
  expect(targetHref).toBeTruthy();

  await firstLink.click();
  await expect(page).toHaveURL(new RegExp(targetHref!.replace('?', '\\?')));
  await expect(page.getByRole('heading', { name: 'Find a diagnostic service' })).toBeVisible();

  // No horizontal scroll on destination
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
