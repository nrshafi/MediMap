import { createFileRoute } from '@tanstack/react-router';
import { inspectCatalog } from '../features/catalog/catalog.functions';
import { CatalogInspector } from '../features/administration/CatalogInspector';

type InspectorSearch = { service?: string; after?: string; catalogAfter?: string };

export const Route = createFileRoute('/admin/catalog')({
  head: () => ({
    meta: [{ title: 'Catalog inspector | MediMap' }, { name: 'robots', content: 'noindex' }],
  }),
  validateSearch: (input: Record<string, unknown>): InspectorSearch => ({
    ...(input.service === undefined || input.service === ''
      ? {}
      : { service: String(input.service) }),
    ...(input.after === undefined ? {} : { after: String(input.after) }),
    ...(input.catalogAfter === undefined ? {} : { catalogAfter: String(input.catalogAfter) }),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    inspectCatalog({
      data: {
        ...(deps.service === undefined || deps.service === '' ? {} : { serviceId: deps.service }),
        ...(deps.after === undefined ? {} : { after: deps.after }),
        ...(deps.catalogAfter === undefined ? {} : { catalogAfter: deps.catalogAfter }),
      },
    }),
  component: CatalogRoute,
});

function href(search: InspectorSearch) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search))
    if (value !== undefined) params.set(key, value);
  return `/admin/catalog?${params}`;
}

function CatalogRoute() {
  const result = Route.useLoaderData();
  const search = Route.useSearch();
  return (
    <CatalogInspector
      key={JSON.stringify(search)}
      result={result}
      serviceId={search.service ?? ''}
      moreHref={
        result.ok && result.data.listings.nextCursor
          ? href({ ...search, after: result.data.listings.nextCursor })
          : undefined
      }
      catalogMoreHref={
        result.ok && result.data.catalog.nextCursor
          ? href({ ...search, catalogAfter: result.data.catalog.nextCursor })
          : undefined
      }
    />
  );
}
