import { createServerFn } from '@tanstack/react-start';
import { env } from 'cloudflare:workers';
import { CatalogRepository } from '../catalog/server/repository.server';
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
    if (!entity) return { entity: null, listings: [] as BranchService[], kind: data.kind };
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
    return { entity, listings, kind: data.kind };
  });
