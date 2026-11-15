import type { BranchService } from '../catalog/contracts';
import type { Coordinates } from '../map/types';
import { calculateHaversineDistanceKm } from '../map/haversine';
export function areaStatistics(
  listings: readonly BranchService[],
  center: Coordinates,
  radius: number,
) {
  if (!Number.isFinite(radius) || radius < 0.1 || radius > 100) throw new Error('Invalid radius');
  const seen = new Set<string>();
  const branches = new Set<string>();
  const providers = new Set<string>();
  const prices: number[] = [];
  let service: string | undefined;
  for (const l of listings) {
    if (service && service !== l.service.id) throw new Error('Statistics require one service');
    service = l.service.id;
    if (seen.has(l.id)) continue;
    seen.add(l.id);
    if (
      !l.branch.coordinates ||
      !l.price ||
      l.price.status !== 'verified' ||
      !l.price.source ||
      !l.price.verifiedAt ||
      !Number.isSafeInteger(l.price.amountMinor) ||
      l.price.amountMinor <= 0 ||
      calculateHaversineDistanceKm(center, l.branch.coordinates) > radius ||
      branches.has(l.branch.id)
    )
      continue;
    branches.add(l.branch.id);
    providers.add(l.branch.provider.id);
    prices.push(l.price.amountMinor);
  }
  prices.sort((a, b) => a - b);
  const count = prices.length;
  const enough = count >= 3;
  const middle = Math.floor(count / 2);
  return {
    count,
    providers: providers.size,
    enough,
    lowest: enough ? prices[0] / 100 : null,
    highest: enough ? prices[count - 1] / 100 : null,
    mean: enough ? prices.reduce((a, b) => a + b, 0) / count / 100 : null,
    median: enough
      ? (count % 2 ? prices[middle] : (prices[middle - 1] + prices[middle]) / 2) / 100
      : null,
  };
}
