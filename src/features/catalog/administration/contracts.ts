import { catalogId, catalogQuery, record, type Page } from '../contracts';
import { normalizeText } from '../../search/normalizer';

export const editMessages = {
  saved: 'Catalog change saved.',
  invalid_request: 'Check the fields. Use valid IDs, names, language, and correction confirmation.',
  duplicate: 'This ID or normalized name is already reserved. Check existing and inactive records.',
  collision: 'This name or alias conflicts with an existing catalog term. Use an unambiguous term.',
  conflict: 'This record changed or no longer matches. Reload it before saving again.',
  unavailable: 'Catalog changes are unavailable. Reload the record before retrying.',
} as const;
export type EditCode = Exclude<keyof typeof editMessages, 'saved'>;
export class CatalogEditError extends Error {
  constructor(public readonly code: EditCode) {
    super(editMessages[code]);
  }
}
export type CategoryRecord = { id: string; name: string; active: boolean; revision: number };
export type ServiceRecord = CategoryRecord & { categoryId: string };
export type AliasRecord = CategoryRecord & { serviceId: string; language: 'en' | 'bn' };
export type ManagementData = {
  categories: Page<CategoryRecord>;
  services: Page<ServiceRecord>;
  category: CategoryRecord | null;
  service: ServiceRecord | null;
  aliases: Page<AliasRecord>;
};
type EditBase = {
  mode: 'create' | 'update';
  id: string;
  name: string;
  searchKey: string;
  active: boolean;
  revision: number;
};
export type CatalogEdit =
  | (EditBase & { entity: 'category' })
  | (EditBase & { entity: 'service'; categoryId: string })
  | (EditBase & { entity: 'alias'; serviceId: string; language: 'en' | 'bn' });

export function catalogName(value: unknown): string {
  if (typeof value !== 'string') throw new CatalogEditError('invalid_request');
  const name = value.normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (
    name.length < 1 ||
    name.length > 180 ||
    normalizeText(name).length < 1 ||
    !/[\p{L}\p{N}]/u.test(name) ||
    [...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) ||
    /[<>\u202A-\u202E\u2066-\u2069]/u.test(name)
  )
    throw new CatalogEditError('invalid_request');
  return name;
}

export function parseEdit(value: unknown): CatalogEdit {
  try {
    const input = record(value);
    if (input.mode !== 'create' && input.mode !== 'update') throw new Error();
    const revision = input.mode === 'create' ? 1 : Number(input.revision);
    if (!Number.isSafeInteger(revision) || revision < 1 || revision >= Number.MAX_SAFE_INTEGER)
      throw new Error();
    if (input.active !== '1' && input.active !== '0') throw new Error();
    const name = catalogName(input.name);
    const base: EditBase = {
      mode: input.mode,
      id: catalogId(input.id),
      name,
      searchKey: normalizeText(name),
      active: input.active === '1',
      revision,
    };
    if (input.entity === 'category') return { ...base, entity: 'category' };
    if (base.mode === 'update' && input.confirm !== 'yes') throw new Error();
    if (input.entity === 'service')
      return { ...base, entity: 'service', categoryId: catalogId(input.categoryId) };
    if (input.entity === 'alias' && (input.language === 'en' || input.language === 'bn')) {
      if (input.language === 'bn' && !/[\u0980-\u09FF]/u.test(name)) throw new Error();
      if (input.language === 'en' && /[\u0980-\u09FF]/u.test(name)) throw new Error();
      return {
        ...base,
        entity: 'alias',
        serviceId: catalogId(input.serviceId),
        language: input.language,
      };
    }
    throw new Error();
  } catch {
    throw new CatalogEditError('invalid_request');
  }
}

export function managementQuery(value: unknown) {
  const input = record(value);
  const optionalId = (key: string) =>
    input[key] === undefined || input[key] === '' ? undefined : catalogId(input[key]);
  return {
    services: catalogQuery({ after: optionalId('after') }),
    categories: catalogQuery({ after: optionalId('categoryAfter') }),
    aliases: catalogQuery({ after: optionalId('aliasAfter') }),
    serviceId: optionalId('service'),
    categoryId: optionalId('category'),
  };
}

export function managementHref(input: Record<string, string | undefined> = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) if (value) search.set(key, value);
  return `/admin/catalog/manage${search.size ? `?${search}` : ''}`;
}
