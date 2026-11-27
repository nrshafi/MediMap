import { test, expect, type Page } from '@playwright/test';
import { useBrowserSession } from './session-fixture';

const strong = 'correct-horse-battery-9';
const origin = 'http://127.0.0.1:3100';
const reason = 'The account sent abusive messages to other users.';

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('guests and ordinary members cannot open or post to account administration', async ({
  page,
  context,
  request,
}) => {
  await page.goto('/admin/accounts');
  await expect(page.getByRole('heading', { name: 'Accounts unavailable' })).toBeVisible();
  await useBrowserSession(context, 'member');
  await page.goto('/admin/accounts');
  await expect(page.getByRole('heading', { name: 'Accounts unavailable' })).toBeVisible();
  const get = await request.get('/admin/accounts/write', { maxRedirects: 0 });
  expect(get.status()).toBe(405);
  const post = await request.post('/admin/accounts/write', {
    headers: { Origin: origin },
    form: { account: 'x', action: 'disable', reason, confirm: 'yes' },
    maxRedirects: 0,
  });
  expect(post.status()).toBe(400);
});

test('an administrator disables and enables an account', async ({ page, context, browser }) => {
  const email = `managed-${test.info().project.name}-${crypto.randomUUID().slice(0, 8)}@example.test`;
  const userContext = await browser.newContext({ baseURL: origin });
  const user = await userContext.newPage();
  try {
    await user.goto('/sign-up');
    await user.locator('#sign-up-email').fill(email);
    await user.locator('#sign-up-password').fill(strong);
    await user.locator('#sign-up-confirm').fill(strong);
    await user.getByRole('button', { name: 'Create account' }).click();
    await expect(user).toHaveURL(/\/account$/);

    await useBrowserSession(context, 'admin');
    await page.goto('/admin/accounts');
    await expect(page.getByRole('heading', { name: 'Accounts', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Accounts', exact: true })).toBeVisible();
    // The administrator row has no disable form.
    await expect(page.getByText('You cannot disable it.')).toBeVisible();
    await expectNoOverflow(page);
    await page.screenshot({
      path: `.bun-tmp/admin-accounts-${test.info().project.name}.png`,
      fullPage: true,
    });

    await page.getByLabel('Search by email').fill(email.toUpperCase());
    await page.getByRole('button', { name: 'Search' }).click();
    const card = page.getByRole('article').filter({ hasText: email });
    await expect(card).toHaveCount(1);
    await expect(card.getByText('Email and password')).toBeVisible();
    await expect(card.getByText('Active', { exact: true })).toBeVisible();
    expect(await page.content()).not.toMatch(/pbkdf2/i);

    // The form needs a reason and the confirmation.
    await card.getByText('Disable account', { exact: true }).first().click();
    await card.getByRole('button', { name: 'Disable account' }).click();
    await expect(page).toHaveURL(/\/admin\/accounts\?query=/);
    await card.getByLabel('Reason').fill(reason);
    await card.getByLabel(/I confirm that I want to disable/).check();
    await expectNoOverflow(page);
    await card.getByRole('button', { name: 'Disable account' }).click();
    await expect(page).toHaveURL(/result=disabled/);
    await expect(
      page.getByText('The account is disabled. Its sessions are deleted.'),
    ).toBeVisible();
    await page.getByLabel('Search by email').fill(email);
    await page.getByRole('button', { name: 'Search' }).click();
    const disabled = page.getByRole('article').filter({ hasText: email });
    await expect(disabled.getByText('Disabled', { exact: true })).toBeVisible();

    // The user lost the session and cannot sign in.
    await user.goto('/account');
    await expect(user.getByRole('heading', { name: 'Sign in' }).first()).toBeVisible();
    await user.goto('/sign-in');
    await user.locator('#sign-in-email').fill(email);
    await user.locator('#sign-in-password').fill(strong);
    await user.getByRole('button', { name: 'Sign in with email' }).click();
    await expect(user.getByText('This account cannot sign in.')).toBeVisible();

    // Enabling restores sign-in.
    await disabled.getByText('Enable account', { exact: true }).first().click();
    await disabled.getByLabel('Reason').fill(reason);
    await disabled.getByLabel(/I confirm that I want to enable/).check();
    await disabled.getByRole('button', { name: 'Enable account' }).click();
    await expect(page).toHaveURL(/result=enabled/);
    await user.goto('/sign-in');
    await user.locator('#sign-in-email').fill(email);
    await user.locator('#sign-in-password').fill(strong);
    await user.getByRole('button', { name: 'Sign in with email' }).click();
    await expect(user).toHaveURL(/\/account$/);
  } finally {
    await userContext.close();
  }
});
