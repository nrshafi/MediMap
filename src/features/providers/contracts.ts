import { catalogId, catalogQuery, record, type Page } from '../catalog/contracts';
import { catalogName } from '../catalog/administration/contracts';
import { normalizeText } from '../search/normalizer';
import { hoursFromForm, type WeeklyHours } from './hours';

export const providerMessages = {
  saved: 'Provider or branch change saved.',
  invalid_request:
    'Check names, address, contacts, coordinate pairs, hours, and official contact evidence.',
  duplicate: 'This ID or normalized name is already reserved. Check active and inactive records.',
  conflict: 'This record changed or its provider no longer matches. Reload before saving again.',
  unavailable: 'Provider changes are unavailable. Reload the record before retrying.',
} as const;
export class ProviderEditError extends Error {
  constructor(public readonly code: Exclude<keyof typeof providerMessages, 'saved'>) {
    super(providerMessages[code]);
  }
}
export type ProviderRecord = {
  id: string;
  name: string;
  phone: string | null;
  website: string | null;
  active: boolean;
  revision: number;
};
export type BranchRecord = ProviderRecord & {
  providerId: string;
  address: string;
  alternativePhone: string | null;
  latitude: number | null;
  longitude: number | null;
  contactSourceId: string | null;
  openingHours: WeeklyHours | null;
};
export type ContactSource = { id: string; providerId: string; url: string };
export type ProviderManagement = {
  providers: Page<ProviderRecord>;
  branches: Page<BranchRecord>;
  provider: ProviderRecord | null;
  branch: BranchRecord | null;
  sources: Page<ContactSource>;
  selectedSource: ContactSource | null;
};
type BaseEdit = {
  mode: 'create' | 'update';
  id: string;
  name: string;
  searchKey: string;
  active: boolean;
  revision: number;
  phone: string | null;
  website: string | null;
};
export type ProviderEdit =
  | (BaseEdit & { entity: 'provider' })
  | (BaseEdit & {
      entity: 'branch';
      providerId: string;
      address: string;
      alternativePhone: string | null;
      latitude: number | null;
      longitude: number | null;
      contactSourceId: string | null;
      openingHours: WeeklyHours | null;
    });

function controls(value: string) {
  return [...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
}
export function contactPhone(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || controls(value)) throw new ProviderEditError('invalid_request');
  const phone = value.trim().replace(/[০-৯]/g, (digit) => String(digit.charCodeAt(0) - 0x09e6));
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (
    !/^\+?[0-9][0-9 ()-]*$/.test(phone) ||
    phone.length > 30 ||
    digits.length < 5 ||
    digits.length > 15
  )
    throw new ProviderEditError('invalid_request');
  return phone;
}
export function contactWebsite(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || value.length > 2048 || controls(value) || value.includes('\\'))
    throw new ProviderEditError('invalid_request');
  if (!value.trim()) return null;
  const url = new URL(value.trim());
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || !url.hostname)
    throw new ProviderEditError('invalid_request');
  return url.href;
}
function coordinate(value: unknown, bound: number): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()))
    throw new ProviderEditError('invalid_request');
  const number = Number(value);
  if (!Number.isFinite(number) || Math.abs(number) > bound)
    throw new ProviderEditError('invalid_request');
  return number;
}
export function parseProviderEdit(value: unknown): ProviderEdit {
  try {
    const input = record(value);
    if (input.mode !== 'create' && input.mode !== 'update') throw new Error();
    const revision = input.mode === 'create' ? 1 : Number(input.revision);
    if (
      !Number.isSafeInteger(revision) ||
      revision < 1 ||
      revision >= Number.MAX_SAFE_INTEGER ||
      (input.active !== '0' && input.active !== '1')
    )
      throw new Error();
    const name = catalogName(input.name);
    const base: BaseEdit = {
      mode: input.mode,
      id: catalogId(input.id),
      name,
      searchKey: normalizeText(name),
      revision,
      active: input.active === '1',
      phone: contactPhone(input.phone),
      website: contactWebsite(input.website),
    };
    if (input.entity === 'provider') return { ...base, entity: 'provider' };
    if (input.entity !== 'branch' || typeof input.address !== 'string' || controls(input.address))
      throw new Error();
    const address = input.address.trim().replace(/\s+/g, ' ');
    if (!address || address.length > 500 || /[<>]/.test(address)) throw new Error();
    const latitude = coordinate(input.latitude, 90);
    const longitude = coordinate(input.longitude, 180);
    if ((latitude === null) !== (longitude === null)) throw new Error();
    const contactSourceId =
      input.contactSourceId === '' || input.contactSourceId === undefined
        ? null
        : catalogId(input.contactSourceId);
    if (base.active && (!contactSourceId || input.confirmContact !== 'yes')) throw new Error();
    return {
      ...base,
      entity: 'branch',
      providerId: catalogId(input.providerId),
      address,
      alternativePhone: contactPhone(input.alternativePhone),
      latitude,
      longitude,
      contactSourceId,
      openingHours: hoursFromForm(input),
    };
  } catch {
    throw new ProviderEditError('invalid_request');
  }
}
export function providerQuery(value: unknown) {
  const input = record(value);
  const id = (key: string) =>
    input[key] === undefined || input[key] === '' ? undefined : catalogId(input[key]);
  return {
    providers: catalogQuery({ after: id('providerAfter') }),
    branches: catalogQuery({ after: id('after') }),
    sources: catalogQuery({ after: id('sourceAfter') }),
    providerId: id('provider'),
    branchId: id('branch'),
  };
}
export function providersHref(input: Record<string, string | undefined> = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) if (value) query.set(key, value);
  return `/admin/providers${query.size ? `?${query}` : ''}`;
}
