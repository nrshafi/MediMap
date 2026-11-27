import type { Coordinates } from '../../features/map/types';

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

export interface RouteAvailableResult {
  readonly status: 'available';
  readonly roadDistanceKm: number;
  readonly travelDurationMinutes: number;
  readonly origin: Coordinates;
  readonly destination: Coordinates;
  readonly source: string;
}

export interface RouteUnavailableResult {
  readonly status: 'unavailable';
  readonly reason: RouteUnavailableReason;
  readonly message: string;
  readonly origin: Coordinates;
  readonly destination: Coordinates;
  readonly roadDistanceKm?: undefined;
  readonly travelDurationMinutes?: undefined;
}

export type RouteResult = RouteAvailableResult | RouteUnavailableResult;
