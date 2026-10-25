import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { DiscoveryView } from '../features/search';
import {
  validateDiscoverySearch,
  type DiscoveryRouteSearchParams,
} from '../features/search/discoverySearch';
export type { DiscoveryRouteSearchParams } from '../features/search/discoverySearch';

/**
 * Route definition for /discovery with search query validation and parameter synchronization.
 */
export const Route = createFileRoute('/discovery')({
  head: () => ({
    meta: [
      { title: 'MediMap | Discovery preview' },
      {
        name: 'description',
        content:
          'Explore diagnostic service search in Dhaka using sample branch data and sample prices.',
      },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  validateSearch: validateDiscoverySearch,
  component: DiscoveryRouteComponent,
});

function DiscoveryRouteComponent() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const handleSearchChange = (params: {
    query?: string;
    radius?: number;
    lat?: number;
    lng?: number;
    selectedBranchId?: string;
  }) => {
    navigate({
      to: '/discovery',
      search: (prev: DiscoveryRouteSearchParams) => ({
        ...prev,
        q: params.query ?? prev.q,
        query: params.query ?? prev.query,
        lat: params.lat ?? prev.lat,
        lng: params.lng ?? prev.lng,
        radius: params.radius ?? prev.radius ?? 3,
        selectedBranchId: params.selectedBranchId,
      }),
      replace: true,
      resetScroll: false,
    });
  };

  return (
    <DiscoveryView
      query={search.q ?? search.query}
      lat={search.lat}
      lng={search.lng}
      radius={search.radius}
      selectedBranchId={search.selectedBranchId}
      onSearchChange={handleSearchChange}
    />
  );
}
