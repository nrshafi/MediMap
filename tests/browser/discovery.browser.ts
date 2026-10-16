import { expect, test } from '@playwright/test';

test('query edits clear old results and radius survives explicit selection and reload', async ({ page }) => {
  await page.goto('/discovery?q=CBC&radius=3');
  const input = page.getByRole('combobox', { name: 'Search diagnostic tests' });
  const cards = page.getByTestId('branch-result-card');
  await expect(cards.first()).toBeVisible();
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  for (const query of ['unknown service', 'lipidd', 'CT']) {
    await input.fill(query);
    await expect(cards).toHaveCount(0);
    await expect(page.locator('[data-testid^="map-pin-"]')).toHaveCount(0);
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(query);
  }
  const radius5 = page.getByRole('radio', { name: '5 km', exact: true });
  await radius5.focus();
  await radius5.press('Space');
  await expect.poll(() => new URL(page.url()).searchParams.get('radius')).toBe('5');
  await expect(page.getByRole('region', { name: 'Active search filters and result summary' })).toContainText('5 km');
  const chestOption = page.getByRole('button', { name: /Select CT Scan Chest/ });
  await chestOption.focus();
  await chestOption.press('Enter');
  await expect(cards.first()).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('CT Scan Chest');
  await page.reload();
  await expect(input).toHaveValue('CT Scan Chest');
  await expect(page.getByRole('radio', { name: '5 km', exact: true })).toBeChecked();
  await expect(cards.first()).toBeVisible();
  await expect(cards.first()).toContainText('Sample price');
  await expect(cards.first()).toContainText('Road estimate unavailable');
  await page.getByRole('button', { name: 'Clear search input' }).click();
  await expect(cards).toHaveCount(0);
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('');
  await page.reload();
  await expect(input).toHaveValue('');
  await expect(cards).toHaveCount(0);
});

test('keyboard service selection, branch selection, and mobile summary dismissal work', async ({ page }, testInfo) => {
  await page.goto('/discovery?q=CBC&radius=5');
  const input = page.getByRole('combobox');
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  await input.fill('Lipid');
  await expect(page.getByRole('option').first()).toBeVisible();
  await input.press('ArrowDown');
  await input.press('Enter');
  await expect(input).toHaveValue('Lipid Profile');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('Lipid Profile');
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('tab', { name: 'List', exact: false }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Map', exact: true })).toBeFocused();
  }
  const pin = page.getByTestId('map-pin-bsmmu-shahbagh');
  await pin.focus();
  await pin.press('Enter');
  await expect(pin).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => new URL(page.url()).searchParams.get('selectedBranchId')).toBe('bsmmu-shahbagh');
  if (testInfo.project.name === 'mobile') {
    const summary = page.getByRole('dialog');
    await expect(summary).toBeVisible();
    await summary.getByRole('button', { name: /Dismiss/ }).click();
    await expect(summary).toHaveCount(0);
    await pin.press('Enter');
    await expect(summary).toBeVisible();
    await summary.getByRole('button', { name: 'View in list' }).click();
  }
  await expect(page.locator('#branch-card-bsmmu-shahbagh')).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Change test' }).click();
  await expect(page.getByTestId('branch-result-card')).toHaveCount(0);
  await expect(input).toBeFocused();
});

test('location changes preserve map/list identity and rendered controls remain usable', async ({ page }, testInfo) => {
  await page.goto('/discovery?q=CBC');
  await expect(page.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: /Set location to Gulshan-2/ }).click();
  const cards = page.getByTestId('branch-result-card');
  await expect(cards.first()).toContainText('United Hospital');
  await page.reload();
  await expect(page.getByRole('button', { name: /Set location to Gulshan-2/ })).toHaveAttribute('aria-pressed', 'true');
  const ids = await cards.evaluateAll((elements) => elements.map((element) => element.id.replace('branch-card-', '')).sort());
  const pins = await page.locator('[data-testid^="map-pin-"]').evaluateAll((elements) => elements.map((element) => element.getAttribute('data-testid')?.replace('map-pin-', '')).sort());
  expect(ids.length).toBeGreaterThan(0);
  expect(pins).toEqual(ids);
  if (testInfo.project.name === 'mobile') {
    const listTab = page.getByRole('tab', { name: 'List', exact: false });
    const mapTab = page.getByRole('tab', { name: 'Map', exact: true });
    await expect(mapTab).toBeVisible();
    for (const control of [listTab, mapTab, page.getByRole('button', { name: 'Clear search input' }), page.getByRole('button', { name: /Set location to Gulshan-2/ })]) {
      const bounds = await control.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
      expect(bounds!.width).toBeGreaterThanOrEqual(44);
    }
    await mapTab.click();
    await expect(cards.first()).toBeHidden();
    await expect(page.locator('.medimap-dhaka-svg')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('discovery-mobile.png'), fullPage: true });
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
