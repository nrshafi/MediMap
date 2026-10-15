import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { DiscoveryView } from '../features/search';

/**
 * Validated search query parameters for the discovery route.
 */
export interface DiscoveryRouteSearchParams {
  readonly q?: string;
  readonly query?: string;
  readonly lat?: number;
  readonly lng?: number;
  readonly radius?: number;
  readonly selectedBranchId?: string;
}

/**
 * Route definition for /discovery with search query validation and parameter synchronization.
 */
export const Route = createFileRoute('/discovery')({
  validateSearch: (search: Record<string, unknown>): DiscoveryRouteSearchParams => {
    const rawQ = typeof search.q === 'string' ? search.q : undefined;
    const rawQuery = typeof search.query === 'string' ? search.query : undefined;
    const q = rawQ ?? rawQuery;

    const parseNumber = (val: unknown): number | undefined => {
      if (typeof val === 'number' && Number.isFinite(val)) {
        return val;
      }
      if (typeof val === 'string') {
        const parsed = parseFloat(val);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
      return undefined;
    };

    const lat = parseNumber(search.lat);
    const lng = parseNumber(search.lng);
    const parsedRadius = parseNumber(search.radius);
    const radius = parsedRadius !== undefined && parsedRadius > 0 ? parsedRadius : 3;

    const selectedBranchId =
      typeof search.selectedBranchId === 'string' && search.selectedBranchId.trim() !== ''
        ? search.selectedBranchId.trim()
        : undefined;

    return {
      q,
      query: q,
      lat,
      lng,
      radius,
      selectedBranchId,
    };
  },
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
