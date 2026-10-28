import { createServerFn } from '@tanstack/react-start';
import { getRequest, setResponseHeader } from '@tanstack/react-start/server';
import { requireAdministrator, authFailure } from '../authentication/server/access.server';
import { env } from 'cloudflare:workers';
import { catalogId, listingQuery, record } from './contracts';
import { CatalogRepository } from './server/repository.server';
import { catalogRead, catalogReadFailure } from './server/reads.server';

// General reads expose public records. Inspection requires administrator access.
export const readCatalog = createServerFn({ method: 'GET' })
  .validator((input: unknown) => input)
  .handler(({ data }) => catalogRead(env.DB, data));

export const inspectCatalog = createServerFn({ method: 'GET' })
  .validator((input: unknown) => input)
  .handler(async ({ data }) => {
    setResponseHeader('Cache-Control', 'private, no-store');
    try {
      await requireAdministrator(getRequest(), env.DB);
    } catch (error) {
      return authFailure(error);
    }
    try {
      const input = record(data);
      const query = listingQuery(input);
      const catalogAfter =
        input.catalogAfter === undefined ? undefined : catalogId(input.catalogAfter);
      const repository = new CatalogRepository(env.DB);
      const [catalog, listings, selectedService] = await Promise.all([
        repository.listCatalog({ limit: 100, after: catalogAfter }),
        repository.listBranchServices(query),
        query.serviceId ? repository.getService(query.serviceId) : Promise.resolve(null),
      ]);
      return { ok: true, data: { catalog, listings, selectedService } } as const;
    } catch (error) {
      return catalogReadFailure(error);
    }
  });
