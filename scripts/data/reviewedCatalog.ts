import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { normalizeText } from '../../src/features/search/normalizer';
import { catalogId, record } from '../../src/features/catalog/contracts';
import { utcTimestamp, amountMinor as decimalMinor } from '../../src/features/pricing/contracts';
import {
  branches,
  sources as originalSources,
  reviewRows,
  parsePrice,
  type PublishedRow,
} from './hospitalTariffs';
import { mappings, publicationHolds } from './reviewedMappings';
import type { EvidenceFile } from './reviewedEvidence';

export type ReviewedSource = {
  id: string;
  providerId: string;
  url: string;
  kind: 'official_tariff' | 'official_contact';
  retrievedAt: string;
  sha256: string;
  sourceUpdatedDate: string | null;
  currencyEvidence: 'explicit_taka_header' | 'explicit_taka_symbol' | null;
  collector: string | null;
  recordedAt: string | null;
};
export type ReviewedService = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  aliases: { id: string; alias: string; language: 'en' | 'bn' }[];
};
export type ReviewedListing = {
  id: string;
  branchId: string;
  serviceId: string;
  providerServiceName: string;
  priceId: string;
  amountMinor: number;
  sourceId: string;
  sourceRow: number;
  verifiedAt: string;
  researchIds: string[];
  corroboration: { sourceId: string; row: number }[];
};
export type ReviewedCatalog = {
  schemaVersion: 1;
  id: string;
  reviewedAt: string;
  reviewer: string;
  evidenceSha256: string;
  providers: { id: string; name: string }[];
  branches: {
    id: string;
    providerId: string;
    name: string;
    address: string;
    contactSourceId: string;
    phone: string | null;
  }[];
  services: ReviewedService[];
  sources: ReviewedSource[];
  listings: ReviewedListing[];
};
export type PublicationInventory = {
  schemaVersion: 1;
  catalogId: string;
  reviewedAt: string;
  summary: {
    researchListings: number;
    publishedListings: number;
    representedResearchListings: number;
    heldResearchListings: number;
    providers: number;
    branches: number;
    canonicalServices: number;
  };
  branches: { id: string; publishedListings: number; heldResearchListings: number }[];
  researchDecisions: {
    researchId: string;
    disposition: 'published' | 'held';
    listingId?: string;
    reason?: string;
  }[];
  holds: Record<string, string>;
};
const providerIds: Record<string, string> = {
  'addin-moghbazar': 'addin-medical-college-hospital',
  'mogh-kamalapur': 'monowara-orthopedic-general-hospital',
  'holy-family-eskatan': 'holy-family-red-crescent-hospital',
};
const baseReview = '2026-10-27T11:20:41Z';
export function jsonHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Expected nonempty catalog text');
  return value;
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('Expected catalog array');
  return value;
}
function publishedRow(value: unknown): PublishedRow {
  const row = record(value);
  return {
    sourceId: catalogId(row.sourceId),
    sourceRow: text(row.sourceRow),
    department: text(row.department),
    providerServiceName: text(row.providerServiceName),
    publishedPrice: text(row.publishedPrice),
  };
}
export function decodeEvidence(value: unknown): EvidenceFile {
  const input = record(value);
  if (input.schemaVersion !== 1) throw new Error('Unsupported evidence schema');
  return {
    schemaVersion: 1,
    capturedAt: utcTimestamp(input.capturedAt),
    failures: array(input.failures).map((value) => {
      const row = record(value);
      return {
        id: catalogId(row.id),
        url: text(row.url),
        checkedAt: utcTimestamp(row.checkedAt),
        reason: text(row.reason),
      };
    }),
    sources: array(input.sources).map((value) => {
      const row = record(value);
      const id = catalogId(row.id);
      const definition = originalSources.find((source) => source.id === id);
      const covid = id === 'holy-family-covid';
      if (
        (!definition && !covid) ||
        row.url !== (definition?.url ?? 'https://holyfamily.com.bd/about/covid-information') ||
        row.branchId !== (definition?.branchId ?? 'holy-family-eskatan') ||
        typeof row.sha256 !== 'string' ||
        !/^[a-f0-9]{64}$/.test(row.sha256)
      )
        throw new Error('Source identity or hash mismatch');
      const expected =
        definition?.kind === 'addin' || covid
          ? 'explicit_taka_header'
          : definition?.kind === 'mogh'
            ? 'explicit_taka_symbol'
            : null;
      if (row.currencyEvidence !== expected) throw new Error('Unsupported currency assignment');
      return {
        id,
        branchId: catalogId(row.branchId),
        url: text(row.url),
        retrievedAt: utcTimestamp(row.retrievedAt),
        sha256: row.sha256,
        sourceUpdatedDate: row.sourceUpdatedDate === null ? null : text(row.sourceUpdatedDate),
        currencyEvidence: expected,
        currencyScope: text(row.currencyScope),
        addressEvidence: row.addressEvidence === null ? null : text(row.addressEvidence),
        rows: array(row.rows).map(publishedRow),
      };
    }),
  };
}
export function buildReviewedCatalog(
  evidenceValue: unknown,
  researchValue: unknown,
  reviewValue: unknown,
): { catalog: ReviewedCatalog; inventory: PublicationInventory } {
  const evidence = decodeEvidence(evidenceValue);
  const research = record(researchValue);
  const review = record(reviewValue);
  if (review.schemaVersion !== 1) throw new Error('Unsupported reviewed-selection schema');
  if (
    review.evidenceSha256 !== jsonHash(evidenceValue) ||
    review.mappingSha256 !== jsonHash(mappings) ||
    review.researchSha256 !== jsonHash(researchValue) ||
    review.holdsSha256 !== jsonHash(publicationHolds)
  )
    throw new Error(
      'Evidence or mappings changed after review. Complete a new review before publication.',
    );
  const reviewedAt = utcTimestamp(review.reviewedAt);
  const reviewer = text(review.reviewer);
  if (
    Date.parse(reviewedAt) > Date.now() ||
    evidence.sources.some((source) => Date.parse(source.retrievedAt) > Date.parse(reviewedAt))
  )
    throw new Error('Invalid review chronology');
  const sourceMap = new Map(evidence.sources.map((source) => [source.id, source]));
  if (sourceMap.size !== evidence.sources.length) throw new Error('Duplicate source identity');
  const currentRows = evidence.sources
    .filter((source) => source.id !== 'holy-family-covid')
    .flatMap((source) => source.rows);
  const currentlyAccepted = reviewRows(currentRows).accepted;
  const researchListings = array(research.listings).map((value) => {
    const row = record(value);
    return {
      id: catalogId(row.id),
      branchId: catalogId(row.branchId),
      sourceId: catalogId(row.sourceId),
      sourceRow: text(row.sourceRow),
      evidence: array(row.evidence).map((value) => {
        const item = record(value);
        return { sourceId: catalogId(item.sourceId), sourceRow: text(item.sourceRow) };
      }),
    };
  });
  const catalog: ReviewedCatalog = {
    schemaVersion: 1,
    id: 'reviewed-catalog-20261028',
    reviewedAt,
    reviewer,
    evidenceSha256: jsonHash(evidenceValue),
    providers: [],
    branches: [],
    services: [],
    sources: [],
    listings: [],
  };
  const usedSources = new Set<string>();
  const assignedRows = new Set<string>();
  const assignedPairs = new Set<string>();
  for (const mapping of mappings) {
    catalogId(mapping.id);
    const categoryId = normalizeText(mapping.category).replaceAll(' ', '-');
    catalogId(categoryId);
    const service: ReviewedService = {
      id: mapping.id,
      name: mapping.name,
      categoryId,
      categoryName: mapping.category,
      aliases: mapping.aliases.map((alias) => ({
        id:
          mapping.id === 'complete-blood-count' && alias.alias === 'CBC'
            ? 'complete-blood-count-cbc-en'
            : `${mapping.id}-alias-${jsonHash(alias).slice(0, 12)}`,
        ...alias,
      })),
    };
    catalog.services.push(service);
    for (const selection of mapping.selections) {
      const source = sourceMap.get(selection.sourceId);
      if (!source || !source.currencyEvidence)
        throw new Error(`Missing explicit currency evidence: ${selection.sourceId}`);
      const row = source.rows.find((row) => row.sourceRow === String(selection.row));
      if (!row || row.providerServiceName !== selection.label)
        throw new Error(`Reviewed label changed: ${selection.sourceId}:${selection.row}`);
      const key = `${selection.sourceId}:${selection.row}`;
      if (assignedRows.has(key) || publicationHolds[key])
        throw new Error(`Duplicate or held publication row: ${key}`);
      assignedRows.add(key);
      const primaryResearch =
        selection.sourceId === 'holy-family-covid'
          ? { sourceId: 'holy-family-pathology', sourceRow: selection.row === 1 ? '369' : '370' }
          : { sourceId: selection.sourceId, sourceRow: String(selection.row) };
      const origin = researchListings.find((item) =>
        item.evidence.some(
          (ref) =>
            ref.sourceId === primaryResearch.sourceId &&
            ref.sourceRow === primaryResearch.sourceRow,
        ),
      );
      if (!origin) throw new Error(`Row is not in the reviewed research inventory: ${key}`);
      if (origin.branchId !== source.branchId)
        throw new Error('Research and source branch identities differ');
      if (
        selection.sourceId !== 'holy-family-covid' &&
        !currentlyAccepted.some((item) =>
          item.evidence.some(
            (ref) => ref.sourceId === selection.sourceId && ref.sourceRow === String(selection.row),
          ),
        )
      )
        throw new Error(`Current source row is excluded or conflicting: ${key}`);
      const amount = parsePrice(row.publishedPrice);
      if (amount === null) throw new Error('Invalid exact published amount');
      const id = `${source.branchId}-${mapping.id}`;
      catalogId(id);
      if (assignedPairs.has(id)) throw new Error('Duplicate branch and canonical service mapping');
      assignedPairs.add(id);
      const isBase = id === 'addin-moghbazar-complete-blood-count';
      const listing: ReviewedListing = {
        id,
        branchId: source.branchId,
        serviceId: mapping.id,
        providerServiceName: row.providerServiceName,
        priceId: isBase
          ? 'addin-moghbazar-cbc-20261027'
          : `reviewed-price-${jsonHash(id).slice(0, 20)}-20261028`,
        amountMinor: decimalMinor(String(amount)),
        sourceId: isBase ? 'addin-hematology-20261027' : `${source.id}-20261028`,
        sourceRow: selection.row,
        verifiedAt: isBase ? baseReview : reviewedAt,
        researchIds: [origin.id],
        corroboration: [],
      };
      if (selection.sourceId === 'holy-family-covid') {
        const corroborating = sourceMap.get('holy-family-pathology');
        const match = corroborating?.rows.find(
          (item) => item.sourceRow === primaryResearch.sourceRow,
        );
        if (!match || parsePrice(match.publishedPrice) !== amount)
          throw new Error('Holy Family corroborating item price changed');
        listing.corroboration.push({
          sourceId: 'holy-family-pathology-20261028',
          row: Number(primaryResearch.sourceRow),
        });
        usedSources.add('holy-family-pathology');
      }
      catalog.listings.push(listing);
      if (!isBase) usedSources.add(source.id);
    }
  }
  for (const branch of branches.filter((branch) =>
    catalog.listings.some((item) => item.branchId === branch.id),
  )) {
    const providerId = providerIds[branch.id];
    if (!providerId) throw new Error('Missing reviewed provider identity');
    const contact = sourceMap.get(branch.contactSourceId);
    if (!contact || contact.addressEvidence !== branch.address)
      throw new Error(`Missing verified branch location: ${branch.id}`);
    usedSources.add(branch.contactSourceId);
    catalog.providers.push({ id: providerId, name: branch.providerName });
    catalog.branches.push({
      id: branch.id,
      providerId,
      name: branch.id === 'addin-moghbazar' ? 'Moghbazar' : branch.name,
      address: branch.address,
      contactSourceId:
        branch.id === 'addin-moghbazar' ? 'addin-contact-20261027' : `${contact.id}-20261028`,
      phone: null,
    });
  }
  for (const id of [...usedSources].sort()) {
    const source = sourceMap.get(id)!;
    const providerId = providerIds[source.branchId];
    catalog.sources.push({
      id: `${id}-20261028`,
      providerId,
      url: source.url,
      kind: source.addressEvidence ? 'official_contact' : 'official_tariff',
      retrievedAt: source.retrievedAt,
      sha256: source.sha256,
      sourceUpdatedDate: source.sourceUpdatedDate,
      currencyEvidence: source.currencyEvidence,
      collector: reviewer,
      recordedAt: reviewedAt,
    });
  }
  for (const [researchId, id] of [
    ['addin-hematology', 'addin-hematology-20261027'],
    ['addin-contact', 'addin-contact-20261027'],
  ]) {
    const source = record(array(research.sources).find((value) => record(value).id === researchId));
    catalog.sources.push({
      id,
      providerId: 'addin-medical-college-hospital',
      url: text(source.url),
      kind: researchId === 'addin-contact' ? 'official_contact' : 'official_tariff',
      retrievedAt: utcTimestamp(source.retrievedAt),
      sha256: text(source.sha256),
      sourceUpdatedDate: source.sourceUpdatedDate === null ? null : text(source.sourceUpdatedDate),
      currencyEvidence: researchId === 'addin-contact' ? null : 'explicit_taka_header',
      collector: null,
      recordedAt: null,
    });
  }
  const decisions: PublicationInventory['researchDecisions'] = researchListings.map((item) => {
    const published = catalog.listings.find((listing) => listing.researchIds.includes(item.id));
    if (published)
      return { researchId: item.id, disposition: 'published', listingId: published.id };
    const key = `${item.sourceId}:${item.sourceRow}`;
    const reason = publicationHolds[key]
      ? 'specific_review_hold'
      : item.branchId === 'bmu-ssh-shahbag' ||
          item.branchId === 'farabi-dhanmondi' ||
          item.branchId === 'holy-family-eskatan'
        ? 'currency_unconfirmed'
        : 'canonical_mapping_review_required';
    return { researchId: item.id, disposition: 'held', reason };
  });
  const represented = decisions.filter((item) => item.disposition === 'published').length;
  const inventory: PublicationInventory = {
    schemaVersion: 1,
    catalogId: catalog.id,
    reviewedAt,
    summary: {
      researchListings: researchListings.length,
      publishedListings: catalog.listings.length,
      representedResearchListings: represented,
      heldResearchListings: researchListings.length - represented,
      providers: catalog.providers.length,
      branches: catalog.branches.length,
      canonicalServices: catalog.services.length,
    },
    branches: branches.map((branch) => ({
      id: branch.id,
      publishedListings: catalog.listings.filter((item) => item.branchId === branch.id).length,
      heldResearchListings: researchListings.filter(
        (item) =>
          item.branchId === branch.id &&
          !catalog.listings.some((listing) => listing.researchIds.includes(item.id)),
      ).length,
    })),
    researchDecisions: decisions,
    holds: publicationHolds,
  };
  validateCatalog(catalog);
  return { catalog, inventory };
}
export function validateCatalog(catalog: ReviewedCatalog): void {
  const terms = new Set<string>();
  const ids = new Set<string>();
  for (const service of catalog.services) {
    if (ids.has(service.id)) throw new Error('Duplicate service ID');
    ids.add(service.id);
    for (const term of [service.name, ...service.aliases.map((alias) => alias.alias)]) {
      const key = normalizeText(term);
      if (terms.has(key)) throw new Error(`Duplicate canonical/alias term: ${term}`);
      terms.add(key);
    }
  }
  for (const listing of catalog.listings) {
    const branch = catalog.branches.find((branch) => branch.id === listing.branchId);
    const source = catalog.sources.find((source) => source.id === listing.sourceId);
    if (
      !branch ||
      !source ||
      source.providerId !== branch.providerId ||
      source.kind !== 'official_tariff' ||
      !source.currencyEvidence ||
      !ids.has(listing.serviceId) ||
      !Number.isSafeInteger(listing.amountMinor) ||
      listing.amountMinor < 1
    )
      throw new Error('Invalid publication relationship');
  }
}
function sql(value: string | number | null): string {
  return value === null
    ? 'NULL'
    : typeof value === 'number'
      ? String(value)
      : `'${value.replaceAll("'", "''")}'`;
}
function insert(table: string, columns: string[], values: (string | number | null)[]): string {
  return `INSERT INTO ${table}(${columns.join(',')}) SELECT ${values.map(sql).join(',')} WHERE NOT EXISTS (SELECT 1 FROM ${table} WHERE id = ${sql(values[0])});`;
}
export function seedStatements(catalog: ReviewedCatalog): string[] {
  validateCatalog(catalog);
  const statements: string[] = [];
  for (const category of new Map(
    catalog.services.map((service) => [service.categoryId, service.categoryName]),
  ))
    statements.push(
      insert(
        'categories',
        ['id', 'name', 'search_key'],
        [category[0], category[1], normalizeText(category[1])],
      ),
    );
  for (const service of catalog.services) {
    statements.push(
      insert(
        'services',
        ['id', 'category_id', 'name', 'search_key'],
        [service.id, service.categoryId, service.name, normalizeText(service.name)],
      ),
    );
    for (const alias of service.aliases)
      statements.push(
        insert(
          'service_aliases',
          ['id', 'service_id', 'alias', 'language', 'search_key'],
          [alias.id, service.id, alias.alias, alias.language, normalizeText(alias.alias)],
        ),
      );
  }
  for (const provider of catalog.providers)
    statements.push(
      insert(
        'providers',
        ['id', 'name', 'search_key'],
        [provider.id, provider.name, normalizeText(provider.name)],
      ),
    );
  for (const source of catalog.sources)
    statements.push(
      insert(
        'sources',
        [
          'id',
          'provider_id',
          'url',
          'kind',
          'retrieved_at',
          'sha256',
          'source_updated_date',
          'currency_evidence',
          'collector',
          'recorded_at',
          'notes',
        ],
        [
          source.id,
          source.providerId,
          source.url,
          source.kind,
          source.retrievedAt,
          source.sha256,
          source.sourceUpdatedDate,
          source.currencyEvidence,
          source.collector,
          source.recordedAt,
          source.collector
            ? 'Reviewed official website publication. No telephone or physical confirmation.'
            : null,
        ],
      ),
    );
  for (const branch of catalog.branches)
    statements.push(
      insert(
        'branches',
        ['id', 'provider_id', 'name', 'address', 'contact_source_id', 'phone', 'search_key'],
        [
          branch.id,
          branch.providerId,
          branch.name,
          branch.address,
          branch.contactSourceId,
          branch.phone,
          normalizeText(branch.name),
        ],
      ),
    );
  for (const listing of catalog.listings) {
    statements.push(
      insert(
        'branch_services',
        ['id', 'branch_id', 'service_id', 'provider_service_name'],
        [listing.id, listing.branchId, listing.serviceId, listing.providerServiceName],
      ),
    );
    statements.push(
      insert(
        'prices',
        [
          'id',
          'listing_id',
          'amount_minor',
          'status',
          'source_id',
          'source_row',
          'verified_at',
          'verification_method',
          'created_at',
        ],
        [
          listing.priceId,
          listing.id,
          listing.amountMinor,
          'verified',
          listing.sourceId,
          listing.sourceRow,
          listing.verifiedAt,
          'official_website_review',
          listing.verifiedAt,
        ],
      ),
    );
    statements.push(
      `UPDATE branch_services SET current_price_id = ${sql(listing.priceId)} WHERE id = ${sql(listing.id)} AND current_price_id IS NULL AND NOT EXISTS (SELECT 1 FROM seed_imports WHERE id = ${sql(catalog.id)})${listing.id === 'addin-moghbazar-complete-blood-count' ? " AND NOT EXISTS (SELECT 1 FROM seed_imports WHERE id = 'catalog-20261027')" : ''};`,
    );
  }
  statements.push(insert('seed_imports', ['id'], [catalog.id]));
  return statements;
}
export function seedFile(catalog: ReviewedCatalog): string {
  return (
    '-- Generated from reviewed official evidence. Preserve existing records and later administrator choices.\n' +
    seedStatements(catalog).join('\n') +
    '\n'
  );
}
export async function readReviewedInputs() {
  const [evidence, research, review] = await Promise.all(
    [
      'data/catalog/reviewed-evidence.json',
      'data/catalog/hospital-tariffs.json',
      'data/catalog/reviewed-selection.json',
    ].map(async (path) => JSON.parse(await readFile(path, 'utf8')) as unknown),
  );
  return buildReviewedCatalog(evidence, research, review);
}
