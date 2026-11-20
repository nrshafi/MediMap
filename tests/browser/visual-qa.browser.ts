import { test, expect } from '@playwright/test';

const publicRoutes = [
  { name: 'Home', path: '/' },
  { name: 'Find services', path: '/find' },
  { name: 'Compare', path: '/compare' },
  { name: 'Service detail', path: '/services/complete-blood-count' },
  { name: 'Branch detail', path: '/branches/addin-moghbazar' },
  { name: 'Reviews', path: '/reviews' },
  { name: 'Report', path: '/report' },
  { name: 'Sign in', path: '/sign-in' },
  { name: 'Account', path: '/account' },
  { name: 'Discovery', path: '/discovery' },
];

for (const route of publicRoutes) {
  test(`public route "${route.name}" (${route.path}) has no horizontal scroll, one h1, and accessible images/buttons`, async ({
    page,
  }) => {
    await page.goto(route.path);
    await page.waitForLoadState('domcontentloaded');

    // 1. Verify no horizontal scroll
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);

    // 2. Verify exactly one h1
    const h1Elements = page.locator('h1');
    await expect(h1Elements).toHaveCount(1);
    await expect(h1Elements.first()).toBeVisible();

    // 3. Verify every image has an accessible name or is presentation/hidden
    const images = page.locator('img');
    const imageCount = await images.count();
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const isHidden = await img.getAttribute('aria-hidden');
      const role = await img.getAttribute('role');
      const alt = await img.getAttribute('alt');
      if (isHidden !== 'true' && role !== 'presentation') {
        expect(alt, `Image #${i} on ${route.path} missing alt text`).not.toBeNull();
      }
    }

    // 4. Verify every button has an accessible name
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    for (let i = 0; i < buttonCount; i++) {
      const btn = buttons.nth(i);
      const isVisible = await btn.isVisible();
      if (!isVisible) continue;

      const accessibleName = await btn.evaluate((el) => {
        return (
          el.getAttribute('aria-label')?.trim() ||
          el.getAttribute('aria-labelledby')?.trim() ||
          el.textContent?.trim() ||
          el.getAttribute('title')?.trim() ||
          ''
        );
      });
      expect(
        accessibleName.length,
        `Button #${i} on ${route.path} missing accessible name`,
      ).toBeGreaterThan(0);
    }
  });
}

test('unknown URL returns HTTP 404 and displays not-found page with one h1', async ({ page }) => {
  const response = await page.goto('/unknown-nonexistent-route-for-testing-404');
  expect(response?.status()).toBe(404);

  // Verify exactly one h1
  const h1Elements = page.locator('h1');
  await expect(h1Elements).toHaveCount(1);
  await expect(h1Elements.first()).toHaveText('Page not found');

  // Verify recovery links to home and find
  const homeLink = page.getByRole('link', { name: /return to home|home/i });
  await expect(homeLink.first()).toBeVisible();

  const findLink = page.getByRole('link', { name: /find diagnostic services|find services/i });
  await expect(findLink.first()).toBeVisible();
});
