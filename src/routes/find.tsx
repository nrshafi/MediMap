import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { sortChoices } from '../features/public/sorting';
import { publicCatalog } from '../features/public/catalog.functions';
import { publicMapsConfig } from '../features/public/maps.functions';
import { DEFAULT_CENTER, parseCoordinate, parseRadius } from '../features/public/defaults';
import { FindPage } from '../features/public/FindPage';
export const Route = createFileRoute('/find')({
  validateSearch: (s: Record<string, unknown>) => ({
    service: typeof s.service === 'string' ? s.service : undefined,
    q: typeof s.q === 'string' ? s.q.slice(0, 256) : undefined,
    lat: parseCoordinate(s.lat, 90, DEFAULT_CENTER.latitude),
    lng: parseCoordinate(s.lng, 180, DEFAULT_CENTER.longitude),
    radius: parseRadius(s.radius),
    sort: sortChoices.find((value) => value === s.sort) ?? 'price-asc',
    verified: s.verified === 'yes' ? 'yes' : 'all',
  }),
  loaderDeps: ({ search }) => ({ service: search.service }),
  loader: async ({ deps }) => {
    const [catalog, maps] = await Promise.all([
      publicCatalog({ data: { service: deps.service } }),
      publicMapsConfig(),
    ]);
    return { ...catalog, browserKey: maps.browserKey };
  },
  head: () => ({ meta: [{ title: 'Find diagnostic services | MediMap' }] }),
  component: Page,
});
function Page() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  return (
    <FindPage
      {...Route.useLoaderData()}
      service={search.service}
      initialQuery={search.q}
      initial={search}
      onContextChange={(context) => {
        void navigate({
          to: '/find',
          search: ((prev: Record<string, unknown>) => ({
            ...prev,
            ...context,
          })) as unknown as typeof search,
          replace: true,
          resetScroll: false,
        });
      }}
    />
  );
}
