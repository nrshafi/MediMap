import { test, expect } from '@playwright/test';
import { useBrowserSession } from './session-fixture';

test('full public user flow from home search to comparison, branch details, reviews, and report', async ({
  page,
  context,
}) => {
  const mobile = test.info().project.name === 'mobile';
  const suffix = crypto.randomUUID().slice(0, 8);
  const secondBranchId = `flow-branch-${suffix}`;
  const secondListingId = `flow-listing-${suffix}`;

  // Seed a temporary second CBC branch listing so comparison has two active listings
  // even when browser-server.ts runs with only the single-listing foundation seed.
  await useBrowserSession(context, 'admin');
  const branchResponse = await context.request.post('/admin/providers/write', {
    headers: { origin: 'http://127.0.0.1:3100' },
    maxRedirects: 0,
    form: {
      entity: 'branch',
      mode: 'create',
      id: secondBranchId,
      providerId: 'addin-medical-college-hospital',
      name: `Flow Branch ${suffix}`,
      address: '10 Eskaton Road, Dhaka 1000',
      latitude: '23.7460',
      longitude: '90.4000',
      active: '1',
      contactSourceId: 'addin-contact-20261027',
      confirmContact: 'yes',
    },
  });
  expect(branchResponse.headers().location).toContain('code=saved');

  const listingResponse = await context.request.post('/admin/prices/write', {
    headers: { origin: 'http://127.0.0.1:3100' },
    maxRedirects: 0,
    form: {
      entity: 'listing',
      mode: 'create',
      id: secondListingId,
      branchId: secondBranchId,
      serviceId: 'complete-blood-count',
      providerServiceName: 'CBC',
      active: '1',
      confirmMapping: 'yes',
    },
  });
  expect(listingResponse.headers().location).toContain('code=saved');

  try {
    await context.clearCookies();

    // Success criteria 1 & 10: Search for "CBC" resolves to Complete Blood Count on desktop and mobile.
    await page.goto('/');
    await page.getByLabel('Service name or abbreviation').fill('CBC');
    await page.getByRole('button', { name: 'Search services' }).click();
    await expect(page).toHaveURL(/\/find\?.*q=CBC/);
    await page
      .getByRole('region', { name: 'Service suggestions' })
      .getByRole('link', { name: 'Complete Blood Count', exact: true })
      .click();

    // Success criteria 2, 3 & 9: Default 10 km radius shows seeded listings with base prices and verification info.
    await expect(page.getByRole('button', { name: '10 km', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const listingsRegion = page.getByRole('region', { name: 'Published listings' });
    await expect(listingsRegion).toContainText('BDT 400.00');
    await expect(listingsRegion).toContainText('Verified');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );

    // Success criteria 8 & 9: Open listing panel, request driving route (fails gracefully without key), check Google Maps link.
    await listingsRegion
      .getByRole('button', { name: /Ad-din Medical College Hospital, Moghbazar/ })
      .click();
    const panel = page.getByRole('region', { name: 'Listing details' });
    await expect(panel).toBeVisible();
    await panel.getByRole('button', { name: 'Show route' }).click();
    await expect(panel.getByRole('status')).toContainText(/unavailable|failed/);
    await expect(
      panel.getByRole('link', { name: 'Open directions in Google Maps' }),
    ).toHaveAttribute('href', /^https:\/\/www\.google\.com\/maps\/dir\//);
    await panel.getByRole('button', { name: 'Close listing details' }).click();
    await expect(panel).toHaveCount(0);

    // Success criteria 4: Select two listings for comparison and open /compare.
    const compareButtons = listingsRegion.getByRole('button', { name: 'Select for comparison' });
    await compareButtons.nth(0).click();
    await compareButtons.nth(0).click();
    await page.getByRole('link', { name: 'Compare selected branches' }).click();
    await expect(page).toHaveURL(/\/compare\?ids=/);
    await expect(page.getByRole('heading', { name: /Compare Complete Blood Count/ })).toBeVisible();
    await expect(page.getByRole('table')).toContainText('BDT 400.00');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );

    // Success criteria 5 & 9: Open a branch page and verify contact details and unknown opening hours.
    await page
      .getByRole('link', { name: 'Ad-din Medical College Hospital, Moghbazar' })
      .first()
      .click();
    await expect(page).toHaveURL(/\/branches\/addin-moghbazar/);
    await expect(page.getByRole('heading', { name: 'Moghbazar', exact: true })).toBeVisible();
    await expect(page.getByText('Opening hours:', { exact: false })).toContainText('Unknown');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );

    // Success criteria 5 & 6: Open the service reviews page from the branch page.
    await page.getByRole('link', { name: 'Service reviews' }).first().click();
    await expect(page).toHaveURL(/\/reviews\?listing=addin-moghbazar-complete-blood-count/);
    await expect(
      page.getByRole('heading', { name: /Reviews for Complete Blood Count/ }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign in to review' })).toBeVisible();

    // Success criteria 7: Open the report page as a guest and see the sign-in prompt.
    await page.goto('/report?target=listing&id=addin-moghbazar-complete-blood-count');
    await expect(
      page.getByRole('heading', { name: /Report incorrect information/i }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /Sign in/i }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (mobile) {
      await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeVisible();
    }
  } finally {
    await useBrowserSession(context, 'admin');
    await page.goto(`/admin/prices?listing=${secondListingId}`);
    const revision = await page
      .getByRole('region', { name: 'Edit availability', exact: true })
      .locator('input[name="revision"]')
      .inputValue();
    await context.request.post('/admin/prices/write', {
      headers: { origin: 'http://127.0.0.1:3100' },
      maxRedirects: 0,
      form: {
        entity: 'listing',
        mode: 'update',
        id: secondListingId,
        revision,
        providerServiceName: 'CBC',
        active: '0',
        confirmMapping: 'yes',
      },
    });
  }
});
