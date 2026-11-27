import type { Coordinates } from '../../features/map/types';
import type { RouteUnavailableReason, RouteUnavailableResult } from './types';

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
