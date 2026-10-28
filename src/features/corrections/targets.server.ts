import { catalogId, record } from '../catalog/contracts';
import { storedHours } from '../providers/hours';
import { contactPhone, contactWebsite } from '../providers/contracts';
import { utcTimestamp } from '../pricing/contracts';
import { reportTargetQuery, type ReportTarget, type ReportPrice } from './contracts';

function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Invalid stored report target');
  return value;
}
function nullable(value: unknown): string | null {
  return value === null ? null : text(value);
}
function revision(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1)
    throw new Error('Invalid target revision');
  return value;
}
function price(row: Record<string, unknown>): ReportPrice | null {
  if (row.current_price_id === null) return null;
  if (
    typeof row.amount_minor !== 'number' ||
    !Number.isSafeInteger(row.amount_minor) ||
    row.amount_minor < 1 ||
    row.currency !== 'BDT' ||
    !['verified', 'unverified', 'disputed'].includes(String(row.status)) ||
    (row.source_row !== null &&
      (typeof row.source_row !== 'number' ||
        !Number.isSafeInteger(row.source_row) ||
        row.source_row < 1))
  )
    throw new Error('Invalid reported price');
  const status = row.status;
  if (status !== 'verified' && status !== 'unverified' && status !== 'disputed')
    throw new Error('Invalid price status');
  return {
    id: catalogId(row.current_price_id),
    amountMinor: row.amount_minor,
    status,
    sourceId: row.source_id === null ? null : catalogId(row.source_id),
    sourceRow: row.source_row,
    verifiedAt: row.verified_at === null ? null : utcTimestamp(row.verified_at),
    effectiveDate: nullable(row.effective_date),
    verificationMethod: nullable(row.verification_method),
  };
}
export async function readReportTarget(
  db: D1Database,
  inputValue: unknown,
  includeInactive = false,
): Promise<ReportTarget | null> {
  const input = reportTargetQuery(inputValue);
  if (input.target === 'provider') {
    const value = await db
      .prepare(
        `SELECT id, name, phone, website, revision FROM providers WHERE id = ? ${includeInactive ? '' : 'AND active = 1'}`,
      )
      .bind(input.id)
      .first<unknown>();
    if (value === null) return null;
    const row = record(value);
    return {
      kind: 'provider',
      id: catalogId(row.id),
      revision: revision(row.revision),
      providerId: catalogId(row.id),
      providerName: text(row.name),
      branchId: null,
      listingId: null,
      branchName: null,
      serviceName: null,
      providerServiceName: null,
      address: null,
      phone: contactPhone(row.phone),
      website: contactWebsite(row.website),
      openingHours: null,
      price: null,
    };
  }
  const branchColumns = `b.id AS branch_id, b.name AS branch_name, b.address, b.phone, b.website, b.opening_hours, p.id AS provider_id, p.name AS provider_name`;
  const value =
    input.target === 'branch'
      ? await db
          .prepare(
            `SELECT b.id, b.revision, ${branchColumns} FROM branches b JOIN providers p ON p.id = b.provider_id ${includeInactive ? '' : 'AND p.active = 1'} WHERE b.id = ? ${includeInactive ? '' : 'AND b.active = 1'}`,
          )
          .bind(input.id)
          .first<unknown>()
      : await db
          .prepare(
            `SELECT bs.id, bs.revision, bs.provider_service_name, bs.current_price_id, s.name AS service_name, ${branchColumns},
      pr.amount_minor, pr.currency, pr.status, pr.source_id, pr.source_row, pr.verified_at, pr.effective_date, pr.verification_method
      FROM branch_services bs JOIN branches b ON b.id = bs.branch_id ${includeInactive ? '' : 'AND b.active = 1'} JOIN providers p ON p.id = b.provider_id ${includeInactive ? '' : 'AND p.active = 1'}
      JOIN services s ON s.id = bs.service_id ${includeInactive ? '' : 'AND s.active = 1'} JOIN categories c ON c.id = s.category_id ${includeInactive ? '' : 'AND c.active = 1'}
      LEFT JOIN prices pr ON pr.id = bs.current_price_id AND pr.listing_id = bs.id WHERE bs.id = ? ${includeInactive ? '' : 'AND bs.active = 1'}`,
          )
          .bind(input.id)
          .first<unknown>();
  if (value === null) return null;
  const row = record(value);
  return {
    kind: input.target,
    id: catalogId(row.id),
    revision: revision(row.revision),
    providerId: catalogId(row.provider_id),
    providerName: text(row.provider_name),
    branchId: catalogId(row.branch_id),
    listingId: input.target === 'listing' ? catalogId(row.id) : null,
    branchName: text(row.branch_name),
    serviceName: input.target === 'listing' ? text(row.service_name) : null,
    providerServiceName: input.target === 'listing' ? text(row.provider_service_name) : null,
    address: text(row.address),
    phone: contactPhone(row.phone),
    website: contactWebsite(row.website),
    openingHours: storedHours(row.opening_hours),
    price: input.target === 'listing' ? price(row) : null,
  };
}
