import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Window } from 'happy-dom';

export interface PublishedRow {
  sourceId: string;
  sourceRow: string;
  department: string;
  providerServiceName: string;
  publishedPrice: string;
}

interface SourceDefinition {
  id: string;
  url: string;
  branchId: string;
  kind: 'holy-family' | 'bmu' | 'farabi' | 'mogh' | 'addin' | 'contact';
  department?: string;
}

interface SourceRecord extends SourceDefinition {
  retrievedAt: string;
  sha256: string;
  parsedRowCount: number;
  providerEffectiveDate: null;
  sourceUpdatedDate: string | null;
  currencyEvidence:
    'explicit_taka_header' | 'explicit_taka_symbol' | 'domestic_tariff_context' | 'not_applicable';
}

export const branches = [
  {
    id: 'holy-family-eskatan',
    providerName: 'Holy Family Red Crescent Medical College Hospital',
    name: 'Eskatan Garden Road',
    address: '1, Eskatan Garden Road, Dhaka-1000, Bangladesh.',
    contactSourceId: 'holy-family-contact',
    latitude: null,
    longitude: null,
    openingHours: null,
  },
  {
    id: 'bmu-ssh-shahbag',
    providerName: 'BMU Super Specialized Hospital Ltd.',
    name: 'Shahbag',
    address: 'BMU Super Specialized Hospital Ltd., Shahbag, Dhaka-1000',
    contactSourceId: 'bmu-ssh-contact',
    latitude: null,
    longitude: null,
    openingHours: null,
  },
  {
    id: 'farabi-dhanmondi',
    providerName: 'Farabi General Hospital',
    name: 'Dhanmondi, Road 14',
    address: 'House: 8, Road: 14 (New), Dhanmondi, Dhaka – 1205, Bangladesh',
    contactSourceId: 'farabi-contact',
    latitude: null,
    longitude: null,
    openingHours: null,
  },
  {
    id: 'mogh-kamalapur',
    providerName: 'Monowara Orthopedic and General Hospital',
    name: 'Kamalapur Road',
    address: '35/7, 1 Kamalapur Rd, Dhaka 1203',
    contactSourceId: 'mogh-contact',
    latitude: null,
    longitude: null,
    openingHours: null,
  },
  {
    id: 'addin-moghbazar',
    providerName: 'Ad-din Medical College Hospital',
    name: 'Bara Maghbazar',
    address: '2 Bara Maghbazar, Dhaka 1217',
    contactSourceId: 'addin-contact',
    latitude: null,
    longitude: null,
    openingHours: null,
  },
];

export const sources: SourceDefinition[] = [
  {
    id: 'holy-family-pathology',
    url: 'https://holyfamily.com.bd/service/pathology-services',
    branchId: 'holy-family-eskatan',
    kind: 'holy-family',
  },
  {
    id: 'holy-family-radiology',
    url: 'https://holyfamily.com.bd/service/radiology-services',
    branchId: 'holy-family-eskatan',
    kind: 'holy-family',
  },
  {
    id: 'holy-family-contact',
    url: 'https://holyfamily.com.bd/contact-us',
    branchId: 'holy-family-eskatan',
    kind: 'contact',
  },
  {
    id: 'bmu-ssh-investigations',
    url: 'https://ssh.bmu.ac.bd/bn/investigation-all-list',
    branchId: 'bmu-ssh-shahbag',
    kind: 'bmu',
  },
  {
    id: 'bmu-ssh-contact',
    url: 'https://ssh.bmu.ac.bd/bn/contact',
    branchId: 'bmu-ssh-shahbag',
    kind: 'contact',
  },
  {
    id: 'farabi-tests',
    url: 'https://farabigeneralhospital.com/medical-tests-and-packages/',
    branchId: 'farabi-dhanmondi',
    kind: 'farabi',
  },
  {
    id: 'farabi-contact',
    url: 'https://farabigeneralhospital.com/contacts/',
    branchId: 'farabi-dhanmondi',
    kind: 'contact',
  },
  {
    id: 'mogh-tests',
    url: 'https://www.mogh.com.bd/available_tests',
    branchId: 'mogh-kamalapur',
    kind: 'mogh',
  },
  {
    id: 'mogh-contact',
    url: 'https://www.mogh.com.bd/contact',
    branchId: 'mogh-kamalapur',
    kind: 'contact',
  },
  {
    id: 'addin-contact',
    url: 'https://awmch.addinhospital.org/contact/',
    branchId: 'addin-moghbazar',
    kind: 'contact',
  },
  ...[
    { id: 'biochemistry', path: 'biochemistry-service-charge/', department: 'Biochemistry' },
    { id: 'hematology', path: 'hematology-service-charge', department: 'Hematology' },
    {
      id: 'radiology',
      path: 'service-charge/radiology-imaging/',
      department: 'Radiology & Imaging',
    },
    {
      id: 'clinical-pathology',
      path: 'pathology-service-charge/',
      department: 'Clinical Pathology',
    },
    { id: 'ct', path: 'service-charge/ct-scan/', department: 'CT Scan' },
    { id: 'cytopathology', path: 'cytopathology-service-charge/', department: 'Cytopathology' },
    { id: 'histopathology', path: 'histopathology-service-charge/', department: 'Histopathology' },
    { id: 'immunology', path: 'service-charge/immunology/', department: 'Immunology' },
    { id: 'microbiology', path: 'microbiology-service-charge/', department: 'Microbiology' },
    { id: 'pcr', path: 'service-charge/pcr/', department: 'PCR' },
    { id: 'serology', path: 'service-charge/serology/', department: 'Serology' },
    {
      id: 'ultrasonography',
      path: 'service-charge/ultrasonography/',
      department: 'Ultrasonography',
    },
    { id: 'virology', path: 'service-charge/virology/', department: 'Virology' },
  ].map((page): SourceDefinition => ({
    id: `addin-${page.id}`,
    url: `https://awmch.addinhospital.org/${page.path}`,
    branchId: 'addin-moghbazar',
    kind: 'addin',
    department: page.department,
  })),
];

export function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function parseDocument(html: string) {
  const window = new Window({
    settings: {
      enableJavaScriptEvaluation: false,
      disableJavaScriptFileLoading: true,
      enableCSSFileLoading: false,
      enableImageFileLoading: false,
    },
  });
  return new window.DOMParser().parseFromString(html, 'text/html');
}

function documentText(html: string): string {
  const document = parseDocument(html);
  for (const element of document.querySelectorAll('script, style, noscript')) element.remove();
  for (const element of document.querySelectorAll('br')) element.replaceWith(' ');
  return clean(document.body.textContent);
}

function cellsFromHtml(
  html: string,
  rowSelector: string,
  cellTags: string[],
): { section: string; cells: string[]; tableHeader: string[] }[] {
  const document = parseDocument(html);
  return [...document.querySelectorAll(rowSelector)].map((row) => ({
    section: clean(row.closest('details')?.querySelector('h2')?.textContent ?? ''),
    cells: [...row.children]
      .filter((cell) => cellTags.includes(cell.tagName))
      .map((cell) => clean(cell.textContent)),
    tableHeader: [...(row.closest('table')?.querySelector('tr')?.children ?? [])].map((cell) =>
      clean(cell.textContent),
    ),
  }));
}

export function parseHolyFamily(html: string, sourceId: string): PublishedRow[] {
  const rows = cellsFromHtml(html, 'table tr', ['TD', 'TH']);
  if (!rows.some(({ cells }) => cells.at(-1) === 'Normal Rate' && cells.includes('Exam Name'))) {
    throw new Error(`Missing normal-rate header: ${sourceId}`);
  }
  return rows
    .filter(({ cells }) => /^\d+$/.test(cells[0] ?? ''))
    .map(({ cells, tableHeader }) => {
      if (tableHeader.at(-1) !== 'Normal Rate' || !tableHeader.includes('Exam Name'))
        throw new Error(`Unexpected tariff header: ${sourceId}`);
      if (cells.length !== 4 && cells.length !== 5)
        throw new Error(`Unexpected row width: ${sourceId}`);
      return {
        sourceId,
        sourceRow: cells[0]!,
        department: cells[cells.length - 3]!,
        providerServiceName: cells[cells.length - 2]!,
        publishedPrice: cells[cells.length - 1]!,
      };
    });
}

export function parseBmu(html: string, sourceId: string): PublishedRow[] {
  const rows = cellsFromHtml(html, 'details div.grid', ['SPAN']);
  const sections = new Map<string, number>();
  const result: PublishedRow[] = [];
  for (const { section, cells } of rows) {
    if (cells[0] === 'Name' && cells[1] === 'Price') {
      sections.set(section, 0);
      continue;
    }
    if (!sections.has(section) || cells.length !== 2)
      throw new Error(`Unexpected investigation row: ${sourceId}`);
    const index = (sections.get(section) ?? 0) + 1;
    sections.set(section, index);
    result.push({
      sourceId,
      sourceRow: `${section}:${index}`,
      department: section,
      providerServiceName: cells[0]!,
      publishedPrice: cells[1]!,
    });
  }
  if (
    sections.size !== 3 ||
    !['Laboratory Investigation', 'Radiology', 'Other Investigations'].every((name) =>
      sections.has(name),
    )
  )
    throw new Error('Expected three BMU investigation sections');
  return result;
}

export function parsePrice(value: string): number | null {
  const numeric = value
    .replace(/^(?:৳|BDT|Tk\.?)\s*/i, '')
    .replace(/\s*(?:BDT|Tk\.?|\/-)$/i, '')
    .trim();
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(numeric)) return null;
  const amount = Number(numeric.replaceAll(',', ''));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function parseFarabi(html: string, sourceId: string): PublishedRow[] {
  const document = parseDocument(html);
  const entries = [...document.querySelectorAll('.sc_services_item_title_wrap')];
  if (entries.length === 0) throw new Error(`Missing individual test prices: ${sourceId}`);
  return entries.map((entry, index) => {
    const name = entry.querySelector('h4.sc_services_item_title');
    const price = entry.querySelector('.sc_services_item_price');
    if (!name || !price || !clean(name.textContent))
      throw new Error(`Incomplete individual test price: ${sourceId}`);
    return {
      sourceId,
      sourceRow: String(index + 1),
      department: 'Medical Tests',
      providerServiceName: clean(name.textContent),
      publishedPrice: clean(price.textContent),
    };
  });
}

export function parseMogh(html: string, sourceId: string): PublishedRow[] {
  const document = parseDocument(html);
  const entries = [...document.querySelectorAll('table tr.test-row')];
  if (entries.length === 0) throw new Error(`Missing diagnostic directory: ${sourceId}`);
  return entries.map((entry, index) => {
    const name = clean(entry.querySelector('.test-info strong')?.textContent ?? '');
    const price = clean(entry.querySelector('.test-price')?.textContent ?? '');
    const department = clean(entry.getAttribute('data-category') ?? '');
    const visibleCategory = clean(entry.querySelector('.test-info span')?.textContent ?? '');
    const rateLabel = entry.getAttribute('data-govt') === '1' ? ' Govt rate' : '';
    const machinePrice = parsePrice(entry.getAttribute('data-price') ?? '');
    if (
      !name ||
      !department ||
      name !== entry.getAttribute('data-name') ||
      department + rateLabel !== visibleCategory ||
      machinePrice === null ||
      machinePrice !== parsePrice(price) ||
      !price.startsWith('৳')
    )
      throw new Error(`Inconsistent visible directory row: ${sourceId}`);
    return {
      sourceId,
      sourceRow: String(index + 1),
      department,
      providerServiceName: name,
      publishedPrice: price,
    };
  });
}

export function parseAddin(html: string, sourceId: string, department: string): PublishedRow[] {
  const rows = cellsFromHtml(html, 'table tr', ['TD', 'TH']);
  if (rows.length < 2) throw new Error(`Missing diagnostic charge table: ${sourceId}`);
  return rows
    .filter(({ cells }) => /^\d+$/.test(cells[0] ?? ''))
    .map(({ cells, tableHeader }) => {
      if (
        tableHeader.length !== 3 ||
        tableHeader[1] !== 'Services' ||
        !/^Service Charge \((?:Taka|Tk)\)$/.test(tableHeader[2] ?? '') ||
        cells.length !== 3 ||
        !cells[1]
      )
        throw new Error(`Unexpected diagnostic charge table: ${sourceId}`);
      return {
        sourceId,
        sourceRow: cells[0]!,
        department,
        providerServiceName: cells[1]!,
        publishedPrice: cells[2]!,
      };
    });
}

export function sourceUpdatedDate(html: string): string | null {
  const match = documentText(html).match(/Updated on (\d{1,2}) ([A-Za-z]+) (\d{4})/);
  if (!match) return null;
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const monthIndex = months.indexOf(match[2] ?? '');
  if (monthIndex < 0) throw new Error('Unrecognized source update month');
  const date = `${match[3]}-${String(monthIndex + 1).padStart(2, '0')}-${match[1]!.padStart(2, '0')}`;
  if (!Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)
    throw new Error('Invalid source update date');
  return date;
}

function nameKey(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function branchFor(sourceId: string): string {
  const source = sources.find((candidate) => candidate.id === sourceId);
  if (!source || source.kind === 'contact') throw new Error(`Unknown tariff source: ${sourceId}`);
  return source.branchId;
}

const diagnosticProcedures = new Set([
  'Upper GI Endoscopy (Video)',
  'ERCP (Diagnostic) (Video)',
  'Short Colonoscopy (Video)',
  'Total Colonoscopy (Video)',
  'Ultrasonography (Diag)',
  'Endo Ultra Sound (WS) (Diag.)',
  'FNA',
  'ECG',
  'Echo-M Mode & 2D',
  'Echo-Color Doppler',
  'TEE',
  'DSE',
  'ETT',
  'Holter Monitor',
  'ABP',
  'Duplex',
  'Echo-M Mode & 2D (Children)',
  'Echo-Color Doppler (Children)',
  'Feotal Echocardiography (Children)',
  'Transesophageal Echocardiography (TEE) (Children)',
  'Portable Echocardiography (Children)',
  'TCD',
  'Cerebral DSA',
  'Spinal DSA',
  'CAG',
  'Check CAG',
  'Transradial CAG',
  'Peripheral Angiography',
  'Endoscopic of upper GIT',
  'Full Colonoscopy',
  'Short colonoscopy',
  'FNAC from Liver SOL',
  'Liver biopsy',
  'Duodenoscopy',
]);

export function scopeIssue(row: PublishedRow): string | null {
  const name = row.providerServiceName;
  if (row.department === 'PHYSIOTHERAPY') return 'therapeutic_service';
  if (/\bICU\b/i.test(name)) return 'inpatient_setting';
  if (
    /\b(CHARGE|COLLECION|VACUTAINER|BLOCK SUPPLY|SLIDE.*DELIVERY|EXTRA CT FILM|C-ARM)\b/i.test(
      name,
    ) ||
    /\bCONTRAST \(\d+ ml\)/i.test(name)
  )
    return 'ancillary_fee_or_supply';
  if (/^\d+\s*["*x]/i.test(name) || /^(ANY |MRI of Any |MRI of Single Spine$)/i.test(name))
    return 'unspecified_variant';
  if (/^CT\s*-?\s*Scan of Any /i.test(name)) return 'unspecified_variant';
  if (/^Screening of /i.test(name)) return 'screening_add_on_scope_unclear';
  if (
    /\b(Drainage|Dranage|Selerotheropy|ESOPHAGEAL VARICES BANDING|Ultrasonogram Aspiration)\b/i.test(
      name,
    )
  )
    return 'therapeutic_or_unclear_procedure';
  if (
    /Prolactin \/ Testosterone|Oestrogen \/ Progesterone|Growth Hormone \/ Cortisol|ACTH \/ PTH|HLA-C \/ HLA-DQBI|CALR\/MPL|CD19 B cell count\/|Urine \/Serum;|Urine \/ Serum;|Glucose: CSF,|Protein: CSF,/i.test(
      name,
    )
  )
    return 'multiple_options_not_split';
  if (/&[a-z#0-9]+;/i.test(name)) return 'unresolved_html_entity';
  if (
    row.department === 'Other Investigations' &&
    !diagnosticProcedures.has(name) &&
    !/^(EEG|EMG|NCV|Digital EEG|Carotid Duplex|Trance Cranial)/.test(name)
  )
    return 'therapeutic_or_unclear_procedure';
  return null;
}

export function reviewRows(rows: PublishedRow[]) {
  const priceGroups = new Map<string, Set<string>>();
  for (const row of rows) {
    const key = `${branchFor(row.sourceId)}:${nameKey(row.providerServiceName)}`;
    const prices = priceGroups.get(key) ?? new Set<string>();
    prices.add(String(parsePrice(row.publishedPrice) ?? row.publishedPrice));
    priceGroups.set(key, prices);
  }
  const accepted: (PublishedRow & {
    id: string;
    branchId: string;
    priceBdt: number;
    canonicalServiceId: null;
    evidence: { sourceId: string; sourceRow: string }[];
  })[] = [];
  const excluded: (PublishedRow & { reason: string })[] = [];
  const acceptedKeys = new Map<string, number>();
  let duplicateRows = 0;
  for (const row of rows) {
    const branchId = branchFor(row.sourceId);
    const key = `${branchId}:${nameKey(row.providerServiceName)}`;
    const priceBdt = parsePrice(row.publishedPrice);
    const reason =
      (priceGroups.get(key)?.size ?? 0) > 1
        ? 'conflicting_published_prices'
        : priceBdt === null
          ? 'zero_or_invalid_price'
          : scopeIssue(row);
    if (reason || priceBdt === null) {
      excluded.push({ ...row, reason: reason ?? 'zero_or_invalid_price' });
      continue;
    }
    const duplicateKey = `${branchId}:${row.department.toLowerCase()}:${row.providerServiceName.normalize('NFKC').toLowerCase()}`;
    const existingIndex = acceptedKeys.get(duplicateKey);
    if (existingIndex !== undefined) {
      accepted[existingIndex]!.evidence.push({ sourceId: row.sourceId, sourceRow: row.sourceRow });
      duplicateRows += 1;
      continue;
    }
    const id = createHash('sha256').update(duplicateKey).digest('hex').slice(0, 20);
    acceptedKeys.set(duplicateKey, accepted.length);
    accepted.push({
      ...row,
      id: `research-${id}`,
      branchId,
      priceBdt,
      canonicalServiceId: null,
      evidence: [{ sourceId: row.sourceId, sourceRow: row.sourceRow }],
    });
  }
  return { accepted, excluded, duplicateRows };
}

export function readSnapshots(cache: string): {
  rows: PublishedRow[];
  sourceRecords: SourceRecord[];
} {
  const rows: PublishedRow[] = [];
  const sourceRecords: SourceRecord[] = [];
  for (const source of sources) {
    const file = resolve(cache, `${source.id}.html`);
    const bytes = readFileSync(file);
    const html = bytes.toString('utf8');
    if (source.kind === 'contact') {
      const branch = branches.find((candidate) => candidate.id === source.branchId);
      if (!branch || !documentText(html).includes(branch.address))
        throw new Error(`Missing expected branch address: ${source.id}`);
    }
    const parsed =
      source.kind === 'holy-family'
        ? parseHolyFamily(html, source.id)
        : source.kind === 'bmu'
          ? parseBmu(html, source.id)
          : source.kind === 'farabi'
            ? parseFarabi(html, source.id)
            : source.kind === 'mogh'
              ? parseMogh(html, source.id)
              : source.kind === 'addin' && source.department
                ? parseAddin(html, source.id, source.department)
                : [];
    if (source.kind !== 'contact' && parsed.length === 0)
      throw new Error(`Empty tariff: ${source.id}`);
    sourceRecords.push({
      ...source,
      retrievedAt: statSync(file).mtime.toISOString(),
      sha256: createHash('sha256').update(bytes).digest('hex'),
      parsedRowCount: parsed.length,
      providerEffectiveDate: null,
      sourceUpdatedDate: sourceUpdatedDate(html),
      currencyEvidence:
        source.kind === 'addin'
          ? 'explicit_taka_header'
          : source.kind === 'mogh'
            ? 'explicit_taka_symbol'
            : source.kind === 'contact'
              ? 'not_applicable'
              : 'domestic_tariff_context',
    });
    rows.push(...parsed);
  }
  return { rows, sourceRecords };
}

if (import.meta.main) {
  const cache = resolve('.bun-tmp/hospital-research');
  if (process.argv.includes('--fetch')) {
    mkdirSync(cache, { recursive: true });
    for (const source of sources) {
      const response = await fetch(source.url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok || !response.headers.get('content-type')?.includes('text/html'))
        throw new Error(`Cannot fetch HTML: ${source.url}`);
      const finalUrl = new URL(response.url);
      if (finalUrl.hostname !== new URL(source.url).hostname)
        throw new Error(`Unexpected redirect: ${source.url}`);
      writeFileSync(resolve(cache, `${source.id}.html`), await response.text());
    }
  }
  const { rows, sourceRecords } = readSnapshots(cache);
  const { accepted, excluded, duplicateRows } = reviewRows(rows);
  const output = resolve('data/catalog');
  mkdirSync(output, { recursive: true });
  const metadata = {
    schemaVersion: 1,
    verificationScope: 'official_website_publication',
    publicationReady: false,
    limitations: [
      'Original provider labels remain unmapped to canonical services.',
      'Source update dates and retrieval times are not tariff effective or provider verification dates.',
      'currencyEvidence identifies explicit taka labels and contextual BDT assignments that need confirmation.',
      'No live appointment availability, telephone confirmation, or geographic coordinates were verified.',
    ],
    sources: sourceRecords,
    branches,
  };
  const summary = {
    parsedRows: rows.length,
    acceptedListings: accepted.length,
    excludedRows: excluded.length,
    duplicateRows,
  };
  writeFileSync(
    resolve(output, 'hospital-tariffs.json'),
    JSON.stringify({ ...metadata, currency: 'BDT', summary, listings: accepted }, null, 2) + '\n',
  );
  writeFileSync(
    resolve(output, 'tariff-review.json'),
    JSON.stringify(
      { schemaVersion: 1, summary, excludedRows: excluded, publishedRows: rows },
      null,
      2,
    ) + '\n',
  );
  console.log(JSON.stringify(summary, null, 2));
}
