import type { D1Database } from '@cloudflare/workers-types';
import { CatalogRepository } from '../../src/features/catalog/server/repository.server';
import type { ReviewedCatalog } from '../data/reviewedCatalog';
import { normalizeText } from '../../src/features/search/normalizer';

export type CatalogAudit = {
  catalogId: string;
  expectedListings: number;
  storedSeedPrices: number;
  publicActiveListings: number;
  verifiedCurrentListings: number;
  overrides: { id: string; reason: string }[];
  issues: { id: string; kind: 'missing' | 'conflict'; reason: string }[];
};
export async function auditReviewedCatalog(
  db: D1Database,
  catalog: ReviewedCatalog,
): Promise<CatalogAudit> {
  const result: CatalogAudit = {
    catalogId: catalog.id,
    expectedListings: catalog.listings.length,
    storedSeedPrices: 0,
    publicActiveListings: 0,
    verifiedCurrentListings: 0,
    overrides: [],
    issues: [],
  };
  const wanted: Record<string, string[]> = {
    categories: [...new Set(catalog.services.map((item) => item.categoryId))],
    services: catalog.services.map((item) => item.id),
    service_aliases: catalog.services.flatMap((item) => item.aliases.map((alias) => alias.id)),
    providers: catalog.providers.map((item) => item.id),
    sources: catalog.sources.map((item) => item.id),
    branches: catalog.branches.map((item) => item.id),
    branch_services: catalog.listings.map((item) => item.id),
    prices: catalog.listings.map((item) => item.priceId),
  };
  const stored = new Map<string, Map<string, Record<string, unknown>>>();
  for (const [table, ids] of Object.entries(wanted)) {
    const rows = new Map<string, Record<string, unknown>>();
    for (let start = 0; start < ids.length; start += 50) {
      const chunk = ids.slice(start, start + 50);
      const records = await db
        .prepare(`SELECT * FROM ${table} WHERE id IN (${chunk.map(() => '?').join(',')})`)
        .bind(...chunk)
        .all<Record<string, unknown>>();
      for (const record of records.results) {
        if (typeof record.id !== 'string') throw new Error('Invalid stored catalog ID');
        rows.set(record.id, record);
      }
    }
    stored.set(table, rows);
  }
  function row(table: string, id: string) {
    const value = stored.get(table)?.get(id);
    if (!value)
      result.issues.push({ id, kind: 'missing', reason: `Missing reviewed ${table} record` });
    return value;
  }
  function conflict(id: string, reason: string) {
    result.issues.push({ id, kind: 'conflict', reason });
  }
  function editable(actual: Record<string, unknown>, expected: Record<string, unknown>) {
    if (
      Object.entries(expected).some(([key, value]) => actual[key] !== value) ||
      actual.active !== 1
    ) {
      if (typeof actual.revision === 'number' && actual.revision > 1)
        result.overrides.push({
          id: String(actual.id),
          reason: 'Retained administrator changes to reviewed metadata or activation',
        });
      else
        conflict(
          String(actual.id),
          'Existing metadata differs from the reviewed definition without a later revision',
        );
    }
  }
  for (const item of catalog.providers) {
    const actual = row('providers', item.id);
    if (actual) editable(actual, { name: item.name, search_key: normalizeText(item.name) });
  }
  for (const item of catalog.services) {
    const actual = row('services', item.id);
    if (actual)
      editable(actual, {
        category_id: item.categoryId,
        name: item.name,
        search_key: normalizeText(item.name),
      });
    for (const alias of item.aliases) {
      const saved = row('service_aliases', alias.id);
      if (saved) {
        if (saved.service_id !== item.id) conflict(alias.id, 'Alias ownership differs');
        editable(saved, {
          alias: alias.alias,
          language: alias.language,
          search_key: normalizeText(alias.alias),
        });
      }
    }
  }
  for (const [id, name] of new Map(
    catalog.services.map((item) => [item.categoryId, item.categoryName]),
  )) {
    const actual = row('categories', id);
    if (actual) editable(actual, { name, search_key: normalizeText(name) });
  }
  for (const item of catalog.branches) {
    const actual = row('branches', item.id);
    if (actual) {
      if (actual.provider_id !== item.providerId) conflict(item.id, 'Branch ownership differs');
      editable(actual, {
        name: item.name,
        address: item.address,
        contact_source_id: item.contactSourceId,
        phone: item.phone,
        search_key: normalizeText(item.name),
      });
    }
  }
  for (const item of catalog.sources) {
    const actual = row('sources', item.id);
    if (
      actual &&
      Object.entries({
        provider_id: item.providerId,
        url: item.url,
        kind: item.kind,
        retrieved_at: item.retrievedAt,
        sha256: item.sha256,
        source_updated_date: item.sourceUpdatedDate,
        currency_evidence: item.currencyEvidence,
        collector: item.collector,
        recorded_at: item.recordedAt,
      }).some(([key, value]) => actual[key] !== value)
    )
      conflict(item.id, 'Immutable source evidence differs from the reviewed snapshot');
  }
  for (const item of catalog.listings) {
    const actual = row('branch_services', item.id);
    if (actual) {
      if (actual.branch_id !== item.branchId || actual.service_id !== item.serviceId)
        conflict(item.id, 'Listing ownership or canonical mapping differs');
      editable(actual, { provider_service_name: item.providerServiceName });
      if (actual.current_price_id !== item.priceId)
        result.overrides.push({
          id: item.id,
          reason: 'Current price choice differs from the reviewed seed and was retained',
        });
    }
    const price = row('prices', item.priceId);
    if (price) {
      result.storedSeedPrices++;
      if (
        Object.entries({
          listing_id: item.id,
          amount_minor: item.amountMinor,
          currency: 'BDT',
          status: 'verified',
          source_id: item.sourceId,
          source_row: item.sourceRow,
          verified_at: item.verifiedAt,
          verification_method: 'official_website_review',
          effective_date: null,
        }).some(([key, value]) => price[key] !== value)
      )
        conflict(item.priceId, 'Immutable seeded price or review evidence differs');
    }
  }
  const expectedIds = new Set(catalog.listings.map((item) => item.id));
  const repository = new CatalogRepository(db);
  let after: string | undefined;
  do {
    const page = await repository.listBranchServices({ limit: 100, ...(after ? { after } : {}) });
    for (const listing of page.items) {
      if (expectedIds.has(listing.id)) {
        result.publicActiveListings++;
        if (listing.price?.status === 'verified') result.verifiedCurrentListings++;
      }
    }
    after = page.nextCursor ?? undefined;
  } while (after);
  return result;
}
