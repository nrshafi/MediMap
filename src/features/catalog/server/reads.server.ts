import {
  catalogId,
  catalogQuery,
  listingQuery,
  record,
  InvalidCatalogRequest,
  type CatalogResult,
} from '../contracts';
import { CatalogRepository } from './repository.server';

export type CatalogReadRequest =
  | { kind: 'catalog'; query: ReturnType<typeof catalogQuery> }
  | { kind: 'service' | 'branch' | 'listing'; id: string }
  | { kind: 'listings'; query: ReturnType<typeof listingQuery> };

export function catalogReadRequest(value: unknown): CatalogReadRequest {
  const input = record(value);
  switch (input.kind) {
    case 'catalog':
      return { kind: input.kind, query: catalogQuery(input.query ?? {}) };
    case 'listings':
      return { kind: input.kind, query: listingQuery(input.query ?? {}) };
    case 'service':
    case 'branch':
    case 'listing':
      return { kind: input.kind, id: catalogId(input.id) };
    default:
      throw new InvalidCatalogRequest();
  }
}

export async function catalogRead(db: D1Database, value: unknown) {
  try {
    const request = catalogReadRequest(value);
    const repository = new CatalogRepository(db);
    switch (request.kind) {
      case 'catalog':
        return {
          ok: true,
          kind: request.kind,
          data: await repository.listCatalog(request.query),
        } as const;
      case 'service':
        return {
          ok: true,
          kind: request.kind,
          data: await repository.getService(request.id),
        } as const;
      case 'branch':
        return {
          ok: true,
          kind: request.kind,
          data: await repository.getBranch(request.id),
        } as const;
      case 'listing':
        return {
          ok: true,
          kind: request.kind,
          data: await repository.getBranchService(request.id),
        } as const;
      case 'listings':
        return {
          ok: true,
          kind: request.kind,
          data: await repository.listBranchServices(request.query),
        } as const;
    }
  } catch (error) {
    return catalogReadFailure(error);
  }
}

export function catalogReadFailure(error: unknown): Extract<CatalogResult<never>, { ok: false }> {
  return error instanceof InvalidCatalogRequest
    ? { ok: false, code: 'invalid_request', message: error.message }
    : { ok: false, code: 'unavailable', message: 'The catalog is unavailable. Try again.' };
}
