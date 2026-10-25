/**
 * OpenStreetMap OSRM routing adapter for road distance and travel time.
 */

import { isValidCoordinate } from '../../features/map/coordinates';
import type { Coordinates } from '../../features/map/types';
import { createUnavailableRouteResult } from './fallback';
import type { RouteRequestOptions, RouteResult, RoutingAdapter } from './types';

/**
 * Default public OSRM demonstration service URL.
 */
export const DEFAULT_OSRM_BASE_URL = 'https://router.project-osrm.org';

/**
 * Default timeout for OSRM network requests in milliseconds.
 */
export const DEFAULT_ROUTING_TIMEOUT_MS = 5000;

/**
 * Configuration options for OsrmAdapter.
 */
export interface OsrmAdapterOptions {
  /**
   * Base URL for the OSRM routing endpoint.
   */
  readonly baseUrl?: string;

  /**
   * Default timeout in milliseconds.
   */
  readonly defaultTimeoutMs?: number;

  /**
   * Custom fetch function for runtime injection or testing.
   */
  readonly fetchFn?: typeof fetch;
}

/**
 * Builds the OSRM route URL for two coordinates.
 * Notice the coordinate ordering: longitude comes first, followed by latitude.
 *
 * @param baseUrl - Base service URL.
 * @param origin - Origin coordinates.
 * @param destination - Destination coordinates.
 * @returns Fully formatted OSRM routing URL.
 */
export function buildOsrmUrl(
  baseUrl: string,
  origin: Coordinates,
  destination: Coordinates,
): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const originPart = `${origin.longitude},${origin.latitude}`;
  const destPart = `${destination.longitude},${destination.latitude}`;
  return `${cleanBase}/route/v1/driving/${originPart};${destPart}?overview=false&steps=false&alternatives=false`;
}

interface OsrmRouteItem {
  readonly distance: number;
  readonly duration: number;
}

interface OsrmSuccessPayload {
  readonly code: 'Ok';
  readonly routes: readonly [OsrmRouteItem, ...OsrmRouteItem[]];
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function isOsrmSuccessPayload(payload: unknown): payload is OsrmSuccessPayload {
  if (!isPlainObject(payload)) {
    return false;
  }

  if (payload.code !== 'Ok') {
    return false;
  }

  if (!Array.isArray(payload.routes) || payload.routes.length === 0) {
    return false;
  }

  const firstRoute: unknown = payload.routes[0];
  if (!isPlainObject(firstRoute)) {
    return false;
  }

  const { distance, duration } = firstRoute;
  if (
    typeof distance !== 'number' ||
    typeof duration !== 'number' ||
    !Number.isFinite(distance) ||
    !Number.isFinite(duration) ||
    distance < 0 ||
    duration < 0
  ) {
    return false;
  }

  return true;
}

/**
 * OSRM routing adapter for explicitly configured routing requests.
 * Handles timeouts, network failures, and coordinate validation with explicit fallbacks.
 */
export class OsrmAdapter implements RoutingAdapter {
  readonly name = 'osrm';
  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;
  private readonly fetchFn?: typeof fetch;

  constructor(options?: OsrmAdapterOptions) {
    this.baseUrl = options?.baseUrl ?? DEFAULT_OSRM_BASE_URL;
    this.defaultTimeoutMs = options?.defaultTimeoutMs ?? DEFAULT_ROUTING_TIMEOUT_MS;
    this.fetchFn = options?.fetchFn;
  }

  /**
   * Calculates the road route between two coordinates using OSRM.
   *
   * @param origin - Origin coordinates.
   * @param destination - Destination coordinates.
   * @param options - Request options for timeout, signal, and custom fetch.
   * @returns Promise resolving to a RouteResult.
   */
  async calculateRoute(
    origin: Coordinates,
    destination: Coordinates,
    options?: RouteRequestOptions,
  ): Promise<RouteResult> {
    if (!isValidCoordinate(origin) || !isValidCoordinate(destination)) {
      return createUnavailableRouteResult(
        origin,
        destination,
        'invalid_coordinates',
        'Origin or destination coordinates are not valid WGS 84 values.',
      );
    }

    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;
    const fetchImplementation = options?.fetchFn ?? this.fetchFn ?? fetch;
    const externalSignal = options?.signal;

    if (externalSignal?.aborted) {
      return createUnavailableRouteResult(
        origin,
        destination,
        'aborted',
        'Route calculation request was aborted.',
      );
    }

    const controller = new AbortController();
    let isTimedOut = false;

    const timerId = setTimeout(() => {
      isTimedOut = true;
      controller.abort();
    }, timeoutMs);

    const abortHandler = (): void => {
      controller.abort();
    };

    if (externalSignal) {
      externalSignal.addEventListener('abort', abortHandler, { once: true });
    }

    const requestUrl = buildOsrmUrl(this.baseUrl, origin, destination);

    try {
      const response = await fetchImplementation(requestUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          return createUnavailableRouteResult(
            origin,
            destination,
            'rate_limit',
            'OSRM routing rate limit exceeded (HTTP 429).',
          );
        }

        if (response.status !== 400) {
          return createUnavailableRouteResult(
            origin,
            destination,
            'upstream_error',
            `OSRM routing request failed with HTTP ${response.status}.`,
          );
        }
      }

      let rawData: unknown;
      try {
        rawData = await response.json();
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          throw error;
        }
        return createUnavailableRouteResult(
          origin,
          destination,
          'upstream_error',
          'OSRM service returned invalid JSON.',
        );
      }

      if (isPlainObject(rawData) && (rawData.code === 'NoRoute' || rawData.code === 'NoSegment')) {
        return createUnavailableRouteResult(
          origin,
          destination,
          'no_route',
          'No road route found between coordinates.',
        );
      }

      if (!response.ok || !isOsrmSuccessPayload(rawData)) {
        return createUnavailableRouteResult(
          origin,
          destination,
          'upstream_error',
          'OSRM service returned an invalid or malformed payload.',
        );
      }

      const primaryRoute = rawData.routes[0];
      const roadDistanceKm = Math.round((primaryRoute.distance / 1000) * 100) / 100;
      const travelDurationMinutes = Math.round((primaryRoute.duration / 60) * 10) / 10;

      return {
        status: 'available',
        roadDistanceKm,
        travelDurationMinutes,
        origin,
        destination,
        source: 'osrm',
      };
    } catch (error: unknown) {
      if (isTimedOut) {
        return createUnavailableRouteResult(
          origin,
          destination,
          'timeout',
          `Route calculation timed out after ${timeoutMs}ms.`,
        );
      }

      if (externalSignal?.aborted) {
        return createUnavailableRouteResult(
          origin,
          destination,
          'aborted',
          'Route calculation request was aborted.',
        );
      }

      const message = error instanceof Error ? error.message : 'Unknown network failure';
      return createUnavailableRouteResult(
        origin,
        destination,
        'network_error',
        `Network error during route request: ${message}`,
      );
    } finally {
      clearTimeout(timerId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', abortHandler);
      }
    }
  }
}
