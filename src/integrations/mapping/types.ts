/**
 * Types and contracts for mapping and road routing integrations.
 */

import type { Coordinates } from '../../features/map/types';

/**
 * Route calculation status.
 */
export type RouteResultStatus = 'available' | 'unavailable';

/**
 * Failure reasons when a road route calculation is unavailable.
 */
export type RouteUnavailableReason =
  | 'not_configured'
  | 'timeout'
  | 'network_error'
  | 'rate_limit'
  | 'no_route'
  | 'invalid_coordinates'
  | 'upstream_error'
  | 'aborted'
  | 'unknown';

/**
 * Successful road route calculation result.
 * Tracks road distance in kilometers and travel duration in minutes.
 * These values remain distinct from straight-line radius filter distance.
 */
export interface RouteAvailableResult {
  readonly status: 'available';
  readonly roadDistanceKm: number;
  readonly travelDurationMinutes: number;
  readonly origin: Coordinates;
  readonly destination: Coordinates;
  readonly source: string;
}

/**
 * Fallback road route result when routing is unavailable or fails.
 * Road distance and travel duration remain undefined to preserve unknown values.
 */
export interface RouteUnavailableResult {
  readonly status: 'unavailable';
  readonly reason: RouteUnavailableReason;
  readonly message: string;
  readonly origin: Coordinates;
  readonly destination: Coordinates;
  readonly roadDistanceKm?: undefined;
  readonly travelDurationMinutes?: undefined;
}

/**
 * Discriminated union of road route calculation results.
 */
export type RouteResult = RouteAvailableResult | RouteUnavailableResult;

/**
 * Configuration options for a single route calculation request.
 */
export interface RouteRequestOptions {
  /**
   * Timeout in milliseconds before the request aborts.
   * Default is 5000 milliseconds.
   */
  readonly timeoutMs?: number;

  /**
   * Optional AbortSignal to cancel the operation.
   */
  readonly signal?: AbortSignal;

  /**
   * Custom fetch implementation for testing or runtime injection.
   */
  readonly fetchFn?: typeof fetch;
}

/**
 * Options for batch branch routing requests.
 */
export interface BatchRouteOptions extends RouteRequestOptions {
  /**
   * Maximum concurrent network requests. Default is 3.
   */
  readonly concurrency?: number;
}

/**
 * Contract for mapping and routing adapters.
 */
export interface RoutingAdapter {
  readonly name: string;

  /**
   * Calculates the road route between origin and destination coordinates.
   *
   * @param origin - Starting coordinates.
   * @param destination - Ending coordinates.
   * @param options - Request options for timeout, signal, and custom fetch.
   * @returns Promise resolving to a RouteResult.
   */
  calculateRoute(
    origin: Coordinates,
    destination: Coordinates,
    options?: RouteRequestOptions
  ): Promise<RouteResult>;
}

/**
 * Branch input structure required for route enrichment.
 */
export interface RoutableBranch {
  readonly coordinates: Coordinates;
  readonly [key: string]: unknown;
}

/**
 * Branch enriched with road routing data.
 * Preserves all original branch fields including prices and identifiers.
 */
export type EnrichedBranch<T extends RoutableBranch> = T & {
  readonly route: RouteResult;
};
