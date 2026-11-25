import { createServerFn } from '@tanstack/react-start';
import { env } from 'cloudflare:workers';
import { record, catalogId } from '../catalog/contracts';
import { CatalogRepository } from '../catalog/server/repository.server';
import { ReviewRepository } from '../reviews/repository.server';
export function comparisonIds(value: unknown) {
  const input = record(value);
  if (!Array.isArray(input.ids) || input.ids.length < 2 || input.ids.length > 4)
    throw new Error('Choose two to four listings.');
  const ids = input.ids.map(catalogId);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate comparison listings');
  return ids;
}
export const readComparison = createServerFn({ method: 'GET' })
  .validator(comparisonIds)
  .handler(async ({ data }) => {
    const catalog = new CatalogRepository(env.DB),
      reviews = new ReviewRepository(env.DB);
    const items = await Promise.all(
      data.map(async (id) => {
        const listing = await catalog.getBranchService(id);
        if (!listing) throw new Error('A selected listing is unavailable.');
        return { listing, rating: await reviews.summary(id) };
      }),
    );
    if (new Set(items.map((item) => item.listing.service.id)).size !== 1)
      throw new Error('Compare one diagnostic service at a time.');
    return { items, now: new Date().toISOString() };
  });
