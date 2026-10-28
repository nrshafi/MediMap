import { catalogId, catalogQuery, record, type Page } from '../catalog/contracts';
import { contactWebsite } from '../providers/contracts';

export const pricingMessages = {
  saved: 'Price, listing, or source change saved.',
  invalid_request:
    'Check the mapping, standard BDT amount, dates, source evidence, and confirmations.',
  duplicate: 'This source ID, snapshot, or branch-service listing already exists.',
  conflict: 'The listing changed. Reload it before saving another revision.',
  pending_report:
    'A pending price report keeps this listing disputed. Resolve the report before verifying another price.',
  unavailable: 'Pricing changes are unavailable. Reload before retrying.',
} as const;
export class PricingError extends Error {
  constructor(public readonly code: Exclude<keyof typeof pricingMessages, 'saved'>) {
    super(pricingMessages[code]);
  }
}
export type PriceStatus = 'verified' | 'unverified' | 'disputed';
export type SourceRecord = {
  id: string;
  providerId: string;
  url: string;
  kind: 'official_tariff' | 'official_contact';
  retrievedAt: string;
  sha256: string;
  sourceUpdatedDate: string | null;
  currencyEvidence: 'explicit_taka_header' | 'explicit_taka_symbol' | null;
  collector: string | null;
  notes: string | null;
  recordedBy: string | null;
  recordedAt: string | null;
};
export type PriceRecord = {
  id: string;
  listingId: string;
  amountMinor: number;
  status: PriceStatus;
  sourceId: string | null;
  sourceRow: number | null;
  verifiedAt: string | null;
  effectiveDate: string | null;
  verificationMethod: string | null;
  createdAt: string;
  notes: string | null;
  createdBy: string | null;
};
export type ListingRecord = {
  id: string;
  branchId: string;
  branchName: string;
  providerId: string;
  providerName: string;
  serviceId: string;
  serviceName: string;
  providerServiceName: string;
  active: boolean;
  revision: number;
  currentPriceId: string | null;
  price: PriceRecord | null;
};
export type Choice = { id: string; name: string };
export type PricingData = {
  providers: Page<Choice>;
  branches: Page<Choice>;
  services: Page<Choice>;
  sources: Page<SourceRecord>;
  listings: Page<ListingRecord>;
  selected: ListingRecord | null;
  provider: Choice | null;
  history: Page<PriceRecord>;
  selectedSource: SourceRecord | null;
};
export type PricingEdit =
  | {
      entity: 'source';
      id: string;
      providerId: string;
      url: string;
      kind: SourceRecord['kind'];
      retrievedAt: string;
      sha256: string;
      sourceUpdatedDate: string | null;
      currencyEvidence: SourceRecord['currencyEvidence'];
      collector: string;
      notes: string | null;
    }
  | {
      entity: 'listing';
      mode: 'create';
      id: string;
      branchId: string;
      serviceId: string;
      providerServiceName: string;
      active: boolean;
    }
  | {
      entity: 'listing';
      mode: 'update';
      id: string;
      revision: number;
      providerServiceName: string;
      active: boolean;
    }
  | { entity: 'price'; id: string; revision: number; action: 'clear' }
  | {
      entity: 'price';
      id: string;
      revision: number;
      action: 'set';
      amountMinor: number;
      status: PriceStatus;
      sourceId: string | null;
      sourceRow: number | null;
      effectiveDate: string | null;
      confirmReview: boolean;
      notes: string | null;
    };

export function label(value: unknown, maximum = 180): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > maximum ||
    /[<>]/.test(value) ||
    [...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
  )
    throw new PricingError('invalid_request');
  return value.trim();
}
function optionalText(value: unknown): string | null {
  if (value === undefined || value === '') return null;
  if (
    typeof value !== 'string' ||
    value.length > 1000 ||
    [...value].some((char) => {
      const code = char.charCodeAt(0);
      return (code < 32 && ![9, 10, 13].includes(code)) || code === 127;
    })
  )
    throw new PricingError('invalid_request');
  return value.trim() || null;
}
export function amountMinor(value: unknown): number {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d{0,13})(?:\.\d{1,2})?$/.test(value))
    throw new PricingError('invalid_request');
  const [whole, decimals = ''] = value.split('.');
  const minor = BigInt(whole) * 100n + BigInt(decimals.padEnd(2, '0'));
  if (minor <= 0n || minor > BigInt(Number.MAX_SAFE_INTEGER))
    throw new PricingError('invalid_request');
  return Number(minor);
}
export function utcTimestamp(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().replace('.000Z', 'Z') !== value.replace('.000Z', 'Z')
  )
    throw new PricingError('invalid_request');
  return value;
}
function optionalDate(value: unknown): string | null {
  if (value === undefined || value === '') return null;
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    throw new PricingError('invalid_request');
  return value;
}
function revision(value: unknown): number {
  if (
    typeof value !== 'string' ||
    !/^[1-9]\d*$/.test(value) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) >= Number.MAX_SAFE_INTEGER
  )
    throw new PricingError('invalid_request');
  return Number(value);
}
export function parsePricingEdit(value: unknown, now = Date.now()): PricingEdit {
  try {
    const input = record(value);
    const id = catalogId(input.id);
    if (input.entity === 'source') {
      const url = contactWebsite(input.url);
      const kind = input.kind;
      if (
        !url?.startsWith('https://') ||
        (kind !== 'official_tariff' && kind !== 'official_contact') ||
        typeof input.sha256 !== 'string' ||
        !/^[a-fA-F0-9]{64}$/.test(input.sha256) ||
        input.confirmSource !== 'yes'
      )
        throw new Error();
      const retrievedAt = utcTimestamp(input.retrievedAt);
      if (Date.parse(retrievedAt) > now) throw new Error();
      const sourceUpdatedDate = optionalDate(input.sourceUpdatedDate);
      if (
        sourceUpdatedDate &&
        sourceUpdatedDate >
          new Date(Date.parse(retrievedAt) + 6 * 3600000).toISOString().slice(0, 10)
      )
        throw new Error();
      const currencyEvidence =
        input.currencyEvidence === '' || input.currencyEvidence === undefined
          ? null
          : input.currencyEvidence;
      if (
        currencyEvidence !== null &&
        currencyEvidence !== 'explicit_taka_header' &&
        currencyEvidence !== 'explicit_taka_symbol'
      )
        throw new Error();
      return {
        entity: 'source',
        id,
        providerId: catalogId(input.providerId),
        url,
        kind,
        retrievedAt,
        sha256: input.sha256.toLowerCase(),
        sourceUpdatedDate,
        currencyEvidence: kind === 'official_contact' ? null : currencyEvidence,
        collector: label(input.collector, 120),
        notes: optionalText(input.notes),
      };
    }
    if (input.entity === 'listing') {
      if (input.confirmMapping !== 'yes' || (input.active !== '0' && input.active !== '1'))
        throw new Error();
      const base = {
        entity: 'listing' as const,
        id,
        providerServiceName: label(input.providerServiceName),
        active: input.active === '1',
      };
      if (input.mode === 'create')
        return {
          ...base,
          mode: 'create',
          branchId: catalogId(input.branchId),
          serviceId: catalogId(input.serviceId),
        };
      if (input.mode === 'update')
        return { ...base, mode: 'update', revision: revision(input.revision) };
      throw new Error();
    }
    if (input.entity !== 'price') throw new Error();
    const base = { entity: 'price' as const, id, revision: revision(input.revision) };
    if (input.action === 'clear' && input.confirmClear === 'yes')
      return { ...base, action: 'clear' };
    if (input.action !== 'set' || input.standardPrice !== 'yes') throw new Error();
    if (input.status !== 'verified' && input.status !== 'unverified' && input.status !== 'disputed')
      throw new Error();
    const sourceId =
      input.sourceId === '' || input.sourceId === undefined ? null : catalogId(input.sourceId);
    const sourceRow =
      input.sourceRow === '' || input.sourceRow === undefined ? null : revision(input.sourceRow);
    const confirmReview = input.confirmReview === 'yes';
    if (confirmReview && (!sourceId || !sourceRow)) throw new Error();
    if (
      (!sourceId && sourceRow !== null) ||
      (input.status === 'verified' && (!sourceId || !sourceRow || !confirmReview))
    )
      throw new Error();
    const effectiveDate = optionalDate(input.effectiveDate);
    if (effectiveDate && effectiveDate > new Date(now + 6 * 3600000).toISOString().slice(0, 10))
      throw new Error();
    return {
      ...base,
      action: 'set',
      amountMinor: amountMinor(input.amount),
      status: input.status,
      sourceId,
      sourceRow,
      effectiveDate,
      confirmReview,
      notes: optionalText(input.notes),
    };
  } catch {
    throw new PricingError('invalid_request');
  }
}
export function pricingQuery(value: unknown) {
  const input = record(value);
  const id = (key: string) =>
    input[key] === undefined || input[key] === '' ? undefined : catalogId(input[key]);
  return {
    providerId: id('provider'),
    listingId: id('listing'),
    providers: catalogQuery({ after: id('providerAfter') }),
    branches: catalogQuery({ after: id('branchAfter') }),
    services: catalogQuery({ after: id('serviceAfter') }),
    listings: catalogQuery({ after: id('after') }),
    sources: catalogQuery({ after: id('sourceAfter') }),
    history: catalogQuery({ after: id('historyAfter') }),
  };
}
export function pricingHref(input: Record<string, string | undefined> = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) if (value) query.set(key, value);
  return `/admin/prices${query.size ? `?${query}` : ''}`;
}
