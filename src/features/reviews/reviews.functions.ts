import { createServerFn } from '@tanstack/react-start';
import { getRequest, setResponseHeader } from '@tanstack/react-start/server';
import { env } from 'cloudflare:workers';
import { requireUser } from '../authentication/server/access.server';
import { catalogId, record } from '../catalog/contracts';
import { CatalogRepository } from '../catalog/server/repository.server';
import { ReviewRepository } from './repository.server';
export const readReviews = createServerFn({ method: 'GET' })
  .validator((value: unknown) => {
    const input = record(value);
    return {
      listing: catalogId(input.listing),
      after: input.after ? catalogId(input.after) : undefined,
    };
  })
  .handler(async ({ data }) => {
    setResponseHeader('Cache-Control', 'private, no-store');
    const listing = await new CatalogRepository(env.DB).getBranchService(data.listing);
    if (!listing)
      return { listing: null, items: [], summary: null, own: null, signedIn: false, next: null };
    const repository = new ReviewRepository(env.DB);
    let account: string | null = null;
    try {
      account = (await requireUser(getRequest(), env.DB)).user.id;
    } catch {
      account = null;
    }
    const rows = await repository.list(data.listing, data.after);
    return {
      listing,
      items: rows.slice(0, 20),
      next: rows.length > 20 ? rows[19].id : null,
      summary: await repository.summary(data.listing),
      own: account ? await repository.own(data.listing, account) : null,
      signedIn: account !== null,
    };
  });
