/**
 * Branch routing helpers for batch route calculation and branch enrichment.
 */

import type { Coordinates } from '../../features/map/types';
import { OsrmAdapter } from './osrmAdapter';
import type {
  BatchRouteOptions,
  EnrichedBranch,
  RoutableBranch,
  RouteResult,
  RoutingAdapter,
} from './types';

/**
 * Default shared OsrmAdapter instance.
 */
export const defaultRoutingAdapter: RoutingAdapter = new OsrmAdapter();

/**
 * Runs an asynchronous mapping function across items with a concurrency limit.
 *
 * @param items - Items to process.
 * @param concurrency - Maximum concurrent tasks.
 * @param mapper - Async worker function.
 * @returns Array of mapped results in the original item order.
 */
export async function mapConcurrent<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker(): Promise<void> {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await mapper(items[index], index);
    }
  }

  const workerCount = Math.min(Math.max(1, concurrency), items.length);
  const workers: Promise<void>[] = [];

  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  return results;
}

/**
 * Calculates road routes from an origin coordinate to multiple destination coordinates.
 * Returns route results in the exact same order as the destination coordinates.
 *
 * @param origin - Origin coordinates.
 * @param destinations - List of destination coordinates.
 * @param adapter - Routing adapter instance. Defaults to defaultRoutingAdapter.
 * @param options - Batch routing configuration options.
 * @returns Promise resolving to an array of RouteResult items.
 */
export async function getBranchRoutes(
  origin: Coordinates,
  destinations: readonly Coordinates[],
  adapter: RoutingAdapter = defaultRoutingAdapter,
  options?: BatchRouteOptions
): Promise<RouteResult[]> {
  const concurrency = Math.max(1, options?.concurrency ?? 3);

  return mapConcurrent(destinations, concurrency, async (destination) => {
    return adapter.calculateRoute(origin, destination, options);
  });
}

/**
 * Enriches diagnostic center branches with road routing calculations.
 * Preserves all original branch attributes, prices, and metadata even when routing fails.
 *
 * @param branches - Array of branches with coordinates.
 * @param origin - Origin coordinates, such as user location.
 * @param adapter - Routing adapter instance. Defaults to defaultRoutingAdapter.
 * @param options - Batch routing configuration options.
 * @returns Promise resolving to an array of enriched branch objects.
 */
export async function enrichBranchesWithRoutes<T extends RoutableBranch>(
  branches: readonly T[],
  origin: Coordinates,
  adapter: RoutingAdapter = defaultRoutingAdapter,
  options?: BatchRouteOptions
): Promise<Array<EnrichedBranch<T>>> {
  if (branches.length === 0) {
    return [];
  }

  const destinations = branches.map((branch) => branch.coordinates);
  const routeResults = await getBranchRoutes(
    origin,
    destinations,
    adapter,
    options
  );

  return branches.map((branch, index) => ({
    ...branch,
    route: routeResults[index],
  }));
}
