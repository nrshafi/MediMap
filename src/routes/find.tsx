import { createFileRoute } from '@tanstack/react-router';
import { publicCatalog } from '../features/public/catalog.functions';
import { FindPage } from '../features/public/FindPage';
export const Route = createFileRoute('/find')({
  validateSearch: (s: Record<string, unknown>) => ({
    service: typeof s.service === 'string' ? s.service : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => publicCatalog({ data: deps }),
  head: () => ({ meta: [{ title: 'Find diagnostic services | MediMap' }] }),
  component: Page,
  errorComponent: () => (
    <main>
      <h1>Catalog unavailable</h1>
      <p>Try again later.</p>
    </main>
  ),
});
function Page() {
  return <FindPage {...Route.useLoaderData()} service={Route.useSearch().service} />;
}
