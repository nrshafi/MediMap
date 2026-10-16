import { isValidCoordinate } from '../map/coordinates';
import { parseRadiusFilterInput } from '../map/radiusFilter';

export interface DiscoveryRouteSearchParams {
  readonly q?: string;
  readonly query?: string;
  readonly lat?: number;
  readonly lng?: number;
  readonly radius?: number;
  readonly selectedBranchId?: string;
}

export function validateDiscoverySearch(search: Record<string, unknown>): DiscoveryRouteSearchParams {
    const rawQ = typeof search.q === 'string' ? search.q : undefined;
    const rawQuery = typeof search.query === 'string' ? search.query : undefined;
    const q = rawQ ?? rawQuery;

    const parseNumber = (val: unknown): number | undefined => {
      if (typeof val === 'number' && Number.isFinite(val)) {
        return val;
      }
      if (typeof val === 'string' && val.trim() !== '') {
        const parsed = Number(val);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
      return undefined;
    };

    const latitude = parseNumber(search.lat);
    const longitude = parseNumber(search.lng);
    const coordinates = { latitude, longitude };
    const lat = isValidCoordinate(coordinates) ? coordinates.latitude : undefined;
    const lng = isValidCoordinate(coordinates) ? coordinates.longitude : undefined;
    const parsedRadius = parseRadiusFilterInput(parseNumber(search.radius));
    const radius = parsedRadius.valid ? parsedRadius.radiusKm : 3;

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
}

