/**
 * Map and geolocation domain types for straight-line radius filtering and branch location.
 */

export interface Coordinates {
  readonly latitude: number;
  readonly longitude: number;
}

export interface GeoBoundingBox {
  readonly minLat: number;
  readonly maxLat: number;
  readonly minLon: number;
  readonly maxLon: number;
}

export const RADIUS_PRESETS_KM = [1, 3, 5] as const;

export type RadiusPresetKm = (typeof RADIUS_PRESETS_KM)[number];

export type RadiusFilterInput =
  | {
      readonly type: 'preset';
      readonly radiusKm: RadiusPresetKm;
    }
  | {
      readonly type: 'custom';
      readonly radiusKm: number;
    };

export interface LocatableBranch {
  readonly id: string;
  readonly name: string;
  readonly coordinates: Coordinates;
}

export interface BranchDistanceResult<T extends LocatableBranch = LocatableBranch> {
  readonly branch: T;
  readonly distanceKm: number;
  readonly isWithinRadius: boolean;
}

export interface RadiusFilterOptions {
  readonly center: Coordinates;
  readonly maxRadiusKm: number;
  readonly boundingBox?: GeoBoundingBox;
  readonly limit?: number;
}

export interface CoordinateValidationError {
  readonly valid: false;
  readonly error: string;
}

export interface CoordinateValidationSuccess {
  readonly valid: true;
  readonly coordinates: Coordinates;
}

export type CoordinateValidationResult = CoordinateValidationSuccess | CoordinateValidationError;

export interface RadiusFilterInputSuccess {
  readonly valid: true;
  readonly radiusKm: number;
  readonly isPreset: boolean;
  readonly presetKm?: RadiusPresetKm;
}

export interface RadiusFilterInputError {
  readonly valid: false;
  readonly error: string;
}

export type RadiusFilterInputResult = RadiusFilterInputSuccess | RadiusFilterInputError;
