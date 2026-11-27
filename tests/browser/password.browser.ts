import { test, expect, type Page } from '@playwright/test';
import { useBrowserSession } from './session-fixture';

const strong = 'correct-horse-battery-9';
const changed = 'another-long-secret-7!';
const origin = 'http://127.0.0.1:3100';

function unique(label: string): string {
  return `${label}-${test.info().project.name}-${crypto.randomUUID().slice(0, 8)}@example.test`;
}

async function fillSignUp(page: Page, email: string, password = strong, confirm = password) {
  await page.goto('/sign-up');
  await page.locator('#sign-up-email').fill(email);
  await page.locator('#sign-up-password').fill(password);
  await page.locator('#sign-up-confirm').fill(confirm);
  await page.getByRole('button', { name: 'Create account' }).click();
}

async function fillSignIn(page: Page, email: string, password: string) {
  await page.goto('/sign-in');
  await page.locator('#sign-in-email').fill(email);
  await page.locator('#sign-in-password').fill(password);
  await page.getByRole('button', { name: 'Sign in with email' }).click();
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('password endpoints reject GET and cross-origin POST without caching', async ({ request }) => {
  for (const path of [
    '/auth/password/sign-up',
    '/auth/password/sign-in',
    '/auth/password/change',
  ]) {
    const get = await request.get(path, { maxRedirects: 0 });
    expect(get.status()).toBe(405);
    expect(get.headers().allow).toBe('POST');
    expect(get.headers()['cache-control']).toBe('no-store');
    const cross = await request.post(path, {
      headers: { Origin: 'https://attacker.invalid' },
      form: { email: 'a@example.test', password: strong },
      maxRedirects: 0,
    });
    expect(cross.status()).toBe(403);
    expect(cross.headers()['cache-control']).toBe('no-store');
    expect(cross.headers()['set-cookie']).toBeUndefined();
  }
});

test('a user signs up, signs out, signs in and changes the password', async ({
  page,
  context,
  browser,
}) => {
  const email = unique('member');
  await page.goto('/sign-up');
  await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
  // The rules show before the user types.
  await expect(page.getByText('Use 10 to 128 characters.')).toBeVisible();
  await expectNoOverflow(page);
  await page.screenshot({
    path: `.bun-tmp/sign-up-${test.info().project.name}.png`,
    fullPage: true,
  });

  // Checks in the browser. The page does not leave /sign-up.
  const showPassword = page.getByRole('button', { name: 'Show password', exact: true });
  await expect(showPassword).toBeVisible();
  await page.locator('#sign-up-email').fill(email);
  await page.locator('#sign-up-password').fill('short');
  await page.locator('#sign-up-confirm').fill('short');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/sign-up$/);
  await expect(page.getByText('Use at least 10 characters.')).toBeVisible();
  await expect(page.locator('#sign-up-password')).toBeFocused();
  await expect(page.locator('#sign-up-password')).toHaveAttribute(
    'aria-describedby',
    /sign-up-password-error/,
  );
  await expect(page.locator('#sign-up-password')).toHaveAttribute('aria-invalid', 'true');
  await page.locator('#sign-up-password').fill(strong);
  await expect(page.getByText('Password strength: Strong.')).toBeVisible();
  await page.locator('#sign-up-confirm').fill('different-secret-1');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('The two passwords are not the same.')).toBeVisible();
  await expect(page.locator('#sign-up-confirm')).toBeFocused();

  // Show and hide.
  await showPassword.click();
  await expect(page.locator('#sign-up-password')).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide password', exact: true }).click();
  await expect(page.locator('#sign-up-password')).toHaveAttribute('type', 'password');

  await page.locator('#sign-up-confirm').fill(strong);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await expect(page.getByText('Email and password', { exact: true })).toBeVisible();
  await expectNoOverflow(page);
  await page.screenshot({
    path: `.bun-tmp/account-password-${test.info().project.name}.png`,
    fullPage: true,
  });

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/reason=signed-out/);

  // A wrong password shows one generic message and keeps the user signed out.
  await fillSignIn(page, email, 'wrong-password-12');
  await expect(page).toHaveURL(/\/sign-in\?error=credentials/);
  expect(page.url()).not.toContain('wrong-password');
  await expect(page.getByText('Email or password is incorrect.')).toBeVisible();
  await expect(page.locator('#sign-in-password')).toBeFocused();
  await expect(page.locator('#sign-in-password')).toHaveAttribute(
    'aria-describedby',
    /sign-in-password-error/,
  );
  await expectNoOverflow(page);
  await fillSignIn(page, 'nobody@example.test', strong);
  await expect(page.getByText('Email or password is incorrect.')).toBeVisible();

  // A used email shows the duplicate message next to the email field.
  await fillSignUp(page, email.toUpperCase().replace('@EXAMPLE.TEST', '@example.test'));
  await expect(page).toHaveURL(/\/sign-up\?error=email_in_use/);
  await expect(page.getByText('This email already has an account.')).toBeVisible();
  await expect(page.locator('#sign-up-email')).toHaveAttribute(
    'aria-describedby',
    /sign-up-email-error/,
  );

  await fillSignIn(page, email, strong);
  await expect(page).toHaveURL(/\/account$/);

  // Second browser context with its own session of the same account.
  const second = await browser.newContext({ baseURL: origin });
  const other = await second.newPage();
  await fillSignIn(other, email, strong);
  await expect(other).toHaveURL(/\/account$/);

  // Change password. The form checks the rules first.
  await page.locator('#change-current').fill(strong);
  await page.locator('#change-password').fill('short');
  await page.locator('#change-confirm').fill('short');
  await page.getByRole('button', { name: 'Change password', exact: true }).click();
  await expect(page.getByText('Use at least 10 characters.')).toBeVisible();
  await expect(page.locator('#change-password')).toBeFocused();
  await page.locator('#change-current').fill('not-the-current-1');
  await page.locator('#change-password').fill(changed);
  await page.locator('#change-confirm').fill(changed);
  await page.getByRole('button', { name: 'Change password', exact: true }).click();
  await expect(page).toHaveURL(/\/account\?error=current_incorrect/);
  await expect(page.getByText('The current password is incorrect.')).toBeVisible();
  await expect(page.locator('#change-current')).toBeFocused();
  await page.locator('#change-current').fill(strong);
  await page.locator('#change-password').fill(changed);
  await page.locator('#change-confirm').fill(changed);
  await page.getByRole('button', { name: 'Change password', exact: true }).click();
  await expect(page).toHaveURL(/\/account\?changed=1/);
  await expect(page.getByText('Your password is changed.')).toBeVisible();
  expect(page.url()).not.toContain(changed);

  // The other session is signed out. This session stays.
  await other.goto('/account');
  await expect(other.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  await second.close();
  await page.goto('/account');
  await expect(page.getByText(email, { exact: true })).toBeVisible();

  await context.clearCookies();
  await fillSignIn(page, email, strong);
  await expect(page.getByText('Email or password is incorrect.')).toBeVisible();
  await fillSignIn(page, email, changed);
  await expect(page).toHaveURL(/\/account$/);
});

test('a password user writes a review', async ({ page, context }) => {
  const email = unique('reviewer');
  await fillSignUp(page, email);
  await expect(page).toHaveURL(/\/account$/);
  await page.goto('/reviews?listing=addin-moghbazar-complete-blood-count');
  const form = page.locator('form[action="/reviews/write"]');
  for (const name of [
    'Service quality',
    'Staff behavior',
    'Waiting time',
    'Cleanliness',
    'Value',
    'Report-delivery experience',
  ])
    await form.getByRole('combobox', { name, exact: true }).selectOption('3');
  const text = `Password account review ${test.info().project.name}`;
  await form.getByLabel('Written review, optional').fill(text);
  await form.getByRole('button', { name: 'Save review' }).click();
  await expect(
    page.getByRole('region', { name: 'Published reviews' }).getByText(text, { exact: true }),
  ).toBeVisible();
  await page.getByText('Report this review', { exact: true }).first().click();
  const report = page.locator('form[action="/reviews/report"]').first();
  const reviewId = await report.locator('input[name="review"]').inputValue();
  await report
    .getByLabel('Reason', { exact: true })
    .fill('Synthetic report so that the moderation test can hide this review.');
  await report.getByRole('button', { name: 'Report review', exact: true }).click();
  await expect(page.getByText('Review report saved for administrator review.')).toBeVisible();

  // Hide the review again. The other review tests count the visible reviews of this listing.
  await useBrowserSession(context, 'admin');
  await page.goto('/admin/reviews');
  const article = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: reviewId, exact: true }) });
  await article.getByRole('combobox', { name: 'Action', exact: true }).selectOption('hide');
  await article
    .getByLabel('Reason', { exact: true })
    .fill('Synthetic moderation reason to restore the review count.');
  await article.getByRole('button', { name: 'Save moderation decision' }).click();
  await expect(
    page
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { name: reviewId, exact: true }) }),
  ).toContainText('hidden');
});

test.describe('password accounts without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('sign-up, sign-out, sign-in and change-password work with ordinary forms', async ({
    page,
    context,
  }) => {
    const email = unique('nojs');
    await page.goto('/sign-up');
    await expect(page.getByText('Use 10 to 128 characters.')).toBeVisible();
    // No show and hide button without JavaScript.
    await expect(page.getByRole('button', { name: /^Show / })).toHaveCount(0);

    // The server shows the error next to the field. The browser focuses it.
    await fillSignUp(page, email, 'short');
    await expect(page).toHaveURL(/\/sign-up\?error=too_short/);
    await expect(page.getByText('Use at least 10 characters.')).toBeVisible();
    await expect(page.locator('#sign-up-password')).toBeFocused();
    expect(page.url()).not.toContain('password=');
    await fillSignUp(page, email, strong, 'different-secret-1');
    await expect(page).toHaveURL(/\/sign-up\?error=mismatch/);
    await expect(page.getByText('The two passwords are not the same.')).toBeVisible();
    await fillSignUp(page, 'not-an-email');
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();

    await fillSignUp(page, email);
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByText(email, { exact: true })).toBeVisible();
    await expect(page.getByText('Email and password', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/reason=signed-out/);

    await fillSignUp(page, email);
    await expect(page).toHaveURL(/\/sign-up\?error=email_in_use/);
    await expect(page.getByText('This email already has an account.')).toBeVisible();

    await fillSignIn(page, email, 'wrong-password-12');
    await expect(page).toHaveURL(/\/sign-in\?error=credentials/);
    await expect(page.getByText('Email or password is incorrect.')).toBeVisible();
    await expect(page.locator('#sign-in-password')).toBeFocused();
    await fillSignIn(page, email, strong);
    await expect(page).toHaveURL(/\/account$/);

    const change = async (current: string, next: string, confirm = next) => {
      await page.locator('#change-current').fill(current);
      await page.locator('#change-password').fill(next);
      await page.locator('#change-confirm').fill(confirm);
      await page.getByRole('button', { name: 'Change password', exact: true }).click();
    };
    await change('not-the-current-1', changed);
    await expect(page).toHaveURL(/\/account\?error=current_incorrect/);
    await expect(page.getByText('The current password is incorrect.')).toBeVisible();
    await change(strong, 'password123');
    await expect(
      page.getByText('This password is too common. Choose a different one.'),
    ).toBeVisible();
    await change(strong, changed);
    await expect(page).toHaveURL(/\/account\?changed=1/);
    await expect(page.getByText('Your password is changed.')).toBeVisible();

    await context.clearCookies();
    await fillSignIn(page, email, strong);
    await expect(page.getByText('Email or password is incorrect.')).toBeVisible();
    await fillSignIn(page, email, changed);
    await expect(page).toHaveURL(/\/account$/);
  });
});
