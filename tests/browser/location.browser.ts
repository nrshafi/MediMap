import { expect, test, type Page } from '@playwright/test';

const locationRegion = (page: Page) => page.getByRole('region', { name: 'Search center location', exact: true });

async function ready(page: Page) {
  await page.goto('/discovery?q=CBC&radius=5&selectedBranchId=bsmmu-shahbagh');
  await expect(page.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');
}

test('manual coordinates validate, preserve filters, clear selection, and survive reload', async ({ page }, testInfo) => {
  await ready(page);
  const region = locationRegion(page);
  const before = page.url();
  for (const [lat, lng] of [['', '90'], ['91', '90'], ['23', '-181']]) {
    await region.getByLabel('Latitude', { exact: true }).fill(lat);
    await region.getByLabel('Longitude', { exact: true }).fill(lng);
    await region.getByRole('button', { name: 'Apply coordinates' }).click();
    await expect(region.getByRole('status')).toContainText('Both values are required');
    expect(page.url()).toBe(before);
    await expect(page.getByTestId('branch-result-card').first()).toBeVisible();
  }
  await region.getByLabel('Latitude', { exact: true }).fill('23.7946');
  await region.getByLabel('Longitude', { exact: true }).fill('90.4143');
  await region.getByRole('button', { name: 'Apply coordinates' }).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => new URL(page.url()).searchParams.get('lat')).toBe('23.7946');
  expect(new URL(page.url()).searchParams.get('lng')).toBe('90.4143');
  expect(new URL(page.url()).searchParams.get('q')).toBe('CBC');
  expect(new URL(page.url()).searchParams.get('radius')).toBe('5');
  expect(new URL(page.url()).searchParams.has('selectedBranchId')).toBe(false);
  await page.reload();
  await expect(region.getByLabel('Latitude', { exact: true })).toHaveValue('23.7946');
  const ids = await page.getByTestId('branch-result-card').evaluateAll((cards) => cards.map((card) => card.id.replace('branch-card-', '')).sort());
  const pins = await page.locator('[data-testid^="map-pin-"]').evaluateAll((elements) => elements.map((pin) => pin.getAttribute('data-testid')?.replace('map-pin-', '')).sort());
  expect(ids.length).toBeGreaterThan(0);
  expect(pins).toEqual(ids);
  for (const control of [region.getByLabel('Latitude', { exact: true }), region.getByLabel('Longitude', { exact: true }), region.getByRole('button', { name: 'Apply coordinates' }), region.getByRole('button', { name: 'Use my location' })]) {
    const bounds = await control.boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
    expect(bounds?.width).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (testInfo.project.name === 'mobile') {
    await page.screenshot({ path: testInfo.outputPath('location-mobile.png'), fullPage: true });
  }
  await region.getByLabel('Latitude', { exact: true }).fill('-23.5');
  await region.getByLabel('Longitude', { exact: true }).fill('-90.5');
  await region.getByRole('button', { name: 'Apply coordinates' }).click();
  await expect(page.getByRole('region', { name: 'Active search filters and result summary' })).toContainText('23.500°S, 90.500°W');
  await expect(page.getByRole('region', { name: 'No branches found', exact: true })).toBeVisible();
});

test('browser location runs only on request and keeps the current query and radius', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 23.7946, longitude: 90.4143 });
  await ready(page);
  expect(new URL(page.url()).searchParams.has('lat')).toBe(false);
  await locationRegion(page).getByRole('button', { name: 'Use my location' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('lat')).toBe('23.7946');
  expect(new URL(page.url()).searchParams.get('q')).toBe('CBC');
  expect(new URL(page.url()).searchParams.get('radius')).toBe('5');
  expect(new URL(page.url()).searchParams.has('selectedBranchId')).toBe(false);
});

for (const [code, message] of [[1, 'permission was denied'], [2, 'could not be determined'], [3, 'timed out']] as const) {
  test(`location error ${code} preserves results and allows manual recovery`, async ({ page }) => {
    await page.addInitScript((errorCode) => {
      navigator.geolocation.getCurrentPosition = (_success, error) => error?.({
        code: errorCode, message: 'Test location failure',
        PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3,
      });
    }, code);
    await ready(page);
    const before = page.url();
    const region = locationRegion(page);
    await region.getByRole('button', { name: 'Use my location' }).click();
    await expect(region.getByRole('status')).toContainText(message);
    expect(page.url()).toBe(before);
    await expect(page.getByTestId('branch-result-card').first()).toBeVisible();
    await region.getByLabel('Latitude', { exact: true }).fill('0');
    await region.getByLabel('Longitude', { exact: true }).fill('0');
    await region.getByRole('button', { name: 'Apply coordinates' }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('lat')).toBe('0');
  });
}

test('unsupported browser location preserves the current center', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'geolocation', { value: undefined }));
  await ready(page);
  const before = page.url();
  await locationRegion(page).getByRole('button', { name: 'Use my location' }).click();
  await expect(locationRegion(page).getByRole('status')).toContainText('Browser location is unavailable');
  expect(page.url()).toBe(before);
});

for (const action of ['cancel', 'preset', 'manual', 'query'] as const) {
  test(`late browser location respects ${action}`, async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 23.7946, longitude: 90.4143 });
    await page.addInitScript(() => {
      const locate = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
      navigator.geolocation.getCurrentPosition = (success, error, options) => {
        document.addEventListener('test-location-result', () => {
          locate((position) => {
            success(position);
            document.documentElement.dataset.locationDelivered = 'true';
          }, error, options);
        }, { once: true });
      };
    });
    await ready(page);
    const region = locationRegion(page);
    await region.getByRole('button', { name: 'Use my location' }).click();
    await expect(region.getByRole('status')).toContainText('Waiting for browser location');
    if (action === 'cancel') {
      await region.getByRole('button', { name: 'Cancel location request' }).click();
    } else if (action === 'preset') {
      await region.getByRole('button', { name: /Set location to Dhanmondi/ }).click();
    } else if (action === 'manual') {
      await region.getByLabel('Latitude', { exact: true }).fill('23.7');
      await region.getByLabel('Longitude', { exact: true }).fill('90.4');
      await region.getByRole('button', { name: 'Apply coordinates' }).click();
    } else {
      await page.getByRole('combobox').fill('CT');
      await page.getByRole('radio', { name: '1 km', exact: true }).focus();
      await page.keyboard.press('Space');
      await expect.poll(() => new URL(page.url()).searchParams.get('radius')).toBe('1');
      await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('CT');
    }
    const before = page.url();
    await page.evaluate(() => document.dispatchEvent(new Event('test-location-result')));
    await expect(page.locator('html')).toHaveAttribute('data-location-delivered', 'true');
    if (action === 'query') {
      await expect.poll(() => new URL(page.url()).searchParams.get('lat')).toBe('23.7946');
      expect(new URL(page.url()).searchParams.get('q')).toBe('CT');
      expect(new URL(page.url()).searchParams.get('radius')).toBe('1');
      await expect(page.getByTestId('branch-result-card')).toHaveCount(0);
    } else {
      expect(page.url()).toBe(before);
      await expect(region.getByRole('button', { name: 'Use my location' })).toBeEnabled();
    }
  });
}
