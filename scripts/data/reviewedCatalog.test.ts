import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { record } from '../../src/features/catalog/contracts';
import { buildReviewedCatalog, readReviewedInputs, seedFile, jsonHash } from './reviewedCatalog';
import { parseHolyCovid } from './reviewedEvidence';

test('Holy Family item-specific Tk labels exclude the separate home-collection charge', () => {
  const html =
    '<p>RT-PCR TEST for Covid-19</p><p>Test Rate: 3000 TK, Home collection service charge:500 tk</p><p>Covid-19 Rapid Antigen Test</p><p>Test Rate:700 TK</p>';
  assert.deepEqual(
    parseHolyCovid(html).map((row) => row.publishedPrice),
    ['3000', '700'],
  );
  assert.throws(() => parseHolyCovid(html.replace('3000 TK', '3000')));
  assert.throws(() => parseHolyCovid(html.replace('700 TK', '700')));
});
test('publication accounts for every research listing without admitting unconfirmed branches', async () => {
  const { catalog, inventory } = await readReviewedInputs();
  assert.equal(catalog.listings.length, 196);
  assert.equal(catalog.services.length, 136);
  assert.equal(catalog.branches.length, 3);
  assert.equal(inventory.researchDecisions.length, 2090);
  assert.equal(new Set(inventory.researchDecisions.map((item) => item.researchId)).size, 2090);
  assert.equal(inventory.summary.heldResearchListings, 1894);
  assert.equal(inventory.summary.representedResearchListings, 196);
  assert.ok(
    !catalog.branches.some(
      (branch) => branch.id === 'bmu-ssh-shahbag' || branch.id === 'farabi-dhanmondi',
    ),
  );
  assert.equal(
    catalog.listings.filter((listing) => listing.branchId === 'holy-family-eskatan').length,
    2,
  );
  for (const listing of catalog.listings) {
    const source = catalog.sources.find((source) => source.id === listing.sourceId);
    assert.ok(source?.currencyEvidence);
    assert.equal(source?.kind, 'official_tariff');
  }
});
test('reviewed mappings preserve method, panel, timing and laterality variants', async () => {
  const { catalog } = await readReviewedInputs();
  const ids = new Set(catalog.services.map((service) => service.id));
  for (const id of [
    'lipid-profile',
    'fasting-lipid-profile',
    'dengue-antibody',
    'dengue-antibody-ict',
    'dengue-igm-elisa',
    'dengue-igg-elisa',
    'hbsag-latex',
    'hbsag-elisa',
    't3',
    't3-t4-tsh-panel',
    'free-t3-free-t4-tsh-panel',
    'glucose-2h-after-75g',
    'glucose-2h-after-100g',
    'xray-left-knee-bv',
    'xray-right-knee-bv',
  ])
    assert.ok(ids.has(id));
  assert.ok(
    !catalog.listings.some(
      (listing) =>
        listing.branchId === 'mogh-kamalapur' && listing.serviceId === 'serum-creatinine',
    ),
  );
  assert.ok(!catalog.listings.some((listing) => listing.serviceId === 'serum-electrolytes'));
  const cbc = catalog.listings.find(
    (listing) => listing.id === 'addin-moghbazar-complete-blood-count',
  );
  assert.equal(cbc?.priceId, 'addin-moghbazar-cbc-20261027');
  assert.equal(cbc?.verifiedAt, '2026-10-27T11:20:41Z');
});
test('changed evidence and mappings cannot inherit a previous publication review', async () => {
  const evidence: unknown = JSON.parse(
    await readFile('data/catalog/reviewed-evidence.json', 'utf8'),
  );
  const research: unknown = JSON.parse(
    await readFile('data/catalog/hospital-tariffs.json', 'utf8'),
  );
  const selection: unknown = JSON.parse(
    await readFile('data/catalog/reviewed-selection.json', 'utf8'),
  );
  const changed = structuredClone(record(evidence));
  changed.capturedAt = '2026-10-01T00:00:00Z';
  assert.throws(() => buildReviewedCatalog(changed, research, selection), /changed after review/);
  const rowChange = structuredClone(record(evidence));
  assert.ok(Array.isArray(rowChange.sources));
  const source = rowChange.sources.find(
    (value: unknown) => record(value).id === 'addin-hematology',
  );
  const value = record(source);
  assert.ok(Array.isArray(value.rows));
  value.rows[0] = {
    ...record(value.rows[0]),
    providerServiceName: 'CBC with an unspecified additional panel',
  };
  assert.throws(
    () =>
      buildReviewedCatalog(rowChange, research, {
        ...record(selection),
        evidenceSha256: jsonHash(rowChange),
      }),
    /label changed/,
  );
});
test('publication artifacts reproduce exactly from reviewed inputs', async () => {
  const { catalog, inventory } = await readReviewedInputs();
  assert.equal(
    await readFile('data/catalog/reviewed-catalog.json', 'utf8'),
    JSON.stringify(catalog, null, 2) + '\n',
  );
  assert.equal(
    await readFile('data/catalog/publication-inventory.json', 'utf8'),
    JSON.stringify(inventory, null, 2) + '\n',
  );
  assert.equal(await readFile('seeds/reviewed-catalog.sql', 'utf8'), seedFile(catalog));
});
