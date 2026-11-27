import { createServerFn } from '@tanstack/react-start';
import { env } from 'cloudflare:workers';
import { CatalogRepository } from '../catalog/server/repository.server';
import { ReviewRepository, type DimensionSummary } from '../reviews/repository.server';
import { catalogId, record, type BranchService } from '../catalog/contracts';
export const publicDetail = createServerFn({ method: 'GET' })
  .validator((value: unknown) => {
    const input = record(value);
    if (input.kind !== 'service' && input.kind !== 'branch') throw new Error('Invalid detail type');
    return { kind: input.kind, id: catalogId(input.id) };
  })
  .handler(async ({ data }) => {
    const repository = new CatalogRepository(env.DB);
    const entity =
      data.kind === 'service'
        ? await repository.getService(data.id)
        : await repository.getBranch(data.id);
    const now = new Date().toISOString();
    if (!entity)
      return {
        entity: null,
        listings: [] as BranchService[],
        kind: data.kind,
        branchRating: null,
        providerRating: null,
        listingDimensions: {} as Record<string, DimensionSummary>,
        now,
      };
    const listings: BranchService[] = [];
    let after: string | undefined;
    do {
      const page = await repository.listBranchServices({
        limit: 100,
        after,
        ...(data.kind === 'service' ? { serviceId: data.id } : { branchId: data.id }),
      });
      listings.push(...page.items);
      after = page.nextCursor ?? undefined;
    } while (after);
    const reviews = new ReviewRepository(env.DB);
    return {
      entity,
      listings,
      kind: data.kind,
      branchRating: data.kind === 'branch' ? await reviews.aggregate('branch', entity.id) : null,
      providerRating:
        'provider' in entity ? await reviews.aggregate('provider', entity.provider.id) : null,
      listingDimensions:
        data.kind === 'branch'
          ? await reviews.dimensionSummaries(listings.map((item) => item.id))
          : ({} as Record<string, DimensionSummary>),
      now,
    };
  });
