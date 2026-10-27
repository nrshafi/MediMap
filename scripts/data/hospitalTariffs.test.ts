import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  parseBmu,
  parseHolyFamily,
  parsePrice,
  reviewRows,
  scopeIssue,
  sources,
  parseFarabi,
  parseMogh,
  parseAddin,
  sourceUpdatedDate,
  type PublishedRow,
} from './hospitalTariffs';

function row(
  name: string,
  price: string,
  sourceId = 'holy-family-pathology',
  department = 'BIOCHEMISTRY',
): PublishedRow {
  return { sourceId, sourceRow: '1', department, providerServiceName: name, publishedPrice: price };
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

describe('hospital tariff extraction', () => {
  it('reads Farabi individual prices without converting panels into component prices', () => {
    const html =
      '<div class="sc_services_item_title_wrap"><h4 class="sc_services_item_title">Liver Function Test</h4><div class="sc_services_item_price">1000/-</div></div>';
    const result = parseFarabi(html, 'farabi-tests');
    assert.equal(result[0]?.providerServiceName, 'Liver Function Test');
    assert.equal(result[0]?.publishedPrice, '1000/-');
    assert.equal(parsePrice(result[0]?.publishedPrice ?? ''), 1000);
    assert.throws(() =>
      parseFarabi(html.replace('sc_services_item_price', 'unknown'), 'farabi-tests'),
    );
  });

  it('checks MOGH visible values against directory metadata and preserves rate qualifiers', () => {
    const html =
      '<table><tbody><tr class="test-row" data-category="Blood Test" data-name="CBC (Govt Rate)" data-price="400" data-govt="1"><td><div class="test-info"><strong>CBC (Govt Rate)</strong><span>Blood Test <b>Govt rate</b></span></div></td><td class="test-price">৳ 400</td></tr></tbody></table>';
    const result = parseMogh(html, 'mogh-tests');
    assert.equal(result[0]?.providerServiceName, 'CBC (Govt Rate)');
    assert.equal(result[0]?.department, 'Blood Test');
    assert.equal(result[0]?.publishedPrice, '৳ 400');
    assert.throws(() =>
      parseMogh(html.replace('data-price="400"', 'data-price="40"'), 'mogh-tests'),
    );
    assert.throws(() =>
      parseMogh(
        html.replace('<strong>CBC (Govt Rate)</strong>', '<strong>CBC</strong>'),
        'mogh-tests',
      ),
    );
  });

  it('requires Ad-din taka headers and keeps the diagnostic department', () => {
    const html =
      '<table><tr><th>Sl No.</th><th>Services</th><th>Service Charge (Taka)</th></tr><tr><td>1</td><td>FBS (Fasting Plasma Glucose)</td><td>170</td></tr></table>';
    const result = parseAddin(html, 'addin-biochemistry', 'Biochemistry');
    assert.equal(result[0]?.department, 'Biochemistry');
    assert.equal(result[0]?.publishedPrice, '170');
    assert.throws(() =>
      parseAddin(html.replace('(Taka)', '(Discount)'), 'addin-biochemistry', 'Biochemistry'),
    );
  });

  it('records source update dates without inventing tariff effective dates', () => {
    assert.equal(sourceUpdatedDate('<p>Updated on 23 February 2026</p>'), '2026-02-23');
    assert.equal(sourceUpdatedDate('<p>No published date</p>'), null);
    assert.throws(() => sourceUpdatedDate('<p>Updated on 31 February 2026</p>'));
    for (const value of ['৳ 1,200', 'BDT 1200', '1200 BDT', '1,200/-'])
      assert.equal(parsePrice(value), 1200);
    assert.equal(parsePrice('USD 1200'), null);
  });

  it('reads normal rates, decodes entities, and preserves specimen and method qualifiers', () => {
    const html =
      '<table><tr><th>Sl</th><th>Department Name</th><th>Exam Name</th><th>Normal Rate</th></tr><tr><td>1</td><td>LAB</td><td><b>IgG &amp; IgM</b>&nbsp;(Serum)</td><td>1,200</td></tr></table>';
    const rows = parseHolyFamily(html, 'holy-family-pathology');
    assert.equal(rows[0]?.providerServiceName, 'IgG & IgM (Serum)');
    assert.equal(rows[0]?.publishedPrice, '1,200');
  });

  it('rejects a discount-only table and malformed source rows', () => {
    assert.throws(() =>
      parseHolyFamily(
        '<table><tr><th>Exam Name</th><th>Discount Rate</th></tr></table>',
        'holy-family-pathology',
      ),
    );
    assert.throws(() =>
      parseHolyFamily(
        '<table><tr><th>Exam Name</th><th>Normal Rate</th></tr><tr><td>1</td><td>missing cells</td></tr></table>',
        'holy-family-pathology',
      ),
    );
    assert.throws(() => parseBmu('<p>Website maintenance</p>', 'bmu-ssh-investigations'));
    const normal =
      '<table><tr><th>Sl</th><th>Department Name</th><th>Exam Name</th><th>Normal Rate</th></tr><tr><td>1</td><td>LAB</td><td>CBC</td><td>400</td></tr></table>';
    const discount = normal.replace('Normal Rate', 'Discount Rate');
    assert.throws(() => parseHolyFamily(normal + discount, 'holy-family-pathology'));
  });

  it('keeps the BMU section and row identity without treating headers as prices', () => {
    const html = ['Laboratory Investigation', 'Radiology', 'Other Investigations']
      .map(
        (title) =>
          `<details><h2>${title}</h2><div class="grid"><span>Name</span><span>Price</span></div><div class="grid"><span>Test (${title})</span><span>150</span></div></details>`,
      )
      .join('');
    const rows = parseBmu(html, 'bmu-ssh-investigations');
    assert.equal(rows.length, 3);
    assert.equal(rows[1]?.sourceRow, 'Radiology:1');
    assert.equal(rows[2]?.department, 'Other Investigations');
  });

  it('rejects missing, zero, negative, and partially numeric prices', () => {
    for (const value of ['', '0', '-10', '1200 onwards', '10,00', 'N/A', '1e3', 'Infinity'])
      assert.equal(parsePrice(value), null);
    assert.equal(parsePrice('1,250.50'), 1250.5);
  });

  it('excludes every conflicting row and never selects the lowest amount', () => {
    const result = reviewRows([
      row('PT', '480'),
      row('P.T.', '420', 'holy-family-pathology', 'SEROLOGY'),
    ]);
    assert.equal(result.accepted.length, 0);
    assert.equal(result.excluded.length, 2);
    assert.ok(result.excluded.every((entry) => entry.reason === 'conflicting_published_prices'));
    assert.equal(reviewRows([row('PT', '480'), row('PT', '0')]).accepted.length, 0);
  });

  it('preserves evidence for repeated rows and keeps branches and meaningful variants separate', () => {
    const result = reviewRows([
      row('CBC', '400'),
      row('CBC', '400'),
      row('CBC', '550', 'bmu-ssh-investigations', 'Laboratory Investigation'),
      row('CBC with PBF', '600'),
      row('CHEST (PLAIN)', '5000'),
      row('CHEST (CONTRAST)', '6000'),
    ]);
    assert.equal(result.accepted.length, 5);
    assert.equal(result.duplicateRows, 1);
    assert.equal(result.accepted[0]?.evidence.length, 2);
    assert.ok(result.accepted.every((entry) => entry.canonicalServiceId === null));
    assert.throws(() => reviewRows([row('CBC', '400', 'unknown-source')]));
    assert.equal(reviewRows([row('T3/T4', '500'), row('T3+T4', '500')]).accepted.length, 2);
    assert.equal(reviewRows([row('CBC', '400'), row('CBC', '400.00')]).accepted.length, 1);
  });

  it('excludes treatments and consumables without removing valid diagnostic names', () => {
    for (const entry of [
      row('EXTRA FILM CHARGE', '400'),
      row('MRI Contrast (10 ml)', '1500'),
      row('ABG (ICU)', '1600'),
      row('MASSAGE', '250', 'holy-family-radiology', 'PHYSIOTHERAPY'),
      row('ERCP (Therapeutic) (Video)', '18200', 'bmu-ssh-investigations', 'Other Investigations'),
    ])
      assert.ok(scopeIssue(entry));
    for (const entry of [
      row('NIPPLE DISCHARGE FOR CYTOLOGY (SINGLE)', '1200'),
      row('CHEST (CONTRAST)', '6000'),
      row('ECG', '150', 'bmu-ssh-investigations', 'Other Investigations'),
    ])
      assert.equal(scopeIssue(entry), null);
  });
});

describe('collected artifact integrity', () => {
  it('accounts for every published row and preserves exact values and source references', () => {
    const dataset: unknown = JSON.parse(readFileSync('data/catalog/hospital-tariffs.json', 'utf8'));
    const audit: unknown = JSON.parse(readFileSync('data/catalog/tariff-review.json', 'utf8'));
    assert.ok(record(dataset) && Array.isArray(dataset.listings) && Array.isArray(dataset.sources));
    assert.ok(
      record(audit) && Array.isArray(audit.publishedRows) && Array.isArray(audit.excludedRows),
    );
    const publishedRows: PublishedRow[] = [];
    const inputRows: unknown[] = audit.publishedRows;
    for (const value of inputRows) {
      assert.ok(record(value));
      const { sourceId, sourceRow, department, providerServiceName, publishedPrice } = value;
      assert.ok(
        typeof sourceId === 'string' &&
          typeof sourceRow === 'string' &&
          typeof department === 'string' &&
          typeof providerServiceName === 'string' &&
          typeof publishedPrice === 'string',
      );
      publishedRows.push({ sourceId, sourceRow, department, providerServiceName, publishedPrice });
    }
    const reviewed = reviewRows(publishedRows);
    assert.deepEqual(dataset.listings, reviewed.accepted);
    assert.deepEqual(audit.excludedRows, reviewed.excluded);
    const evidenceCount = reviewed.accepted.reduce(
      (count, listing) => count + listing.evidence.length,
      0,
    );
    assert.equal(publishedRows.length, evidenceCount + reviewed.excluded.length);
    assert.equal(
      new Set(reviewed.accepted.map((entry) => entry.id)).size,
      reviewed.accepted.length,
    );
    assert.equal(dataset.publicationReady, false);
    const sourceRecords: unknown[] = dataset.sources;
    for (const value of sourceRecords) {
      assert.ok(record(value));
      assert.ok(sources.some((source) => source.id === value.id && source.url === value.url));
      assert.ok(typeof value.sha256 === 'string' && /^[a-f0-9]{64}$/.test(value.sha256));
      assert.equal(value.providerEffectiveDate, null);
      assert.ok(
        typeof value.retrievedAt === 'string' && Number.isFinite(Date.parse(value.retrievedAt)),
      );
    }
  });
});
