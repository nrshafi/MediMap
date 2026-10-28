import type { WeeklyHours } from '../providers/hours';

export type Source = {
  id: string;
  url: string;
  kind: 'official_tariff' | 'official_contact';
  retrievedAt: string;
  sourceUpdatedDate: string | null;
};

export type Service = {
  id: string;
  name: string;
  category: { id: string; name: string };
  aliases: { name: string; language: 'en' | 'bn' }[];
};

export type Branch = {
  id: string;
  name: string;
  provider: { id: string; name: string; phone: string | null; website: string | null };
  address: string;
  phone: string | null;
  alternativePhone: string | null;
  website: string | null;
  openingHours: WeeklyHours | null;
  coordinates: { latitude: number; longitude: number } | null;
  contactSource: Source | null;
};

export type CurrentPrice = {
  id: string;
  amountMinor: number;
  amountBdt: number;
  currency: 'BDT';
  status: 'verified' | 'unverified' | 'disputed';
  verifiedAt: string | null;
  effectiveDate: string | null;
  verificationMethod: 'official_website_review' | null;
  source: Source | null;
  sourceRow: number | null;
};

export type BranchService = {
  id: string;
  providerServiceName: string;
  service: Omit<Service, 'aliases'>;
  branch: Branch;
  price: CurrentPrice | null;
};

export type Page<T> = { items: T[]; nextCursor: string | null };
export type CatalogQuery = { after?: string; limit: number };
export type ListingQuery = CatalogQuery & { serviceId?: string; branchId?: string };
export type CatalogResult<T> =
  { ok: true; data: T } | { ok: false; code: 'invalid_request' | 'unavailable'; message: string };

export class InvalidCatalogRequest extends Error {
  constructor() {
    super('Invalid catalog request. Use a record ID and a limit from 1 to 100.');
  }
}

export function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new InvalidCatalogRequest();
  }
  return Object.fromEntries(Object.entries(value));
}

export function catalogId(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ||
    value.length > 120
  ) {
    throw new InvalidCatalogRequest();
  }
  return value;
}

export function catalogQuery(value: unknown): CatalogQuery {
  const input = record(value);
  const limit = input.limit === undefined ? 50 : input.limit;
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new InvalidCatalogRequest();
  }
  return { limit, ...(input.after === undefined ? {} : { after: catalogId(input.after) }) };
}

export function listingQuery(value: unknown): ListingQuery {
  const input = record(value);
  return {
    ...catalogQuery(input),
    ...(input.serviceId === undefined ? {} : { serviceId: catalogId(input.serviceId) }),
    ...(input.branchId === undefined ? {} : { branchId: catalogId(input.branchId) }),
  };
}
