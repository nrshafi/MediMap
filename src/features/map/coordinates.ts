/**
 * Geographic coordinates and bounding box validation utilities for MediMap.
 */

import type { CoordinateValidationResult, Coordinates, GeoBoundingBox } from './types';

/**
 * Standard bounding boxes for the Dhaka metropolitan area.
 * - core: Central Dhaka healthcare corridor.
 * - greaterDhaka: Encompassing Savar, Gazipur, Narayanganj boundaries.
 */
export const DHAKA_BOUNDING_BOXES: {
  readonly core: GeoBoundingBox;
  readonly greaterDhaka: GeoBoundingBox;
} = {
  core: {
    minLat: 23.68,
    maxLat: 23.9,
    minLon: 90.32,
    maxLon: 90.45,
  },
  greaterDhaka: {
    minLat: 23.55,
    maxLat: 24.02,
    minLon: 90.18,
    maxLon: 90.58,
  },
} as const;

/**
 * Validates whether an unknown value is a valid Coordinates object.
 * Checks for numeric finite values within WGS84 standard ranges:
 * - Latitude: [-90, 90]
 * - Longitude: [-180, 180]
 */
export function isValidCoordinate(coord: unknown): coord is Coordinates {
  if (typeof coord !== 'object' || coord === null) {
    return false;
  }

  const { latitude, longitude } = coord as Record<string, unknown>;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return false;
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return false;
  }

  if (latitude < -90 || latitude > 90) {
    return false;
  }

  if (longitude < -180 || longitude > 180) {
    return false;
  }

  return true;
}

/**
 * Validates an unknown input as Coordinates and returns a detailed validation result.
 */
export function validateCoordinate(coord: unknown): CoordinateValidationResult {
  if (typeof coord !== 'object' || coord === null) {
    return {
      valid: false,
      error: 'Coordinate must be an object with latitude and longitude properties.',
    };
  }

  const { latitude, longitude } = coord as Record<string, unknown>;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return {
      valid: false,
      error: 'Coordinate latitude and longitude must be numbers.',
    };
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return {
      valid: false,
      error: 'Coordinate latitude and longitude must be finite numbers.',
    };
  }

  if (latitude < -90 || latitude > 90) {
    return {
      valid: false,
      error: `Latitude must be between -90 and 90 degrees. Received: ${latitude}`,
    };
  }

  if (longitude < -180 || longitude > 180) {
    return {
      valid: false,
      error: `Longitude must be between -180 and 180 degrees. Received: ${longitude}`,
    };
  }

  return {
    valid: true,
    coordinates: {
      latitude,
      longitude,
    },
  };
}

/**
 * Checks whether a given coordinate falls within a specified bounding box.
 */
export function isWithinBoundingBox(coord: Coordinates, box: GeoBoundingBox): boolean {
  return (
    coord.latitude >= box.minLat &&
    coord.latitude <= box.maxLat &&
    coord.longitude >= box.minLon &&
    coord.longitude <= box.maxLon
  );
}

/**
 * Checks whether a coordinate is within the Dhaka core or Greater Dhaka metropolitan region.
 * Default region is 'core'.
 */
export function isWithinDhakaRegion(
  coord: Coordinates,
  region: 'core' | 'greater' = 'core',
): boolean {
  const box = region === 'greater' ? DHAKA_BOUNDING_BOXES.greaterDhaka : DHAKA_BOUNDING_BOXES.core;

  return isWithinBoundingBox(coord, box);
}
