/**
 * Straight-line radius filtering logic for diagnostic center branches.
 */

import { isValidCoordinate, isWithinBoundingBox } from './coordinates';
import { calculateHaversineDistanceKm } from './haversine';
import {
  RADIUS_PRESETS_KM,
  type BranchDistanceResult,
  type LocatableBranch,
  type RadiusFilterInputResult,
  type RadiusFilterOptions,
  type RadiusPresetKm,
} from './types';

/**
 * Maximum reasonable radius in kilometers for Dhaka metropolitan healthcare filtering.
 */
export const MAX_CUSTOM_RADIUS_KM = 100;

/**
 * Minimum reasonable radius in kilometers for filtering (100 meters).
 */
export const MIN_CUSTOM_RADIUS_KM = 0.1;

/**
 * Checks if a given numeric value is one of the standard radius presets (1, 3, 5 km).
 */
function isRadiusPreset(value: number): value is RadiusPresetKm {
  return (RADIUS_PRESETS_KM as readonly number[]).includes(value);
}

/**
 * Parses and validates an unknown radius filter input.
 * Supports:
 * - A numeric value directly (e.g., 1, 3, 5, or custom number)
 * - An object matching `{ type: 'preset', radiusKm: 1 | 3 | 5 }`
 * - An object matching `{ type: 'custom', radiusKm: number }`
 * - An object with `{ radiusKm: number }`
 */
export function parseRadiusFilterInput(input: unknown): RadiusFilterInputResult {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) {
      return {
        valid: false,
        error: 'Radius must be a finite number.',
      };
    }

    if (input < MIN_CUSTOM_RADIUS_KM) {
      return {
        valid: false,
        error: `Radius cannot be less than ${MIN_CUSTOM_RADIUS_KM} km. Received: ${input}`,
      };
    }

    if (input > MAX_CUSTOM_RADIUS_KM) {
      return {
        valid: false,
        error: `Radius cannot exceed ${MAX_CUSTOM_RADIUS_KM} km. Received: ${input}`,
      };
    }

    const preset = isRadiusPreset(input);
    return {
      valid: true,
      radiusKm: input,
      isPreset: preset,
      ...(preset ? { presetKm: input } : {}),
    };
  }

  if (typeof input === 'object' && input !== null) {
    const candidate = input as Record<string, unknown>;

    if ('type' in candidate && candidate.type !== 'preset' && candidate.type !== 'custom') {
      return { valid: false, error: 'Radius input type must be preset or custom.' };
    }

    if (typeof candidate.radiusKm !== 'number') {
      return {
        valid: false,
        error: 'Radius input must contain a numeric radiusKm property.',
      };
    }

    const radius = candidate.radiusKm;
    if (!Number.isFinite(radius)) {
      return {
        valid: false,
        error: 'Radius must be a finite number.',
      };
    }

    if (candidate.type === 'preset') {
      if (!isRadiusPreset(radius)) {
        return {
          valid: false,
          error: `Preset radius must be one of [${RADIUS_PRESETS_KM.join(', ')}] km. Received: ${radius}`,
        };
      }
      return {
        valid: true,
        radiusKm: radius,
        isPreset: true,
        presetKm: radius,
      };
    }

    if (candidate.type === 'custom') {
      if (radius < MIN_CUSTOM_RADIUS_KM || radius > MAX_CUSTOM_RADIUS_KM) {
        return {
          valid: false,
          error: `Custom radius must be between ${MIN_CUSTOM_RADIUS_KM} and ${MAX_CUSTOM_RADIUS_KM} km. Received: ${radius}`,
        };
      }
      const preset = isRadiusPreset(radius);
      return {
        valid: true,
        radiusKm: radius,
        isPreset: preset,
        ...(preset ? { presetKm: radius } : {}),
      };
    }

    // Default object without explicit type field
    if (radius < MIN_CUSTOM_RADIUS_KM || radius > MAX_CUSTOM_RADIUS_KM) {
      return {
        valid: false,
        error: `Radius must be between ${MIN_CUSTOM_RADIUS_KM} and ${MAX_CUSTOM_RADIUS_KM} km. Received: ${radius}`,
      };
    }

    const preset = isRadiusPreset(radius);
    return {
      valid: true,
      radiusKm: radius,
      isPreset: preset,
      ...(preset ? { presetKm: radius } : {}),
    };
  }

  return {
    valid: false,
    error: 'Radius input must be a number or an object specifying radiusKm.',
  };
}

/**
 * Filters branches within a straight-line radius from a central coordinate.
 *
 * Algorithm:
 * 1. If an optional bounding box is supplied, branches outside the bounding box are filtered out.
 * 2. Calculates straight-line distance to each branch using the Haversine formula.
 * 3. Filters branches where distance <= maxRadiusKm.
 * 4. Sorts matching branches in ascending order (nearest branch first).
 * 5. Applies an optional limit to the result set.
 *
 * @param branches List of locatable branches
 * @param options Center coordinate, max radius in km, optional bounding box, optional limit
 * @returns Sorted list of branches with distance information
 */
export function filterBranchesByRadius<T extends LocatableBranch>(
  branches: readonly T[],
  options: RadiusFilterOptions,
): readonly BranchDistanceResult<T>[] {
  const { center, maxRadiusKm, boundingBox, limit } = options;

  if (!isValidCoordinate(center)) {
    throw new RangeError('Center must contain valid WGS 84 coordinates.');
  }

  const radius = parseRadiusFilterInput(maxRadiusKm);
  if (!radius.valid) {
    throw new RangeError(radius.error);
  }

  if (limit !== undefined && (!Number.isInteger(limit) || limit < 0)) {
    throw new RangeError('Limit must be a nonnegative finite integer.');
  }

  if (limit === 0) {
    return [];
  }

  const results: BranchDistanceResult<T>[] = [];

  for (const branch of branches) {
    if (!isValidCoordinate(branch.coordinates)) {
      continue;
    }
    if (boundingBox && !isWithinBoundingBox(branch.coordinates, boundingBox)) {
      continue;
    }

    const distanceKm = calculateHaversineDistanceKm(center, branch.coordinates);
    const isWithinRadius = distanceKm <= maxRadiusKm;

    if (isWithinRadius) {
      results.push({
        branch,
        distanceKm,
        isWithinRadius: true,
      });
    }
  }

  results.sort((a, b) => a.distanceKm - b.distanceKm);

  if (limit !== undefined) {
    return results.slice(0, limit);
  }

  return results;
}
