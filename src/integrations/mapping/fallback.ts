/**
 * Fallback routing handlers and adapters for unavailable route calculations.
 */

import type { Coordinates } from '../../features/map/types';
import type {
  RouteAvailableResult,
  RouteResult,
  RouteUnavailableReason,
  RouteUnavailableResult,
  RoutingAdapter,
} from './types';

/**
 * Creates a route result for unavailable or failed routing operations.
 * Sets roadDistanceKm and travelDurationMinutes to undefined.
 *
 * @param origin - Starting coordinates.
 * @param destination - Ending coordinates.
 * @param reason - Categorized failure reason.
 * @param message - Diagnostic message for internal logging or debugging.
 * @returns RouteUnavailableResult with explicit unavailable status.
 */
export function createUnavailableRouteResult(
  origin: Coordinates,
  destination: Coordinates,
  reason: RouteUnavailableReason,
  message: string,
): RouteUnavailableResult {
  return {
    status: 'unavailable',
    reason,
    message,
    origin,
    destination,
  };
}

/**
 * Type guard for successful road route results.
 */
export function isRouteAvailable(result: RouteResult): result is RouteAvailableResult {
  return result.status === 'available';
}

/**
 * Type guard for unavailable road route results.
 */
export function isRouteUnavailable(result: RouteResult): result is RouteUnavailableResult {
  return result.status === 'unavailable';
}

/**
 * Wraps an async routing operation with safe fallback handling.
 * Traps any unhandled exception and converts it to a RouteUnavailableResult.
 *
 * @param origin - Starting coordinates.
 * @param destination - Ending coordinates.
 * @param operation - Async function returning RouteResult.
 * @returns Promise resolving to a RouteResult.
 */
export async function executeWithFallback(
  origin: Coordinates,
  destination: Coordinates,
  operation: () => Promise<RouteResult>,
): Promise<RouteResult> {
  try {
    return await operation();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown routing execution error';
    return createUnavailableRouteResult(origin, destination, 'unknown', message);
  }
}

/**
 * Fallback routing adapter that returns unavailable route results.
 * Use for testing, offline environments, or when routing is disabled.
 */
export class FallbackRoutingAdapter implements RoutingAdapter {
  readonly name = 'fallback';

  constructor(
    private readonly defaultReason: RouteUnavailableReason = 'upstream_error',
    private readonly defaultMessage: string = 'Routing service is offline or unavailable.',
  ) {}

  async calculateRoute(origin: Coordinates, destination: Coordinates): Promise<RouteResult> {
    return createUnavailableRouteResult(
      origin,
      destination,
      this.defaultReason,
      this.defaultMessage,
    );
  }
}
