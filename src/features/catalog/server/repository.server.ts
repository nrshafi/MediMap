import { storedHours } from '../../providers/hours';
import { contactPhone, contactWebsite } from '../../providers/contracts';
import {
  catalogId,
  catalogQuery,
  listingQuery,
  record,
  type Branch,
  type BranchService,
  type CurrentPrice,
  type Page,
  type Service,
  type Source,
} from '../contracts';

function text(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0)
    throw new Error('Invalid stored text');
  return value;
}

function storedId(value: unknown): string {
  try {
    return catalogId(value);
  } catch {
    throw new Error('Invalid stored record ID');
  }
}

function isoTimestamp(value: unknown): string {
  const result = text(value);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(result) ||
    !Number.isFinite(Date.parse(result))
  ) {
    throw new Error('Invalid stored timestamp');
  }
  return result;
}

function date(value: unknown): string | null {
  if (value === null) return null;
  const result = text(value);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(result) ||
    new Date(result).toISOString().slice(0, 10) !== result
  ) {
    throw new Error('Invalid stored date');
  }
  return result;
}

function source(row: Record<string, unknown>, prefix: string): Source | null {
  if (row[`${prefix}id`] === null) return null;
  const url = new URL(text(row[`${prefix}url`]));
  if (url.protocol !== 'https:' || url.username || url.password)
    throw new Error('Invalid source URL');
  const kind = row[`${prefix}kind`];
  if (kind !== 'official_tariff' && kind !== 'official_contact')
    throw new Error('Invalid source kind');
  return {
    id: storedId(row[`${prefix}id`]),
    url: url.href,
    kind,
    retrievedAt: isoTimestamp(row[`${prefix}retrieved_at`]),
    sourceUpdatedDate: date(row[`${prefix}source_updated_date`]),
  };
}

function service(row: Record<string, unknown>): Omit<Service, 'aliases'> {
  return {
    id: storedId(row.service_id),
    name: text(row.service_name),
    category: { id: storedId(row.category_id), name: text(row.category_name) },
  };
}

function coordinate(value: unknown, bound: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > bound) {
    throw new Error('Invalid stored coordinate');
  }
  return value;
}

function branch(row: Record<string, unknown>): Branch {
  const coordinates =
    row.latitude === null && row.longitude === null
      ? null
      : {
          latitude: coordinate(row.latitude, 90),
          longitude: coordinate(row.longitude, 180),
        };
  const contactSource = source(row, 'contact_');
  if (contactSource !== null && contactSource.kind !== 'official_contact')
    throw new Error('Invalid contact source');
  return {
    id: storedId(row.branch_id),
    name: text(row.branch_name),
    provider: {
      id: storedId(row.provider_id),
      name: text(row.provider_name),
      phone: contactPhone(row.provider_phone),
      website: contactWebsite(row.provider_website),
    },
    address: text(row.address),
    phone: contactPhone(row.phone),
    alternativePhone: contactPhone(row.alternative_phone),
    website: contactWebsite(row.website),
    openingHours: storedHours(row.opening_hours),
    coordinates,
    contactSource,
  };
}

function price(row: Record<string, unknown>): CurrentPrice | null {
  if (row.price_id === null) return null;
  if (
    typeof row.amount_minor !== 'number' ||
    !Number.isSafeInteger(row.amount_minor) ||
    row.amount_minor <= 0 ||
    row.currency !== 'BDT'
  ) {
    throw new Error('Invalid stored price');
  }
  const status = row.status;
  if (status !== 'verified' && status !== 'unverified' && status !== 'disputed')
    throw new Error('Invalid price status');
  const evidence = source(row, 'price_source_');
  const verifiedAt = row.verified_at === null ? null : isoTimestamp(row.verified_at);
  const verificationMethod = row.verification_method;
  if (verificationMethod !== null && verificationMethod !== 'official_website_review')
    throw new Error('Invalid verification method');
  const sourceRow = row.source_row;
  if (
    sourceRow !== null &&
    (typeof sourceRow !== 'number' || !Number.isSafeInteger(sourceRow) || sourceRow < 1)
  ) {
    throw new Error('Invalid source row');
  }
  if (
    evidence &&
    (evidence.kind !== 'official_tariff' || row.price_source_provider_id !== row.provider_id)
  ) {
    throw new Error('Mismatched price source');
  }
  if (
    status === 'verified' &&
    (!evidence || !verifiedAt || !verificationMethod || !sourceRow || !row.currency_evidence)
  ) {
    throw new Error('Missing verification evidence');
  }
  return {
    id: storedId(row.price_id),
    amountMinor: row.amount_minor,
    amountBdt: row.amount_minor / 100,
    currency: 'BDT',
    status,
    verifiedAt,
    verificationMethod,
    source: evidence,
    sourceRow,
    effectiveDate: date(row.effective_date),
  };
}

const branchColumns = `b.id AS branch_id, b.name AS branch_name, b.address, b.phone, b.alternative_phone, b.website,
  b.opening_hours, b.latitude, b.longitude, p.id AS provider_id, p.name AS provider_name, p.phone AS provider_phone, p.website AS provider_website,
  cs.id AS contact_id, cs.url AS contact_url, cs.kind AS contact_kind,
  cs.retrieved_at AS contact_retrieved_at, cs.source_updated_date AS contact_source_updated_date`;
const branchJoins = `JOIN providers p ON p.id = b.provider_id AND p.active = 1
  LEFT JOIN sources cs ON cs.id = b.contact_source_id`;
const serviceColumns = `s.id AS service_id, s.name AS service_name,
  c.id AS category_id, c.name AS category_name`;
const serviceJoins = `JOIN categories c ON c.id = s.category_id AND c.active = 1`;
const listingSelect = `SELECT bs.id, bs.provider_service_name, ${serviceColumns}, ${branchColumns},
  pr.id AS price_id, pr.amount_minor, pr.currency, pr.status, pr.verified_at,
  pr.effective_date, pr.verification_method, pr.source_row,
  ps.id AS price_source_id, ps.url AS price_source_url, ps.kind AS price_source_kind,
  ps.retrieved_at AS price_source_retrieved_at, ps.source_updated_date AS price_source_source_updated_date,
  ps.provider_id AS price_source_provider_id, ps.currency_evidence
  FROM branch_services bs
  JOIN services s ON s.id = bs.service_id AND s.active = 1 ${serviceJoins}
  JOIN branches b ON b.id = bs.branch_id AND b.active = 1 ${branchJoins}
  LEFT JOIN prices pr ON pr.id = bs.current_price_id AND pr.listing_id = bs.id
  LEFT JOIN sources ps ON ps.id = pr.source_id
  WHERE bs.active = 1`;

function page<T extends { id: string }>(items: T[], limit: number): Page<T> {
  return {
    items: items.slice(0, limit),
    nextCursor: items.length > limit ? items[limit - 1].id : null,
  };
}

export class CatalogRepository {
  constructor(private readonly db: D1Database) {}

  async listCatalog(input: unknown = {}): Promise<Page<Service>> {
    const query = catalogQuery(input);
    const filter = `FROM services s ${serviceJoins} WHERE s.active = 1 AND s.id > ? ORDER BY s.id LIMIT ?`;
    const [results, aliasRows] = await this.db.batch<unknown>([
      this.db
        .prepare(`SELECT ${serviceColumns} ${filter}`)
        .bind(query.after ?? '', query.limit + 1),
      this.db
        .prepare(
          `SELECT a.service_id, a.alias, a.language FROM service_aliases a
        WHERE a.active = 1 AND a.service_id IN (SELECT s.id ${filter}) ORDER BY a.language, a.alias`,
        )
        .bind(query.after ?? '', query.limit + 1),
    ]);
    const aliases = new Map<string, Service['aliases']>();
    for (const value of aliasRows.results) {
      const row = record(value);
      const id = storedId(row.service_id);
      const language = row.language;
      if (language !== 'en' && language !== 'bn') throw new Error('Invalid alias language');
      const entries = aliases.get(id) ?? [];
      entries.push({ name: text(row.alias), language });
      aliases.set(id, entries);
    }
    const items = results.results.map((value) => {
      const result = service(record(value));
      return { ...result, aliases: aliases.get(result.id) ?? [] };
    });
    return page(items, query.limit);
  }

  async getService(input: unknown): Promise<Service | null> {
    const id = catalogId(input);
    const value = await this.db
      .prepare(
        `SELECT ${serviceColumns} FROM services s ${serviceJoins}
      WHERE s.id = ? AND s.active = 1`,
      )
      .bind(id)
      .first<unknown>();
    return value === null ? null : { ...service(record(value)), aliases: await this.aliases(id) };
  }

  private async aliases(id: string): Promise<Service['aliases']> {
    const rows = await this.db
      .prepare(
        'SELECT alias, language FROM service_aliases WHERE service_id = ? AND active = 1 ORDER BY language, alias',
      )
      .bind(id)
      .all<unknown>();
    return rows.results.map((value) => {
      const row = record(value);
      const language = row.language;
      if (language !== 'en' && language !== 'bn') throw new Error('Invalid alias language');
      return { name: text(row.alias), language };
    });
  }

  async getBranch(input: unknown): Promise<Branch | null> {
    const id = catalogId(input);
    const value = await this.db
      .prepare(
        `SELECT ${branchColumns} FROM branches b ${branchJoins}
      WHERE b.id = ? AND b.active = 1`,
      )
      .bind(id)
      .first<unknown>();
    return value === null ? null : branch(record(value));
  }

  async listBranchServices(input: unknown = {}): Promise<Page<BranchService>> {
    const query = listingQuery(input);
    const rows = await this.db
      .prepare(
        `${listingSelect}
      AND (? IS NULL OR s.id = ?) AND (? IS NULL OR b.id = ?) AND bs.id > ? ORDER BY bs.id LIMIT ?`,
      )
      .bind(
        query.serviceId ?? null,
        query.serviceId ?? null,
        query.branchId ?? null,
        query.branchId ?? null,
        query.after ?? '',
        query.limit + 1,
      )
      .all<unknown>();
    return page(
      rows.results.map((value) => this.listing(value)),
      query.limit,
    );
  }

  async getBranchService(input: unknown): Promise<BranchService | null> {
    const value = await this.db
      .prepare(`${listingSelect} AND bs.id = ?`)
      .bind(catalogId(input))
      .first<unknown>();
    return value === null ? null : this.listing(value);
  }

  private listing(value: unknown): BranchService {
    const row = record(value);
    return {
      id: storedId(row.id),
      providerServiceName: text(row.provider_service_name),
      service: service(row),
      branch: branch(row),
      price: price(row),
    };
  }
}
