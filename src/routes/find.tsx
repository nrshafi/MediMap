import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { sortChoices } from '../features/public/sorting';
import { publicCatalog } from '../features/public/catalog.functions';
import { FindPage } from '../features/public/FindPage';
export const Route = createFileRoute('/find')({
  validateSearch: (s: Record<string, unknown>) => ({
    service: typeof s.service === 'string' ? s.service : undefined,
    lat: Number.isFinite(Number(s.lat)) && Math.abs(Number(s.lat)) <= 90 ? Number(s.lat) : 23.8103,
    lng: Number.isFinite(Number(s.lng)) && Math.abs(Number(s.lng)) <= 180 ? Number(s.lng) : 90.4125,
    radius: Number(s.radius) >= 0.1 && Number(s.radius) <= 100 ? Number(s.radius) : 3,
    sort: sortChoices.find((value) => value === s.sort) ?? 'price-asc',
    verified: s.verified === 'yes' ? 'yes' : 'all',
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
  const search = Route.useSearch();
  const navigate = useNavigate();
  return (
    <FindPage
      key={search.service}
      {...Route.useLoaderData()}
      service={search.service}
      initial={search}
      onContextChange={(context) => {
        void navigate({
          to: '/find',
          search: { ...search, ...context },
          replace: true,
          resetScroll: false,
        });
      }}
    />
  );
}
