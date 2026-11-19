import { test, expect } from '@playwright/test';

test('header navigation and aria-current are visible on desktop', async ({ page }) => {
  if (test.info().project.name === 'mobile') {
    test.skip();
  }

  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Site' });
  await expect(nav).toBeVisible();

  const findLink = nav.getByRole('link', { name: 'Find services' });
  const compareLink = nav.getByRole('link', { name: 'Compare' });
  const accountLink = nav.getByRole('link', { name: 'Account' });

  await expect(findLink).toBeVisible();
  await expect(compareLink).toBeVisible();
  await expect(accountLink).toBeVisible();

  // Navigate to find
  await findLink.click();
  await expect(page).toHaveURL(/\/find/);
  await expect(
    page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Find services' }),
  ).toHaveAttribute('aria-current', 'page');

  // Navigate to compare
  await page
    .getByRole('navigation', { name: 'Site' })
    .getByRole('link', { name: 'Compare' })
    .click();
  await expect(page).toHaveURL(/\/compare/);
  await expect(
    page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Compare' }),
  ).toHaveAttribute('aria-current', 'page');
});

test('mobile menu opens, closes with Escape, returns focus, and has no horizontal scroll', async ({
  page,
}) => {
  if (test.info().project.name !== 'mobile') {
    test.skip();
  }

  await page.goto('/');

  const menuButton = page.getByRole('button', { name: /navigation menu/i });
  await expect(menuButton).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Site' })).toBeHidden();

  // Open mobile menu
  await menuButton.click();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true');

  const mobilePanel = page.getByRole('region', { name: 'Mobile navigation' });
  await expect(mobilePanel).toBeVisible();

  const findLink = mobilePanel.getByRole('link', { name: 'Find services' });
  const compareLink = mobilePanel.getByRole('link', { name: 'Compare' });
  const accountLink = mobilePanel.getByRole('link', { name: 'Account' });

  await expect(findLink).toBeVisible();
  await expect(compareLink).toBeVisible();
  await expect(accountLink).toBeVisible();

  // Press Escape and verify menu closes and focus returns to menu button
  await page.keyboard.press('Escape');
  await expect(mobilePanel).toBeHidden();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  await expect(menuButton).toBeFocused();

  // Open again and click Find services
  await menuButton.click();
  await expect(mobilePanel).toBeVisible();
  await findLink.click();
  await expect(page).toHaveURL(/\/find/);

  // Check that the page has no horizontal scroll at 375 px
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('footer renders emergency statement and Google terms links', async ({ page }) => {
  await page.goto('/');
  const footer = page.locator('footer');
  await expect(footer).toBeVisible();
  await expect(footer).toContainText(
    'MediMap is not for emergencies and does not give medical advice.',
  );
  await expect(
    footer.getByRole('link', { name: 'Google Maps End User Additional Terms' }),
  ).toBeVisible();
  await expect(footer.getByRole('link', { name: 'Google Privacy Policy' })).toBeVisible();

  // Verify no horizontal overflow
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
