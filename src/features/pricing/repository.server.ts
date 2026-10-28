import {
  catalogId,
  record,
  InvalidCatalogRequest,
  type Page,
  type CatalogQuery,
} from '../catalog/contracts';
import {
  utcTimestamp,
  PricingError,
  pricingQuery,
  type PricingEdit,
  type SourceRecord,
  type PriceRecord,
  type ListingRecord,
  type PricingData,
  type Choice,
} from './contracts';

function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Invalid stored pricing text');
  return value;
}
function nullable(value: unknown): string | null {
  return value === null ? null : text(value);
}
function source(value: unknown): SourceRecord {
  const row = record(value);
  const kind = row.kind;
  const currency = row.currency_evidence;
  const url = new URL(text(row.url));
  if (
    (kind !== 'official_tariff' && kind !== 'official_contact') ||
    (currency !== null &&
      currency !== 'explicit_taka_header' &&
      currency !== 'explicit_taka_symbol') ||
    !/^[a-f0-9]{64}$/.test(text(row.sha256)) ||
    url.protocol !== 'https:' ||
    url.username ||
    url.password
  )
    throw new Error('Invalid stored source');
  return {
    id: catalogId(row.id),
    providerId: catalogId(row.provider_id),
    kind,
    url: url.href,
    sha256: text(row.sha256),
    retrievedAt: utcTimestamp(row.retrieved_at),
    sourceUpdatedDate: nullable(row.source_updated_date),
    currencyEvidence: currency,
    collector: nullable(row.collector),
    notes: nullable(row.notes),
    recordedBy: nullable(row.recorded_by),
    recordedAt: row.recorded_at === null ? null : utcTimestamp(row.recorded_at),
  };
}
function price(value: unknown): PriceRecord {
  const row = record(value);
  if (
    typeof row.amount_minor !== 'number' ||
    !Number.isSafeInteger(row.amount_minor) ||
    row.amount_minor <= 0 ||
    row.currency !== 'BDT' ||
    (row.status !== 'verified' && row.status !== 'unverified' && row.status !== 'disputed') ||
    (row.source_row !== null &&
      (typeof row.source_row !== 'number' ||
        !Number.isSafeInteger(row.source_row) ||
        row.source_row <= 0))
  )
    throw new Error('Invalid stored price');
  return {
    id: catalogId(row.id),
    listingId: catalogId(row.listing_id),
    amountMinor: row.amount_minor,
    status: row.status,
    sourceId: row.source_id === null ? null : catalogId(row.source_id),
    sourceRow: row.source_row,
    verifiedAt: row.verified_at === null ? null : utcTimestamp(row.verified_at),
    effectiveDate: nullable(row.effective_date),
    verificationMethod: nullable(row.verification_method),
    createdAt: utcTimestamp(row.created_at),
    notes: nullable(row.notes),
    createdBy: nullable(row.created_by),
  };
}
function listing(value: unknown): ListingRecord {
  const row = record(value);
  if (
    (row.active !== 0 && row.active !== 1) ||
    typeof row.revision !== 'number' ||
    !Number.isSafeInteger(row.revision) ||
    row.revision < 1
  )
    throw new Error('Invalid stored listing');
  const currentPriceId = row.current_price_id === null ? null : catalogId(row.current_price_id);
  const current =
    currentPriceId === null
      ? null
      : price(
          Object.fromEntries(
            Object.entries(row)
              .filter(([key]) => key.startsWith('price_'))
              .map(([key, value]) => [key.slice(6), value]),
          ),
        );
  if (current && (current.id !== currentPriceId || current.listingId !== row.id))
    throw new Error('Invalid current price');
  return {
    id: catalogId(row.id),
    branchId: catalogId(row.branch_id),
    branchName: text(row.branch_name),
    providerId: catalogId(row.provider_id),
    providerName: text(row.provider_name),
    serviceId: catalogId(row.service_id),
    serviceName: text(row.service_name),
    providerServiceName: text(row.provider_service_name),
    active: row.active === 1,
    revision: row.revision,
    currentPriceId,
    price: current,
  };
}
function choice(value: unknown): Choice {
  const row = record(value);
  return { id: catalogId(row.id), name: text(row.name) };
}
function page<T extends { id: string }>(
  values: unknown[],
  query: CatalogQuery,
  decode: (value: unknown) => T,
): Page<T> {
  const items = values.slice(0, query.limit).map(decode);
  return { items, nextCursor: values.length > query.limit ? (items.at(-1)?.id ?? null) : null };
}
const priceColumns = [
  'id',
  'listing_id',
  'amount_minor',
  'currency',
  'status',
  'source_id',
  'source_row',
  'verified_at',
  'effective_date',
  'verification_method',
  'created_at',
  'notes',
  'created_by',
];
const listingSelect = `SELECT bs.*, b.name AS branch_name, b.provider_id, p.name AS provider_name, s.name AS service_name,
  ${priceColumns.map((name) => `pr.${name} AS price_${name}`).join(', ')} FROM branch_services bs
  JOIN branches b ON b.id = bs.branch_id JOIN providers p ON p.id = b.provider_id JOIN services s ON s.id = bs.service_id
  LEFT JOIN prices pr ON pr.id = bs.current_price_id AND pr.listing_id = bs.id`;
const selectedProvider =
  'COALESCE(?, (SELECT b.provider_id FROM branch_services bs JOIN branches b ON b.id = bs.branch_id WHERE bs.id = ?))';

export class PricingRepository {
  constructor(private readonly db: D1Database) {}
  async read(input: unknown): Promise<PricingData> {
    const query = pricingQuery(input);
    const args = [query.providerId ?? null, query.listingId ?? ''];
    const [
      providers,
      branches,
      services,
      sources,
      listings,
      selected,
      provider,
      history,
      selectedSource,
    ] = await this.db.batch<unknown>([
      this.db
        .prepare('SELECT id, name FROM providers WHERE id > ? ORDER BY id LIMIT ?')
        .bind(query.providers.after ?? '', query.providers.limit + 1),
      this.db
        .prepare(
          `SELECT id, name FROM branches WHERE provider_id = ${selectedProvider} AND id > ? ORDER BY id LIMIT ?`,
        )
        .bind(...args, query.branches.after ?? '', query.branches.limit + 1),
      this.db
        .prepare('SELECT id, name FROM services WHERE id > ? ORDER BY id LIMIT ?')
        .bind(query.services.after ?? '', query.services.limit + 1),
      this.db
        .prepare(
          `SELECT * FROM sources WHERE provider_id = ${selectedProvider} AND id > ? ORDER BY id LIMIT ?`,
        )
        .bind(...args, query.sources.after ?? '', query.sources.limit + 1),
      this.db
        .prepare(
          `${listingSelect} WHERE (? IS NULL OR b.provider_id = ?) AND bs.id > ? ORDER BY bs.id LIMIT ?`,
        )
        .bind(
          query.providerId ?? null,
          query.providerId ?? null,
          query.listings.after ?? '',
          query.listings.limit + 1,
        ),
      this.db.prepare(`${listingSelect} WHERE bs.id = ?`).bind(query.listingId ?? ''),
      this.db
        .prepare(`SELECT id, name FROM providers WHERE id = ${selectedProvider}`)
        .bind(...args),
      this.db
        .prepare('SELECT * FROM prices WHERE listing_id = ? AND id > ? ORDER BY id LIMIT ?')
        .bind(query.listingId ?? '', query.history.after ?? '', query.history.limit + 1),
      this.db
        .prepare(
          'SELECT s.* FROM sources s JOIN prices pr ON pr.source_id = s.id JOIN branch_services bs ON bs.current_price_id = pr.id WHERE bs.id = ?',
        )
        .bind(query.listingId ?? ''),
    ]);
    const current = selected.results[0] ? listing(selected.results[0]) : null;
    if (current && query.providerId && current.providerId !== query.providerId)
      throw new InvalidCatalogRequest();
    return {
      providers: page(providers.results, query.providers, choice),
      branches: page(branches.results, query.branches, choice),
      services: page(services.results, query.services, choice),
      sources: page(sources.results, query.sources, source),
      listings: page(listings.results, query.listings, listing),
      selected: current,
      provider: provider.results[0] ? choice(provider.results[0]) : null,
      history: page(history.results, query.history, price),
      selectedSource: selectedSource.results[0] ? source(selectedSource.results[0]) : null,
    };
  }

  async save(
    edit: PricingEdit,
    actorId: string,
    now = Date.now(),
  ): Promise<{ provider?: string; listing?: string }> {
    const timestamp = new Date(now).toISOString();
    try {
      if (edit.entity === 'source') {
        await this.db
          .prepare(
            'INSERT INTO sources(id, provider_id, url, kind, retrieved_at, sha256, source_updated_date, currency_evidence, collector, notes, recorded_by, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          )
          .bind(
            edit.id,
            edit.providerId,
            edit.url,
            edit.kind,
            edit.retrievedAt,
            edit.sha256,
            edit.sourceUpdatedDate,
            edit.currencyEvidence,
            edit.collector,
            edit.notes,
            actorId,
            timestamp,
          )
          .run();
        return { provider: edit.providerId };
      }
      if (edit.entity === 'listing' && edit.mode === 'create') {
        await this.db
          .prepare(
            'INSERT INTO branch_services(id, branch_id, service_id, provider_service_name, active) VALUES (?, ?, ?, ?, ?)',
          )
          .bind(
            edit.id,
            edit.branchId,
            edit.serviceId,
            edit.providerServiceName,
            Number(edit.active),
          )
          .run();
        return { listing: edit.id };
      }
      const guard = this.db
        .prepare(
          `INSERT INTO listing_changes(id, listing_id, previous_revision, previous_label, previous_active, previous_price_id, actor_id, action, created_at)
        VALUES (?, ?, ?, (SELECT provider_service_name FROM branch_services WHERE id = ?), (SELECT active FROM branch_services WHERE id = ?), (SELECT current_price_id FROM branch_services WHERE id = ?), ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          edit.id,
          edit.revision,
          edit.id,
          edit.id,
          edit.id,
          actorId,
          edit.entity === 'listing' ? 'listing' : edit.action === 'clear' ? 'clear' : 'price',
          timestamp,
        );
      if (edit.entity === 'listing') {
        await this.db.batch([
          guard,
          this.db
            .prepare(
              'UPDATE branch_services SET provider_service_name = ?, active = ?, revision = revision + 1 WHERE id = ? AND revision = ?',
            )
            .bind(edit.providerServiceName, Number(edit.active), edit.id, edit.revision),
        ]);
      } else if (edit.action === 'clear') {
        await this.db.batch([
          guard,
          this.db
            .prepare(
              'UPDATE branch_services SET current_price_id = NULL, revision = revision + 1 WHERE id = ? AND revision = ?',
            )
            .bind(edit.id, edit.revision),
        ]);
      } else {
        const value = await this.db
          .prepare(`${listingSelect} WHERE bs.id = ? AND bs.revision = ?`)
          .bind(edit.id, edit.revision)
          .first<unknown>();
        if (value === null) throw new PricingError('conflict');
        const previous = listing(value).price;
        const sameEvidence =
          previous &&
          previous.amountMinor === edit.amountMinor &&
          previous.sourceId === edit.sourceId &&
          previous.sourceRow === edit.sourceRow &&
          previous.effectiveDate === edit.effectiveDate;
        const verifiedAt = edit.confirmReview
          ? timestamp
          : sameEvidence
            ? previous.verifiedAt
            : null;
        const verificationMethod = verifiedAt ? 'official_website_review' : null;
        const id = crypto.randomUUID();
        await this.db.batch([
          guard,
          this.db
            .prepare(
              'INSERT INTO prices(id, listing_id, amount_minor, status, source_id, source_row, verified_at, verification_method, effective_date, created_at, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            )
            .bind(
              id,
              edit.id,
              edit.amountMinor,
              edit.status,
              edit.sourceId,
              edit.sourceRow,
              verifiedAt,
              verificationMethod,
              edit.effectiveDate,
              timestamp,
              edit.notes,
              actorId,
            ),
          this.db
            .prepare(
              'UPDATE branch_services SET current_price_id = ?, revision = revision + 1 WHERE id = ? AND revision = ?',
            )
            .bind(id, edit.id, edit.revision),
        ]);
      }
      return { listing: edit.id };
    } catch (error) {
      if (error instanceof PricingError) throw error;
      const message = error instanceof Error ? error.message : '';
      if (message.includes('pricing_conflict') || message.includes('listing_changes.listing_id'))
        throw new PricingError('conflict');
      if (message.includes('UNIQUE constraint failed')) throw new PricingError('duplicate');
      if (
        message.includes('FOREIGN KEY constraint failed') ||
        message.includes('pricing_invalid') ||
        message.includes('Verified price requires')
      )
        throw new PricingError('invalid_request');
      throw new PricingError('unavailable');
    }
  }
}
