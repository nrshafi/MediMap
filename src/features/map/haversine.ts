/**
 * Haversine formula calculation for straight-line spherical distance on Earth.
 */

import { isValidCoordinate } from './coordinates';
import type { Coordinates } from './types';

/**
 * Standard mean radius of Earth in kilometers as defined by IUGG / WGS84 spherical approximation.
 */
export const EARTH_RADIUS_KM = 6371.0;

/**
 * Converts degrees to radians.
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates the great-circle (straight-line spherical) distance between two points on Earth
 * using the Haversine formula.
 *
 * Implements a numerical stability clamp to prevent NaN or domain errors when calculating
 * angular distance for identical or antipodal points with floating-point variance.
 *
 * @param pointA Source coordinates
 * @param pointB Target coordinates
 * @returns Distance in kilometers
 */
export function calculateHaversineDistanceKm(pointA: Coordinates, pointB: Coordinates): number {
  if (!isValidCoordinate(pointA) || !isValidCoordinate(pointB)) {
    throw new RangeError('Distance requires valid WGS 84 coordinates.');
  }

  if (pointA.latitude === pointB.latitude && pointA.longitude === pointB.longitude) {
    return 0;
  }

  const phi1 = toRadians(pointA.latitude);
  const phi2 = toRadians(pointB.latitude);
  const deltaPhi = toRadians(pointB.latitude - pointA.latitude);
  const deltaLambda = toRadians(pointB.longitude - pointA.longitude);

  const sinHalfDeltaPhi = Math.sin(deltaPhi / 2);
  const sinHalfDeltaLambda = Math.sin(deltaLambda / 2);

  // haversine(theta) = sin^2(deltaPhi/2) + cos(phi1) * cos(phi2) * sin^2(deltaLambda/2)
  const aRaw =
    sinHalfDeltaPhi * sinHalfDeltaPhi +
    Math.cos(phi1) * Math.cos(phi2) * sinHalfDeltaLambda * sinHalfDeltaLambda;

  // Numerical stability clamp to [0, 1] against floating-point rounding errors
  const a = Math.max(0, Math.min(1, aRaw));

  // Angular distance in radians
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Rounds distance in kilometers to a specified number of decimal places.
 * Default is 2 decimal places (precision of ~10 meters).
 */
export function roundDistanceKm(distanceKm: number, decimalPlaces = 2): number {
  if (!Number.isFinite(distanceKm)) {
    throw new RangeError('Distance must be finite.');
  }
  const factor = 10 ** decimalPlaces;
  const rounded = Math.round(distanceKm * factor) / factor;
  return rounded === 0 ? 0 : rounded;
}
