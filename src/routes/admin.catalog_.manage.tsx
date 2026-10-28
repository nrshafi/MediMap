import { createFileRoute } from '@tanstack/react-router';
import { CatalogManager } from '../features/administration/CatalogManager';
import { inspectManagement } from '../features/catalog/administration/management.functions';

export const Route = createFileRoute('/admin/catalog_/manage')({
  head: () => ({
    meta: [
      { title: 'Manage diagnostic catalog | MediMap' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  validateSearch: (input: Record<string, unknown>): Record<string, string | undefined> => {
    const search: Record<string, string | undefined> = {};
    for (const key of ['service', 'category', 'after', 'categoryAfter', 'aliasAfter', 'code']) {
      if (input[key] !== undefined && input[key] !== '') search[key] = String(input[key]);
    }
    return search;
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => inspectManagement({ data: deps }),
  component: ManagementRoute,
});
function ManagementRoute() {
  const result = Route.useLoaderData();
  const search = Route.useSearch();
  return <CatalogManager result={result} code={search.code} search={search} />;
}
