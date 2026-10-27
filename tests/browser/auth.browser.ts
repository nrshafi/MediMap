import { test, expect } from '@playwright/test';
import { useBrowserSession } from './session-fixture';

test('anonymous account pages explain Google setup and public discovery remains accessible', async ({
  page,
}) => {
  const response = await page.goto('/sign-in');
  expect(response?.headers()['cache-control']).toContain('no-store');
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeDisabled();
  await expect(
    page.getByText('Google sign-in is not configured yet. Public browsing is available.'),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'MediMap', exact: true })).toBeInViewport();
  await page.screenshot({
    path: `.bun-tmp/sign-in-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('link', { name: 'Browse services' }).click();
  await expect(page).toHaveURL(/\/discovery/);
  await expect(page.getByRole('combobox', { name: 'Search diagnostic tests' })).toBeVisible();
});

test('anonymous and forged-role requests cannot see the administration catalog', async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: 'role', value: 'administrator', domain: '127.0.0.1', path: '/' },
  ]);
  const response = await page.goto('/admin/catalog');
  expect(response?.headers()['cache-control']).toContain('no-store');
  await expect(page.getByRole('heading', { name: 'Sign in to continue' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
  expect(await response?.text()).not.toContain('Ad-din Medical College Hospital');
  await page.getByRole('link', { name: 'Sign in with Google' }).click();
  await expect(page).toHaveURL(/returnTo=%2Fadmin%2Fcatalog/);
});

test('ordinary members and expired sessions are denied on the server', async ({
  page,
  context,
}) => {
  await useBrowserSession(context, 'member');
  await page.goto('/admin/catalog');
  await expect(page.getByRole('heading', { name: 'Administrator access required' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
  await context.clearCookies();
  await useBrowserSession(context, 'expired');
  await page.goto('/admin/catalog');
  await expect(page.getByRole('heading', { name: 'Session expired' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
});

test('account sign-out revokes the session and the account layout fits mobile', async ({
  page,
  context,
}) => {
  await useBrowserSession(
    context,
    test.info().project.name === 'mobile' ? 'signout-mobile' : 'signout-desktop',
  );
  await page.goto('/account');
  await expect(page.getByText('member@example.test', { exact: true })).toBeVisible();
  await expect(page.getByText('Member', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (await page.getByRole('button', { name: 'Sign out' }).boundingBox())?.height,
  ).toBeGreaterThanOrEqual(44);
  await page.screenshot({
    path: `.bun-tmp/account-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/reason=signed-out/);
  await expect(page.getByText('You are signed out.', { exact: true })).toBeVisible();
  await page.goto('/account');
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
});

test('callback failures and rejected cross-origin state changes disclose no credentials', async ({
  page,
  request,
}) => {
  await page.goto('/auth/google/callback?code=invalid&state=invalid');
  await expect(page).toHaveURL(/reason=failed/);
  await expect(page.getByText('Google sign-in did not complete. Try again.')).toBeVisible();
  const rejected = await request.post('/auth/sign-out', {
    headers: { Origin: 'https://attacker.invalid' },
    maxRedirects: 0,
  });
  expect(rejected.status()).toBe(403);
  const getSignOut = await request.get('/auth/sign-out', { maxRedirects: 0 });
  expect(getSignOut.status()).toBe(405);
});

test.describe('account access without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('sign-out revokes the session through an ordinary POST form', async ({ page, context }) => {
    await useBrowserSession(
      context,
      test.info().project.name === 'mobile' ? 'signout-nojs-mobile' : 'signout-nojs-desktop',
    );
    await page.goto('/account');
    await expect(page.getByText('member@example.test', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/reason=signed-out/);
    await page.goto('/account');
    await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  });
});
