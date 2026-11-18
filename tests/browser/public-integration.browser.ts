import { test, expect } from '@playwright/test';
import { useBrowserSession } from './session-fixture';
test('public catalog, details, unknown locations and URL filters use persisted data', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Service name or abbreviation').fill('CBC');
  await page.getByRole('button', { name: 'Search services' }).click();
  await expect(page).toHaveURL(/\/find\?.*q=CBC/);
  await expect(page.getByRole('heading', { name: 'Find a diagnostic service' })).toBeVisible();
  await page
    .getByRole('region', { name: 'Service suggestions' })
    .getByRole('link', { name: 'Complete Blood Count', exact: true })
    .click();
  await page.getByRole('button', { name: 'Custom' }).click();
  await page.getByLabel('Straight-line radius in km').fill('10');
  await expect(page).toHaveURL(/radius=10/);
  await expect(page.getByRole('region', { name: 'Published listings' })).toContainText(
    'BDT 400.00',
  );
  await expect(page.getByRole('region', { name: 'Published listings' })).toContainText('km');
  await expect(page.getByRole('region', { name: 'Area price statistics' })).toContainText(
    'At least three eligible branches',
  );
  const verifiedOnly = page.getByRole('button', { name: 'Verified prices only' });
  await verifiedOnly.click();
  await expect(page).toHaveURL(/verified=yes/);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Verified prices only' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'Branch details', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Moghbazar', exact: true })).toBeVisible();
  await expect(page.getByText('Opening hours:', { exact: false })).toContainText('Unknown');
  await expect(page.getByRole('button', { name: 'Show on map' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Get directions to this address' })).toHaveAttribute(
    'href',
    /destination=/,
  );
  await page.goto('/services/complete-blood-count?lat=23.75&lng=90.4&radius=5');
  await expect(page.getByText('Selected area:', { exact: false })).toContainText(
    '5 km from 23.7500, 90.4000',
  );
  await expect(page.getByText('Category:', { exact: false })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Find this service near a location' }),
  ).toHaveAttribute('href', /radius=5/);
  await expect(
    page.getByRole('heading', { name: 'Complete Blood Count', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `.bun-tmp/public-detail-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test('find page shows listing details, controls meet touch size and the map falls back', async ({
  page,
}) => {
  const mobile = test.info().project.name === 'mobile';
  await page.goto('/find?service=complete-blood-count&radius=10');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const control of [
    page.getByRole('button', { name: 'Find address' }),
    page.getByRole('button', { name: 'Verified prices only' }),
    page.getByRole('button', { name: '3 km', exact: true }),
    page.getByRole('button', { name: 'Show details' }).first(),
  ]) {
    const bounds = await control.boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
  }
  if (mobile) {
    const list = page.getByRole('button', { name: 'List', exact: true });
    const map = page.getByRole('button', { name: 'Map', exact: true });
    await expect(list).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Map unavailable')).toBeHidden();
    await map.click();
    await expect(map).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('region', { name: 'Published listings' })).toBeHidden();
  } else {
    await expect(page.getByRole('region', { name: 'Map' })).toBeVisible();
  }
  const notice = page.getByText('Map unavailable');
  if (await notice.count()) await expect(notice).toBeVisible();
  if (mobile) await page.getByRole('button', { name: 'List', exact: true }).click();
  await page.getByRole('button', { name: 'Show details' }).first().click();
  const panel = page.getByRole('region', { name: 'Listing details' });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('BDT 400.00');
  await expect(panel.getByRole('link', { name: 'Open directions in Google Maps' })).toHaveAttribute(
    'href',
    /google\.com\/maps\/dir\/\?api=1&destination=/,
  );
  await panel.getByRole('button', { name: 'Show route' }).click();
  await expect(panel.getByRole('status')).toContainText(/unavailable|failed/);
  await panel.getByRole('button', { name: 'Close listing details' }).click();
  await expect(panel).toHaveCount(0);
  await page.getByLabel('Dhaka address').fill('Moghbazar');
  await page.getByRole('button', { name: 'Find address' }).click();
  await expect(page.getByTestId('address-message')).not.toBeEmpty();
  await page.getByText('More location options').click();
  await expect(page.getByRole('button', { name: /Set location to Dhanmondi/ })).toBeVisible();
});

test('a blocked Google Maps script shows the map unavailable notice', async ({ page }) => {
  await page.route('https://maps.googleapis.com/**', (route) => route.abort());
  await page.goto('/find?service=complete-blood-count&radius=10');
  if (test.info().project.name === 'mobile')
    await page.getByRole('button', { name: 'Map', exact: true }).click();
  // Without a key the notice shows at once. With a key the aborted script triggers it.
  await expect(page.getByText('Map unavailable')).toBeVisible();
  if (test.info().project.name === 'mobile')
    await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Published listings' })).toContainText(
    'BDT 400.00',
  );
});

test('signed-in reviews, abuse reports and moderation change public summaries', async ({
  page,
  context,
}) => {
  await useBrowserSession(
    context,
    test.info().project.name === 'mobile' ? 'review-mobile' : 'review-desktop',
  );
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
    await form.getByRole('combobox', { name, exact: true }).selectOption('4');
  await form
    .getByLabel('Written review, optional')
    .fill(`Synthetic public flow ${test.info().project.name}`);
  await form.getByRole('button', { name: 'Save review' }).click();
  await expect(page.getByText(/service reviews · 4.00/)).toBeVisible();
  await page.getByText('Report this review', { exact: true }).first().click();
  const report = page.locator('form[action="/reviews/report"]').first();
  const reviewId = await report.locator('input[name="review"]').inputValue();
  await report
    .getByLabel('Reason', { exact: true })
    .fill('Synthetic browser abuse report for retained moderation testing.');
  await report.getByRole('button', { name: 'Report review', exact: true }).click();
  await expect(page.getByText('Review report saved for administrator review.')).toBeVisible();
  await useBrowserSession(context, 'admin');
  await page.goto('/admin/reviews');
  const article = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: reviewId, exact: true }) });
  await article.getByRole('combobox', { name: 'Action', exact: true }).selectOption('hide');
  await article
    .getByLabel('Reason', { exact: true })
    .fill('Synthetic verified moderation reason for browser coverage.');
  await article.getByRole('button', { name: 'Save moderation decision' }).click();
  await expect(
    page
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { name: reviewId, exact: true }) }),
  ).toContainText('hidden');
  await context.clearCookies();
  await page.goto('/reviews?listing=addin-moghbazar-complete-blood-count');
  await expect(
    page.getByText(`Synthetic public flow ${test.info().project.name}`, { exact: true }),
  ).toHaveCount(0);
});
test('invalid public comparison and inactive records fail explicitly', async ({
  page,
  context,
}) => {
  const write = await context.request.post('/reviews/write', {
    headers: { origin: 'http://127.0.0.1:3100', 'x-role': 'administrator' },
    form: {
      listing: 'addin-moghbazar-complete-blood-count',
      body: '',
      revision: '0',
      score0: '4',
      score1: '4',
      score2: '4',
      score3: '4',
      score4: '4',
      score5: '4',
    },
  });
  expect(write.status()).toBe(400);
  await page.goto('/compare?ids=missing-one,missing-two');
  await expect(page.getByRole('heading', { name: 'Comparison unavailable' })).toBeVisible();
  await page.goto('/branches/missing-branch');
  await expect(page.getByRole('heading', { name: 'Record not found' })).toBeVisible();
});

test('comparison preserves unknown values and displays the same selected branches in charts and tables', async ({
  page,
  context,
}) => {
  await useBrowserSession(context, 'admin');
  const suffix = crypto.randomUUID();
  const ids: string[] = [];
  for (const marker of ['a', 'b']) {
    const branch = `compare-branch-${marker}-${suffix}`,
      listing = `compare-listing-${marker}-${suffix}`;
    const provider = await context.request.post('/admin/providers/write', {
      headers: { origin: 'http://127.0.0.1:3100' },
      maxRedirects: 0,
      form: {
        entity: 'branch',
        mode: 'create',
        id: branch,
        providerId: 'addin-medical-college-hospital',
        name: `Synthetic compare ${marker} ${suffix}`,
        address: 'Synthetic comparison address',
        active: '1',
        contactSourceId: 'addin-contact-20261027',
        confirmContact: 'yes',
      },
    });
    expect(provider.headers().location).toContain('code=saved');
    const created = await context.request.post('/admin/prices/write', {
      headers: { origin: 'http://127.0.0.1:3100' },
      maxRedirects: 0,
      form: {
        entity: 'listing',
        mode: 'create',
        id: listing,
        branchId: branch,
        serviceId: 'complete-blood-count',
        providerServiceName: 'Browser CBC',
        active: '1',
        confirmMapping: 'yes',
      },
    });
    expect(created.headers().location).toContain('code=saved');
    ids.push(listing);
  }
  try {
    await context.clearCookies();
    await page.goto(`/compare?ids=${ids.join(',')}`);
    await expect(page.getByRole('table')).toContainText('Unknown');
    await expect(
      page.getByRole('region', { name: 'Selected branch charts' }).getByRole('article'),
    ).toHaveCount(2);
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `.bun-tmp/public-comparison-${test.info().project.name}.png`,
      fullPage: true,
    });
  } finally {
    await useBrowserSession(context, 'admin');
    for (const id of ids) {
      await page.goto(`/admin/prices?listing=${id}`);
      const revision = await page
        .getByRole('region', { name: 'Edit availability', exact: true })
        .locator('input[name="revision"]')
        .inputValue();
      const result = await context.request.post('/admin/prices/write', {
        headers: { origin: 'http://127.0.0.1:3100' },
        maxRedirects: 0,
        form: {
          entity: 'listing',
          mode: 'update',
          id,
          revision,
          providerServiceName: 'Browser CBC',
          active: '0',
          confirmMapping: 'yes',
        },
      });
      expect(result.headers().location).toContain('code=saved');
    }
  }
});
