import { test, expect } from '@playwright/test';
import { useBrowserSession } from './session-fixture';
import { formatReviewDate } from '../../src/features/public/format';
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
  const firstCard = page.locator('[data-select-listing]').first();
  await firstCard.click();
  const listingPanel = page.getByRole('region', { name: 'Listing details' });
  await expect(listingPanel).toBeVisible();
  await listingPanel.getByRole('link', { name: 'Branch details', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Moghbazar', exact: true })).toBeVisible();
  await expect(page.getByText('Opening hours:', { exact: false })).toContainText('Unknown');
  await expect(page.getByRole('button', { name: 'Show on map' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Get directions to this address' })).toHaveAttribute(
    'href',
    /destination=/,
  );
  const branchCard = page.locator('article[id^="listing-"]').first();
  await expect(branchCard.getByRole('link', { name: 'Service reviews' })).toBeVisible();
  await expect(
    branchCard.getByRole('link', { name: 'Report incorrect information' }),
  ).toBeVisible();
  await expect(branchCard.getByRole('link', { name: 'Branch details' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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
  const serviceCard = page.locator('article[id^="listing-"]').first();
  await expect(serviceCard.getByRole('link', { name: 'Branch details' })).toBeVisible();
  await expect(serviceCard.getByRole('link', { name: 'Service reviews' })).toBeVisible();
  await expect(
    serviceCard.getByRole('link', { name: 'Report incorrect information' }),
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
    page.getByRole('button', { name: 'Select for comparison' }).first(),
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
  await page.locator('[data-select-listing]').first().click();
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
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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
  await expect(page.getByText(/1 service review/)).toBeVisible();
  const reviewCard = page.locator('section[aria-label="Published reviews"] article').first();
  await expect(reviewCard.getByRole('heading', { name: 'Service experience' })).toHaveCount(0);
  await expect(reviewCard.getByText(/^Updated /)).toBeVisible();
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
    maxRedirects: 0,
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
  expect(write.status()).toBe(303);
  expect(write.headers().location).toContain(
    '/reviews?listing=addin-moghbazar-complete-blood-count&error=write_failed',
  );
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
    if (test.info().project.name === 'mobile') {
      const region = page.getByRole('region', { name: 'Branch comparison table' });
      await page.getByRole('link', { name: 'Change selection' }).focus();
      await page.keyboard.press('Tab');
      await expect(region).toBeFocused();
      const initialScroll = await region.evaluate((el) => el.scrollLeft);
      expect(initialScroll).toBe(0);
      await page.keyboard.press('ArrowRight');
      await expect.poll(async () => region.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    }
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

test('find page removes repeated facts and actions while keeping source and panel actions', async ({
  page,
}) => {
  await page.goto('/find?service=complete-blood-count&radius=10');
  if (test.info().project.name === 'mobile') {
    await page.getByRole('button', { name: 'List', exact: true }).click();
  }
  const card = page.locator('[data-select-listing]').first();
  await expect(card).toBeVisible();

  // Card still shows status, review date and source
  await expect(card.getByText(/Verified|Price unknown|Disputed/)).toBeVisible();
  await expect(card.getByText(formatReviewDate('2026-10-27T11:20:41Z'))).toBeVisible();
  await expect(card.getByRole('link', { name: 'Source' })).toBeVisible();

  // Card no longer shows branch, review and report links
  await expect(card.getByRole('link', { name: 'Branch details' })).toHaveCount(0);
  await expect(card.getByRole('link', { name: 'Service reviews' })).toHaveCount(0);
  await expect(card.getByRole('link', { name: 'Report incorrect information' })).toHaveCount(0);

  // Card keeps one action button: Select for comparison
  await expect(card.getByRole('button', { name: 'Select for comparison' })).toBeVisible();

  // Clicking the card opens the panel
  await card.click();
  const panel = page.getByRole('region', { name: 'Listing details' });
  await expect(panel).toBeVisible();

  // Each panel action appears once
  await expect(panel.getByRole('button', { name: 'Show route' })).toHaveCount(1);
  await expect(panel.getByRole('link', { name: 'Open directions in Google Maps' })).toHaveCount(1);
  await expect(panel.getByRole('link', { name: 'Branch details' })).toHaveCount(1);
  await expect(panel.getByRole('link', { name: 'Service reviews' })).toHaveCount(1);
  await expect(panel.getByRole('link', { name: 'Report incorrect information' })).toHaveCount(1);

  // Road time in panel is not duplicated in a tile
  await expect(panel.locator('dt').filter({ hasText: /^Road travel time$/ })).toHaveCount(0);

  // Driving route request keeps one Google Maps route attribution
  await panel.getByRole('button', { name: 'Show route' }).click();
  await expect(panel.getByRole('status')).toContainText(
    /unavailable|failed|Route from Google Maps/,
  );
  expect(
    await panel.getByText(/Route from Google Maps|Directions from Google Maps/).count(),
  ).toBeLessThanOrEqual(1);

  // No horizontal scroll at 375 px and desktop
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('card keyboard navigation activates card button, source link and compare button independently', async ({
  page,
}) => {
  await page.goto('/find?service=complete-blood-count&radius=10');
  if (test.info().project.name === 'mobile') {
    await page.getByRole('button', { name: 'List', exact: true }).click();
  }
  const card = page.locator('[data-select-listing]').first();
  await expect(card).toBeVisible();

  // 1. Tab to the card button and press Enter opens the panel
  const cardButton = card.getByRole('button', { name: /Ad-din/ });
  await cardButton.focus();
  await expect(cardButton).toBeFocused();
  await page.keyboard.press('Enter');
  const panel = page.getByRole('region', { name: 'Listing details' });
  await expect(panel).toBeVisible();

  // Close the panel
  await panel.getByRole('button', { name: 'Close listing details' }).click();
  await expect(panel).toHaveCount(0);

  // 2. Enter on the focused "Source" link does not open the panel
  const sourceLink = card.getByRole('link', { name: 'Source' });
  await sourceLink.focus();
  await expect(sourceLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(panel).toHaveCount(0);

  // 3. Space on the focused compare button toggles comparison and does not open the panel
  const compareButton = card.getByRole('button', { name: 'Select for comparison' });
  await compareButton.focus();
  await expect(compareButton).toBeFocused();
  await page.keyboard.press('Space');
  await expect(panel).toHaveCount(0);
  await expect(card.getByRole('button', { name: 'Remove from comparison' })).toBeVisible();

  // Toggle back with Space
  await page.keyboard.press('Space');
  await expect(panel).toHaveCount(0);
  await expect(card.getByRole('button', { name: 'Select for comparison' })).toBeVisible();
});

test('mobile map view at 375 px does not cover the bottom 40 px of the map when listing panel is open', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/find?service=complete-blood-count&radius=10');

  // In list view, open the panel
  await page.getByRole('button', { name: 'List', exact: true }).click();
  const card = page.locator('[data-select-listing]').first();
  await card.click();
  const panel = page.getByRole('region', { name: 'Listing details' });
  await expect(panel).toBeVisible();

  // Switch to map view
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(panel).toBeVisible();

  // Map container is visible
  const mapContainer = page.getByRole('region', { name: 'Map' }).locator('.h-\\[60svh\\]');
  await expect(mapContainer).toBeVisible();

  const mapBox = await mapContainer.boundingBox();
  const panelBox = await panel.boundingBox();
  expect(mapBox).not.toBeNull();
  expect(panelBox).not.toBeNull();

  if (mapBox && panelBox) {
    const mapAttributionTop = mapBox.y + mapBox.height - 40;
    const mapAttributionBottom = mapBox.y + mapBox.height;

    // Check that panel bounding box does not intersect the bottom 40 px of the map
    const intersects =
      panelBox.y < mapAttributionBottom && panelBox.y + panelBox.height > mapAttributionTop;
    expect(intersects).toBe(false);

    // The panel is placed below the map container in the page flow
    expect(panelBox.y).toBeGreaterThanOrEqual(mapBox.y + mapBox.height);
  }
});

test('find page defaults to 10 km radius and shows seeded listings without a radius parameter', async ({
  page,
}) => {
  await page.goto('/find?service=complete-blood-count');
  await expect(page.getByRole('button', { name: '10 km', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('[data-select-listing]').first()).toBeVisible();
});

test('find page shows a typo suggestion only once', async ({ page }) => {
  await page.goto('/find');
  await page.getByLabel('Service name or abbreviation').fill('complete blod count');
  const suggestions = page.getByRole('region', { name: 'Service suggestions' });
  await expect(
    suggestions.getByRole('link', { name: 'Complete Blood Count', exact: true }),
  ).toHaveCount(1);
});

test('custom radius field can be cleared, shows an error, and updates the URL when valid', async ({
  page,
}) => {
  await page.goto('/find?service=complete-blood-count');
  await page.getByRole('button', { name: 'Custom', exact: true }).click();
  const radiusInput = page.getByLabel('Straight-line radius in km');
  await radiusInput.fill('');
  await expect(radiusInput).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Enter a radius from 0.1 to 100 km.')).toBeVisible();
  await radiusInput.fill('7');
  await expect(page).toHaveURL(/radius=7/);
  await expect(radiusInput).not.toHaveAttribute('aria-invalid', 'true');
});

test('changing radius and sort on /find does not reload the catalog server function', async ({
  page,
}) => {
  const serverFnRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/_serverFn/')) serverFnRequests.push(request.url());
  });
  await page.goto('/find?service=complete-blood-count');
  await expect(page.locator('[data-select-listing]').first()).toBeVisible();
  const initialCount = serverFnRequests.length;

  await page.getByRole('button', { name: '5 km', exact: true }).click();
  await expect(page).toHaveURL(/radius=5/);
  await page.getByLabel('Sort listings').selectOption('price-desc');
  await expect(page).toHaveURL(/sort=price-desc/);
  expect(serverFnRequests.length).toBe(initialCount);

  await page.getByLabel('Service name or abbreviation').fill('CBC');
  await page
    .getByRole('region', { name: 'Service suggestions' })
    .getByRole('link', { name: 'Complete Blood Count', exact: true })
    .click();
  await expect(page).toHaveURL(/service=complete-blood-count/);
});

test.describe('server-rendered review report form', () => {
  test.use({ javaScriptEnabled: false });

  test('submitting a review report without JavaScript redirects back with a Notice', async ({
    page,
    context,
  }) => {
    const role =
      test.info().project.name === 'mobile' ? 'review-nojs-mobile' : 'review-nojs-desktop';
    await useBrowserSession(context, role);
    await page.goto('/reviews?listing=addin-moghbazar-complete-blood-count');
    const writeForm = page.locator('form[action="/reviews/write"]');
    for (const name of [
      'Service quality',
      'Staff behavior',
      'Waiting time',
      'Cleanliness',
      'Value',
      'Report-delivery experience',
    ])
      await writeForm.getByRole('combobox', { name, exact: true }).selectOption('4');
    await writeForm.getByLabel('Written review, optional').fill(`No-JS review ${role}`);
    await writeForm.getByRole('button', { name: 'Save review' }).click();
    await expect(page).toHaveURL(/result=saved/);
    await expect(page.getByRole('status')).toContainText('Review saved.');

    await page.getByText('Report this review', { exact: true }).first().click();
    const reportForm = page.locator('form[action="/reviews/report"]').first();
    const reviewId = await reportForm.locator('input[name="review"]').inputValue();
    await reportForm
      .getByLabel('Reason', { exact: true })
      .fill('Synthetic no-JavaScript abuse report to verify redirect notice.');
    await reportForm.getByRole('button', { name: 'Report review', exact: true }).click();
    await expect(page).toHaveURL(/result=reported/);
    await expect(page.getByRole('status')).toContainText(
      'Review report saved for administrator review.',
    );

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
});

test('price range and minimum rating filters update listings, URL, hidden counts, and clear cleanly', async ({
  page,
}) => {
  await page.goto('/find?service=complete-blood-count');
  if (test.info().project.name === 'mobile') {
    await page.getByRole('button', { name: 'List', exact: true }).click();
  }
  const listingsRegion = page.getByRole('region', { name: 'Published listings' });
  await expect(listingsRegion).toContainText('BDT 400.00');

  // Seeded Ad-din CBC price is BDT 400.00; maxPrice=300 hides it and shows EmptyState with Clear filters.
  await page.getByLabel('Maximum price (BDT)').fill('300');
  await expect(page).toHaveURL(/maxPrice=300/);
  await expect(page.getByRole('heading', { name: 'No published listings' })).toBeVisible();
  await expect(page.getByText('Statistics include all listings in the radius.')).toBeVisible();

  // Raising maxPrice to 500 restores the BDT 400.00 listing.
  await page.getByLabel('Maximum price (BDT)').fill('500');
  await expect(page).toHaveURL(/maxPrice=500/);
  await expect(listingsRegion).toContainText('BDT 400.00');

  // Selecting 4+ rating hides listings without visible reviews and reports the hidden count.
  await page
    .getByRole('group', { name: 'Minimum rating' })
    .getByRole('button', { name: '4+', exact: true })
    .click();
  await expect(page).toHaveURL(/minRating=4/);
  await expect(page.getByText(/1 listing hidden because it has no reviews/)).toBeVisible();

  // Clear filters resets price and rating controls and removes the query params from the URL.
  await page.getByRole('button', { name: 'Clear filters' }).first().click();
  await expect(page).not.toHaveURL(/maxPrice=/);
  await expect(page).not.toHaveURL(/minRating=/);
  await expect(listingsRegion).toContainText('BDT 400.00');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
