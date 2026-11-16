import type { BranchService } from '../catalog/contracts';
import type { Coordinates } from '../map/types';
import { calculateHaversineDistanceKm } from '../map/haversine';
export const sortChoices = [
  'price-asc',
  'price-desc',
  'nearest',
  'travel-time',
  'rating',
  'verification-date',
] as const;
export type PublicSort = (typeof sortChoices)[number];
export function sortListings(
  items: readonly BranchService[],
  sort: PublicSort,
  center: Coordinates,
  ratings: Record<string, number | null>,
  travel: Record<string, number | null>,
) {
  function value(l: BranchService): number | null {
    switch (sort) {
      case 'price-asc':
      case 'price-desc':
        return l.price?.amountMinor ?? null;
      case 'nearest':
        return l.branch.coordinates
          ? calculateHaversineDistanceKm(center, l.branch.coordinates)
          : null;
      case 'travel-time':
        return travel[l.id] ?? null;
      case 'rating':
        return ratings[l.id] ?? null;
      case 'verification-date':
        return l.price?.verifiedAt ? Date.parse(l.price.verifiedAt) : null;
    }
  }
  return [...items].sort((a, b) => {
    const x = value(a),
      y = value(b);
    if (x === null && y === null) return a.id.localeCompare(b.id);
    if (x === null) return 1;
    if (y === null) return -1;
    return (
      (['price-desc', 'rating', 'verification-date'].includes(sort) ? y - x : x - y) ||
      a.id.localeCompare(b.id)
    );
  });
}
