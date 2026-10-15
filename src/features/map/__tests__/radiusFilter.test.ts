import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DHAKA_BOUNDING_BOXES,
  DHAKA_LANDMARKS,
  EARTH_RADIUS_KM,
  MAX_CUSTOM_RADIUS_KM,
  MIN_CUSTOM_RADIUS_KM,
  RADIUS_PRESETS_KM,
  calculateHaversineDistanceKm,
  filterBranchesByRadius,
  isValidCoordinate,
  isWithinBoundingBox,
  isWithinDhakaRegion,
  parseRadiusFilterInput,
  validateCoordinate,
  type Coordinates,
  type LocatableBranch,
} from '../index';

describe('Coordinates & Bounding Box Validation', () => {
  it('identifies valid coordinates accurately across normal and extreme valid ranges', () => {
    // Standard coordinates
    assert.equal(isValidCoordinate({ latitude: 23.7533, longitude: 90.3816 }), true);
    assert.equal(isValidCoordinate({ latitude: 23.7259, longitude: 90.3976 }), true);

    // Exact standard WGS84 boundary limits
    assert.equal(isValidCoordinate({ latitude: -90, longitude: -180 }), true);
    assert.equal(isValidCoordinate({ latitude: 90, longitude: 180 }), true);
    assert.equal(isValidCoordinate({ latitude: -90, longitude: 180 }), true);
    assert.equal(isValidCoordinate({ latitude: 90, longitude: -180 }), true);
    assert.equal(isValidCoordinate({ latitude: 0, longitude: 0 }), true);
    assert.equal(isValidCoordinate({ latitude: 0, longitude: 180 }), true);
    assert.equal(isValidCoordinate({ latitude: -90, longitude: 0 }), true);
  });

  it('rejects invalid coordinates with out-of-range, non-numeric, or malformed inputs', () => {
    // Non-object and falsy values
    assert.equal(isValidCoordinate(null), false);
    assert.equal(isValidCoordinate(undefined), false);
    assert.equal(isValidCoordinate('23.75, 90.38'), false);
    assert.equal(isValidCoordinate(12345), false);
    assert.equal(isValidCoordinate(true), false);
    assert.equal(isValidCoordinate([]), false);
    assert.equal(isValidCoordinate(() => {}), false);

    // Missing or wrong properties
    assert.equal(isValidCoordinate({}), false);
    assert.equal(isValidCoordinate({ lat: 23.0, lng: 90.0 }), false);
    assert.equal(isValidCoordinate({ latitude: 23.0 }), false);
    assert.equal(isValidCoordinate({ longitude: 90.0 }), false);

    // Out-of-range latitude (> 90 or < -90)
    assert.equal(isValidCoordinate({ latitude: 90.0001, longitude: 90.0 }), false);
    assert.equal(isValidCoordinate({ latitude: -90.0001, longitude: 90.0 }), false);
    assert.equal(isValidCoordinate({ latitude: 120.0, longitude: 90.0 }), false);
    assert.equal(isValidCoordinate({ latitude: -91.0, longitude: 90.0 }), false);

    // Out-of-range longitude (> 180 or < -180)
    assert.equal(isValidCoordinate({ latitude: 23.0, longitude: 180.0001 }), false);
    assert.equal(isValidCoordinate({ latitude: 23.0, longitude: -180.0001 }), false);
    assert.equal(isValidCoordinate({ latitude: 23.0, longitude: 200.0 }), false);
    assert.equal(isValidCoordinate({ latitude: 23.0, longitude: -185.0 }), false);

    // Non-finite values
    assert.equal(isValidCoordinate({ latitude: Number.NaN, longitude: 90.0 }), false);
    assert.equal(isValidCoordinate({ latitude: 23.0, longitude: Number.NaN }), false);
    assert.equal(isValidCoordinate({ latitude: Number.POSITIVE_INFINITY, longitude: 90.0 }), false);
    assert.equal(isValidCoordinate({ latitude: 23.0, longitude: Number.NEGATIVE_INFINITY }), false);

    // String types inside object
    assert.equal(isValidCoordinate({ latitude: '23.0', longitude: 90.0 }), false);
    assert.equal(isValidCoordinate({ latitude: 23.0, longitude: '90.0' }), false);
  });

  it('provides detailed and structured error messages with validateCoordinate', () => {
    // Valid case
    const success = validateCoordinate({ latitude: 23.7533, longitude: 90.3816 });
    assert.equal(success.valid, true);
    if (success.valid) {
      assert.equal(success.coordinates.latitude, 23.7533);
      assert.equal(success.coordinates.longitude, 90.3816);
    }

    // Non-object errors
    const nonObject = validateCoordinate('invalid');
    assert.equal(nonObject.valid, false);
    if (!nonObject.valid) {
      assert.ok(nonObject.error.includes('must be an object'));
    }

    const nullValue = validateCoordinate(null);
    assert.equal(nullValue.valid, false);
    if (!nullValue.valid) {
      assert.ok(nullValue.error.includes('must be an object'));
    }

    // Missing / non-numeric properties
    const nonNumeric = validateCoordinate({ latitude: '23.7', longitude: 90.3 });
    assert.equal(nonNumeric.valid, false);
    if (!nonNumeric.valid) {
      assert.ok(nonNumeric.error.includes('must be numbers'));
    }

    // Non-finite values
    const nonFiniteLat = validateCoordinate({ latitude: Number.NaN, longitude: 90.3 });
    assert.equal(nonFiniteLat.valid, false);
    if (!nonFiniteLat.valid) {
      assert.ok(nonFiniteLat.error.includes('must be finite numbers'));
    }

    const nonFiniteLon = validateCoordinate({ latitude: 23.7, longitude: Number.POSITIVE_INFINITY });
    assert.equal(nonFiniteLon.valid, false);
    if (!nonFiniteLon.valid) {
      assert.ok(nonFiniteLon.error.includes('must be finite numbers'));
    }

    // Out-of-bounds latitude
    const latHigh = validateCoordinate({ latitude: 95.0, longitude: 90.0 });
    assert.equal(latHigh.valid, false);
    if (!latHigh.valid) {
      assert.ok(latHigh.error.includes('Latitude must be between -90 and 90'));
      assert.ok(latHigh.error.includes('95'));
    }

    const latLow = validateCoordinate({ latitude: -90.5, longitude: 90.0 });
    assert.equal(latLow.valid, false);
    if (!latLow.valid) {
      assert.ok(latLow.error.includes('Latitude must be between -90 and 90'));
    }

    // Out-of-bounds longitude
    const lonHigh = validateCoordinate({ latitude: 23.0, longitude: 200.0 });
    assert.equal(lonHigh.valid, false);
    if (!lonHigh.valid) {
      assert.ok(lonHigh.error.includes('Longitude must be between -180 and 180'));
      assert.ok(lonHigh.error.includes('200'));
    }

    const lonLow = validateCoordinate({ latitude: 23.0, longitude: -185.0 });
    assert.equal(lonLow.valid, false);
    if (!lonLow.valid) {
      assert.ok(lonLow.error.includes('Longitude must be between -180 and 180'));
    }
  });

  it('evaluates Core Dhaka bounding box boundaries and landmarks correctly', () => {
    const box = DHAKA_BOUNDING_BOXES.core;

    // Landmarks located inside core Dhaka
    assert.equal(isWithinBoundingBox(DHAKA_LANDMARKS.squareHospital.coordinates, box), true);
    assert.equal(isWithinBoundingBox(DHAKA_LANDMARKS.bsmmu.coordinates, box), true);
    assert.equal(isWithinBoundingBox(DHAKA_LANDMARKS.dmch.coordinates, box), true);
    assert.equal(isWithinBoundingBox(DHAKA_LANDMARKS.farmgate.coordinates, box), true);
    assert.equal(isWithinBoundingBox(DHAKA_LANDMARKS.jatiyaSangsad.coordinates, box), true);
    assert.equal(isWithinBoundingBox(DHAKA_LANDMARKS.popularDhanmondi.coordinates, box), true);
    assert.equal(isWithinBoundingBox(DHAKA_LANDMARKS.gulshan2.coordinates, box), true);
    assert.equal(isWithinBoundingBox(DHAKA_LANDMARKS.mirpur10.coordinates, box), true);
    assert.equal(isWithinBoundingBox(DHAKA_LANDMARKS.uttaraHouseBuilding.coordinates, box), true);

    // Exact min/max bounding box boundary corners (inclusive)
    assert.equal(isWithinBoundingBox({ latitude: box.minLat, longitude: box.minLon }, box), true);
    assert.equal(isWithinBoundingBox({ latitude: box.maxLat, longitude: box.maxLon }, box), true);
    assert.equal(isWithinBoundingBox({ latitude: box.minLat, longitude: box.maxLon }, box), true);
    assert.equal(isWithinBoundingBox({ latitude: box.maxLat, longitude: box.minLon }, box), true);

    // Boundary edge tests: epsilon outside boundary
    const eps = 0.0001;
    assert.equal(isWithinBoundingBox({ latitude: box.minLat - eps, longitude: box.minLon }, box), false);
    assert.equal(isWithinBoundingBox({ latitude: box.maxLat + eps, longitude: box.maxLon }, box), false);
    assert.equal(isWithinBoundingBox({ latitude: box.minLat, longitude: box.minLon - eps }, box), false);
    assert.equal(isWithinBoundingBox({ latitude: box.maxLat, longitude: box.maxLon + eps }, box), false);
  });

  it('evaluates Greater Dhaka bounding box and peripheral locations accurately', () => {
    const coreBox = DHAKA_BOUNDING_BOXES.core;
    const greaterBox = DHAKA_BOUNDING_BOXES.greaterDhaka;

    // Savar center: (23.8500, 90.2600) -> outside core, inside greater
    const savarCoord = { latitude: 23.8500, longitude: 90.2600 };
    assert.equal(isWithinBoundingBox(savarCoord, coreBox), false);
    assert.equal(isWithinBoundingBox(savarCoord, greaterBox), true);

    // Gazipur center: (23.9900, 90.4200) -> outside core, inside greater
    const gazipurCoord = { latitude: 23.9900, longitude: 90.4200 };
    assert.equal(isWithinBoundingBox(gazipurCoord, coreBox), false);
    assert.equal(isWithinBoundingBox(gazipurCoord, greaterBox), true);

    // Narayanganj center: (23.6200, 90.5000) -> outside core, inside greater
    const narayanganjCoord = { latitude: 23.6200, longitude: 90.5000 };
    assert.equal(isWithinBoundingBox(narayanganjCoord, coreBox), false);
    assert.equal(isWithinBoundingBox(narayanganjCoord, greaterBox), true);

    // Keraniganj south: (23.6800, 90.3100) -> minLon of core is 90.3200, so outside core, inside greater
    const keraniganjCoord = { latitude: 23.6800, longitude: 90.3100 };
    assert.equal(isWithinBoundingBox(keraniganjCoord, coreBox), false);
    assert.equal(isWithinBoundingBox(keraniganjCoord, greaterBox), true);

    // Locations outside Greater Dhaka entirely
    const chittagongCoord = { latitude: 22.3569, longitude: 91.7832 };
    const sylhetCoord = { latitude: 24.8949, longitude: 91.8687 };
    const londonCoord = { latitude: 51.5074, longitude: -0.1278 };
    const tokyoCoord = { latitude: 35.6762, longitude: 139.6503 };

    assert.equal(isWithinBoundingBox(chittagongCoord, greaterBox), false);
    assert.equal(isWithinBoundingBox(sylhetCoord, greaterBox), false);
    assert.equal(isWithinBoundingBox(londonCoord, greaterBox), false);
    assert.equal(isWithinBoundingBox(tokyoCoord, greaterBox), false);

    // Exact Greater Dhaka min/max boundary corners
    assert.equal(isWithinBoundingBox({ latitude: greaterBox.minLat, longitude: greaterBox.minLon }, greaterBox), true);
    assert.equal(isWithinBoundingBox({ latitude: greaterBox.maxLat, longitude: greaterBox.maxLon }, greaterBox), true);
    assert.equal(isWithinBoundingBox({ latitude: greaterBox.minLat, longitude: greaterBox.maxLon }, greaterBox), true);
    assert.equal(isWithinBoundingBox({ latitude: greaterBox.maxLat, longitude: greaterBox.minLon }, greaterBox), true);

    // Outside Greater Dhaka by epsilon
    const eps = 0.0001;
    assert.equal(isWithinBoundingBox({ latitude: greaterBox.minLat - eps, longitude: greaterBox.minLon }, greaterBox), false);
    assert.equal(isWithinBoundingBox({ latitude: greaterBox.maxLat + eps, longitude: greaterBox.maxLon }, greaterBox), false);
    assert.equal(isWithinBoundingBox({ latitude: greaterBox.minLat, longitude: greaterBox.minLon - eps }, greaterBox), false);
    assert.equal(isWithinBoundingBox({ latitude: greaterBox.maxLat, longitude: greaterBox.maxLon + eps }, greaterBox), false);
  });

  it('checks Dhaka core vs Greater Dhaka region through isWithinDhakaRegion', () => {
    // Default region parameter is 'core'
    assert.equal(isWithinDhakaRegion(DHAKA_LANDMARKS.dmch.coordinates), true);
    assert.equal(isWithinDhakaRegion(DHAKA_LANDMARKS.dmch.coordinates, 'core'), true);
    assert.equal(isWithinDhakaRegion(DHAKA_LANDMARKS.dmch.coordinates, 'greater'), true);

    const savarCoord = { latitude: 23.8500, longitude: 90.2600 };
    assert.equal(isWithinDhakaRegion(savarCoord), false);
    assert.equal(isWithinDhakaRegion(savarCoord, 'core'), false);
    assert.equal(isWithinDhakaRegion(savarCoord, 'greater'), true);

    const chittagongCoord = { latitude: 22.3569, longitude: 91.7832 };
    assert.equal(isWithinDhakaRegion(chittagongCoord), false);
    assert.equal(isWithinDhakaRegion(chittagongCoord, 'core'), false);
    assert.equal(isWithinDhakaRegion(chittagongCoord, 'greater'), false);
  });
});

describe('Radius Input Parsing & Validation', () => {
  it('parses valid numeric presets (1, 3, 5 km)', () => {
    for (const preset of RADIUS_PRESETS_KM) {
      const result = parseRadiusFilterInput(preset);
      assert.equal(result.valid, true);
      if (result.valid) {
        assert.equal(result.radiusKm, preset);
        assert.equal(result.isPreset, true);
        assert.equal(result.presetKm, preset);
      }
    }
  });

  it('parses valid custom numbers within [0.1, 100] km', () => {
    const testValues = [0.1, 0.5, 2.5, 4.0, 10.0, 20.0, 50.0, 100.0];
    for (const value of testValues) {
      const result = parseRadiusFilterInput(value);
      assert.equal(result.valid, true);
      if (result.valid) {
        assert.equal(result.radiusKm, value);
        assert.equal(result.isPreset, false);
        assert.equal(result.presetKm, undefined);
      }
    }
  });

  it('parses structured preset and custom objects', () => {
    // Preset object
    const preset1 = parseRadiusFilterInput({ type: 'preset', radiusKm: 1 });
    assert.equal(preset1.valid, true);
    if (preset1.valid) {
      assert.equal(preset1.radiusKm, 1);
      assert.equal(preset1.isPreset, true);
      assert.equal(preset1.presetKm, 1);
    }

    const preset5 = parseRadiusFilterInput({ type: 'preset', radiusKm: 5 });
    assert.equal(preset5.valid, true);
    if (preset5.valid) {
      assert.equal(preset5.radiusKm, 5);
      assert.equal(preset5.isPreset, true);
      assert.equal(preset5.presetKm, 5);
    }

    // Custom object
    const customObj = parseRadiusFilterInput({ type: 'custom', radiusKm: 7.5 });
    assert.equal(customObj.valid, true);
    if (customObj.valid) {
      assert.equal(customObj.radiusKm, 7.5);
      assert.equal(customObj.isPreset, false);
      assert.equal(customObj.presetKm, undefined);
    }

    // Generic object without explicit type
    const genericObj = parseRadiusFilterInput({ radiusKm: 12.0 });
    assert.equal(genericObj.valid, true);
    if (genericObj.valid) {
      assert.equal(genericObj.radiusKm, 12.0);
      assert.equal(genericObj.isPreset, false);
    }

    const genericPresetObj = parseRadiusFilterInput({ radiusKm: 3 });
    assert.equal(genericPresetObj.valid, true);
    if (genericPresetObj.valid) {
      assert.equal(genericPresetObj.radiusKm, 3);
      assert.equal(genericPresetObj.isPreset, true);
      assert.equal(genericPresetObj.presetKm, 3);
    }
  });

  it('rejects invalid numbers: negative, zero, below min, above max, non-finite', () => {
    // Negative numbers
    const negative = parseRadiusFilterInput(-1);
    assert.equal(negative.valid, false);
    if (!negative.valid) {
      assert.ok(negative.error.includes('cannot be less than'));
    }

    // Zero
    const zero = parseRadiusFilterInput(0);
    assert.equal(zero.valid, false);
    if (!zero.valid) {
      assert.ok(zero.error.includes('cannot be less than'));
    }

    // Below minimum (0.1 km)
    const belowMin = parseRadiusFilterInput(MIN_CUSTOM_RADIUS_KM - 0.01);
    assert.equal(belowMin.valid, false);
    if (!belowMin.valid) {
      assert.ok(belowMin.error.includes('cannot be less than 0.1 km'));
    }

    // Above maximum (100 km)
    const aboveMax = parseRadiusFilterInput(MAX_CUSTOM_RADIUS_KM + 0.1);
    assert.equal(aboveMax.valid, false);
    if (!aboveMax.valid) {
      assert.ok(aboveMax.error.includes('cannot exceed 100 km'));
    }

    // Non-finite numbers
    const nanInput = parseRadiusFilterInput(Number.NaN);
    assert.equal(nanInput.valid, false);
    if (!nanInput.valid) {
      assert.ok(nanInput.error.includes('must be a finite number'));
    }

    const infInput = parseRadiusFilterInput(Number.POSITIVE_INFINITY);
    assert.equal(infInput.valid, false);
    if (!infInput.valid) {
      assert.ok(infInput.error.includes('must be a finite number'));
    }
  });

  it('rejects invalid structured objects and non-numeric inputs', () => {
    // Non-numeric types
    assert.equal(parseRadiusFilterInput(null).valid, false);
    assert.equal(parseRadiusFilterInput(undefined).valid, false);
    assert.equal(parseRadiusFilterInput('5').valid, false);
    assert.equal(parseRadiusFilterInput([]).valid, false);
    assert.equal(parseRadiusFilterInput(true).valid, false);

    // Missing radiusKm
    const missingProp = parseRadiusFilterInput({ radius: 5 });
    assert.equal(missingProp.valid, false);
    if (!missingProp.valid) {
      assert.ok(missingProp.error.includes('must contain a numeric radiusKm property'));
    }

    // Non-finite radiusKm in object
    const nonFiniteObj = parseRadiusFilterInput({ radiusKm: Number.NaN });
    assert.equal(nonFiniteObj.valid, false);
    if (!nonFiniteObj.valid) {
      assert.ok(nonFiniteObj.error.includes('must be a finite number'));
    }

    // Invalid preset value in preset type
    const invalidPresetValue = parseRadiusFilterInput({ type: 'preset', radiusKm: 4 });
    assert.equal(invalidPresetValue.valid, false);
    if (!invalidPresetValue.valid) {
      assert.ok(invalidPresetValue.error.includes('Preset radius must be one of [1, 3, 5]'));
    }

    // Out of range in custom type
    const customOutOfRange = parseRadiusFilterInput({ type: 'custom', radiusKm: 150 });
    assert.equal(customOutOfRange.valid, false);
    if (!customOutOfRange.valid) {
      assert.ok(customOutOfRange.error.includes('must be between 0.1 and 100 km'));
    }

    const customBelowMin = parseRadiusFilterInput({ type: 'custom', radiusKm: 0.05 });
    assert.equal(customBelowMin.valid, false);
    if (!customBelowMin.valid) {
      assert.ok(customBelowMin.error.includes('must be between 0.1 and 100 km'));
    }

    // Out of range in default object
    const defaultObjOutOfRange = parseRadiusFilterInput({ radiusKm: 105 });
    assert.equal(defaultObjOutOfRange.valid, false);
    if (!defaultObjOutOfRange.valid) {
      assert.ok(defaultObjOutOfRange.error.includes('must be between 0.1 and 100 km'));
    }
  });
});

describe('Branch Radius Filtering Engine', () => {
  const branches: readonly LocatableBranch[] = [
    {
      id: 'b-square',
      name: 'Square Hospital Branch',
      coordinates: DHAKA_LANDMARKS.squareHospital.coordinates,
    },
    {
      id: 'b-bsmmu',
      name: 'BSMMU Branch',
      coordinates: DHAKA_LANDMARKS.bsmmu.coordinates,
    },
    {
      id: 'b-popular-dhanmondi',
      name: 'Popular Dhanmondi Branch',
      coordinates: DHAKA_LANDMARKS.popularDhanmondi.coordinates,
    },
    {
      id: 'b-dmch',
      name: 'DMCH Branch',
      coordinates: DHAKA_LANDMARKS.dmch.coordinates,
    },
    {
      id: 'b-gulshan2',
      name: 'Gulshan-2 Branch',
      coordinates: DHAKA_LANDMARKS.gulshan2.coordinates,
    },
    {
      id: 'b-evercare',
      name: 'Evercare Bashundhara Branch',
      coordinates: DHAKA_LANDMARKS.evercare.coordinates,
    },
    {
      id: 'b-uttara',
      name: 'Uttara House Building Branch',
      coordinates: DHAKA_LANDMARKS.uttaraHouseBuilding.coordinates,
    },
    {
      id: 'b-chittagong',
      name: 'Chittagong GEC Branch',
      coordinates: { latitude: 22.3569, longitude: 91.7832 },
    },
  ];

  it('filters branches strictly with 1 km preset from Farmgate', () => {
    const farmgate = DHAKA_LANDMARKS.farmgate.coordinates;

    const results = filterBranchesByRadius(branches, {
      center: farmgate,
      maxRadiusKm: 1,
    });

    // Square Hospital (~0.65 km) is within 1 km
    // Popular Dhanmondi (~1.53 km), BSMMU (~2.11 km) are outside 1 km
    assert.equal(results.length, 1);
    assert.equal(results[0]?.branch.id, 'b-square');
    assert.ok((results[0]?.distanceKm ?? 0) <= 1.0);
    assert.equal(results[0]?.isWithinRadius, true);
  });

  it('filters branches strictly with 3 km preset from Farmgate', () => {
    const farmgate = DHAKA_LANDMARKS.farmgate.coordinates;

    const results = filterBranchesByRadius(branches, {
      center: farmgate,
      maxRadiusKm: 3,
    });

    // Within 3km of Farmgate: Square (~0.65km), Popular Dhanmondi (~1.53km), BSMMU (~2.11km)
    // DMCH (~3.5km), Gulshan-2 (~5.1km), Evercare (~7.5km) are outside 3km
    assert.equal(results.length, 3);
    assert.equal(results[0]?.branch.id, 'b-square');
    assert.equal(results[1]?.branch.id, 'b-popular-dhanmondi');
    assert.equal(results[2]?.branch.id, 'b-bsmmu');

    for (const r of results) {
      assert.ok(r.distanceKm <= 3.0);
      assert.equal(r.isWithinRadius, true);
    }
  });

  it('filters branches strictly with 5 km preset from Shahbagh', () => {
    const shahbagh = DHAKA_LANDMARKS.shahbagh.coordinates;

    const results = filterBranchesByRadius(branches, {
      center: shahbagh,
      maxRadiusKm: 5,
    });

    // From Shahbagh:
    // BSMMU (~0.056 km)
    // DMCH (~1.39 km)
    // Popular Dhanmondi (~1.46 km)
    // Square Hospital (~2.16 km)
    // Outside 5km: Gulshan-2 (~6.57km), Evercare (~8.78km), Uttara (~14.41km), Chittagong (~200+km)
    assert.equal(results.length, 4);
    assert.equal(results[0]?.branch.id, 'b-bsmmu');
    assert.equal(results[1]?.branch.id, 'b-dmch');
    assert.equal(results[2]?.branch.id, 'b-popular-dhanmondi');
    assert.equal(results[3]?.branch.id, 'b-square');

    for (const r of results) {
      assert.ok(r.distanceKm <= 5.0);
      assert.equal(r.isWithinRadius, true);
    }
  });

  it('filters branches correctly with custom distances (0.5 km, 2.5 km, 4.0 km, 10.0 km, 20.0 km)', () => {
    const shahbagh = DHAKA_LANDMARKS.shahbagh.coordinates;

    // 0.5 km: Only BSMMU (~0.056 km)
    const res05 = filterBranchesByRadius(branches, { center: shahbagh, maxRadiusKm: 0.5 });
    assert.equal(res05.length, 1);
    assert.equal(res05[0]?.branch.id, 'b-bsmmu');

    // 2.5 km: BSMMU, DMCH, Popular Dhanmondi, Square Hospital
    const res25 = filterBranchesByRadius(branches, { center: shahbagh, maxRadiusKm: 2.5 });
    assert.equal(res25.length, 4);

    // 4.0 km: Same 4 branches
    const res40 = filterBranchesByRadius(branches, { center: shahbagh, maxRadiusKm: 4.0 });
    assert.equal(res40.length, 4);

    // 10.0 km: BSMMU, DMCH, Popular Dhanmondi, Square Hospital, Gulshan-2 (~6.57km), Evercare (~8.78km)
    const res10 = filterBranchesByRadius(branches, { center: shahbagh, maxRadiusKm: 10.0 });
    assert.equal(res10.length, 6);
    assert.equal(res10[4]?.branch.id, 'b-gulshan2');
    assert.equal(res10[5]?.branch.id, 'b-evercare');

    // 20.0 km: Includes Uttara (~14.41km), Chittagong excluded
    const res20 = filterBranchesByRadius(branches, { center: shahbagh, maxRadiusKm: 20.0 });
    assert.equal(res20.length, 7);
    assert.equal(res20[6]?.branch.id, 'b-uttara');
    assert.ok(!res20.some((r) => r.branch.id === 'b-chittagong'));
  });

  it('performs strict mathematical boundary tests for inclusion/exclusion at R - eps, R, and R + eps', () => {
    const center: Coordinates = { latitude: 23.7500, longitude: 90.3800 };

    // Function to calculate a coordinate exactly d km north along the meridian
    // Formula: DeltaLat = (d / EARTH_RADIUS_KM) * (180 / Math.PI)
    function getCoordinateAtDistanceKm(c: Coordinates, distanceKm: number): Coordinates {
      const deltaLat = (distanceKm / EARTH_RADIUS_KM) * (180 / Math.PI);
      return {
        latitude: c.latitude + deltaLat,
        longitude: c.longitude,
      };
    }

    const testRadii = [1.0, 3.0, 5.0, 10.0];
    const deltaKm = 0.001; // 1 meter offset

    for (const targetR of testRadii) {
      const coordExact = getCoordinateAtDistanceKm(center, targetR);
      const exactDistance = calculateHaversineDistanceKm(center, coordExact);

      const coordInside = getCoordinateAtDistanceKm(center, targetR - deltaKm);
      const coordOutside = getCoordinateAtDistanceKm(center, targetR + deltaKm);

      const distInside = calculateHaversineDistanceKm(center, coordInside);
      const distOutside = calculateHaversineDistanceKm(center, coordOutside);

      assert.ok(distInside < exactDistance, `Expected distInside < ${exactDistance}, got ${distInside}`);
      assert.ok(distOutside > exactDistance, `Expected distOutside > ${exactDistance}, got ${distOutside}`);

      const boundaryBranches: LocatableBranch[] = [
        { id: `b-inside-${targetR}`, name: 'Inside', coordinates: coordInside },
        { id: `b-exact-${targetR}`, name: 'Exact', coordinates: coordExact },
        { id: `b-outside-${targetR}`, name: 'Outside', coordinates: coordOutside },
      ];

      const results = filterBranchesByRadius(boundaryBranches, {
        center,
        maxRadiusKm: exactDistance,
      });

      // Both inside (R - eps) and exact (R) must be included; outside (R + eps) must be excluded
      assert.equal(results.length, 2, `Radius ${targetR} km should include exactly 2 branches`);
      const includedIds = results.map((r) => r.branch.id);
      assert.ok(includedIds.includes(`b-inside-${targetR}`));
      assert.ok(includedIds.includes(`b-exact-${targetR}`));
      assert.ok(!includedIds.includes(`b-outside-${targetR}`));
    }
  });

  it('handles empty branch list gracefully', () => {
    const center = DHAKA_LANDMARKS.shahbagh.coordinates;
    const results = filterBranchesByRadius([], {
      center,
      maxRadiusKm: 5,
    });

    assert.deepEqual(results, []);
  });

  it('respects the limit option accurately', () => {
    const shahbagh = DHAKA_LANDMARKS.shahbagh.coordinates;

    // Limit = 1: Top 1 nearest branch
    const limit1 = filterBranchesByRadius(branches, {
      center: shahbagh,
      maxRadiusKm: 10,
      limit: 1,
    });
    assert.equal(limit1.length, 1);
    assert.equal(limit1[0]?.branch.id, 'b-bsmmu');

    // Limit = 2: Top 2 nearest branches
    const limit2 = filterBranchesByRadius(branches, {
      center: shahbagh,
      maxRadiusKm: 10,
      limit: 2,
    });
    assert.equal(limit2.length, 2);
    assert.equal(limit2[0]?.branch.id, 'b-bsmmu');
    assert.equal(limit2[1]?.branch.id, 'b-dmch');

    // Limit = 0 or negative: Should return all matching branches
    const limit0 = filterBranchesByRadius(branches, {
      center: shahbagh,
      maxRadiusKm: 5,
      limit: 0,
    });
    assert.equal(limit0.length, 4);

    const limitNeg = filterBranchesByRadius(branches, {
      center: shahbagh,
      maxRadiusKm: 5,
      limit: -5,
    });
    assert.equal(limitNeg.length, 4);

    // Limit larger than matching branches count
    const limitLarge = filterBranchesByRadius(branches, {
      center: shahbagh,
      maxRadiusKm: 5,
      limit: 50,
    });
    assert.equal(limitLarge.length, 4);
  });

  it('guarantees results are sorted in ascending order of straight-line distance', () => {
    const shahbagh = DHAKA_LANDMARKS.shahbagh.coordinates;

    const results = filterBranchesByRadius(branches, {
      center: shahbagh,
      maxRadiusKm: 25,
    });

    assert.ok(results.length >= 5);
    for (let i = 0; i < results.length - 1; i++) {
      const current = results[i]?.distanceKm ?? 0;
      const next = results[i + 1]?.distanceKm ?? 0;
      assert.ok(
        current <= next,
        `Branches must be sorted ascending: index ${i} (${current} km) > index ${i + 1} (${next} km)`,
      );
    }
  });

  it('applies boundingBox pre-filter to drop distant points regardless of maxRadiusKm', () => {
    const farmgate = DHAKA_LANDMARKS.farmgate.coordinates;

    const results = filterBranchesByRadius(branches, {
      center: farmgate,
      maxRadiusKm: 500, // Very large radius that would encompass Chittagong
      boundingBox: DHAKA_BOUNDING_BOXES.core,
    });

    const branchIds = results.map((r) => r.branch.id);
    assert.ok(branchIds.includes('b-square'));
    assert.ok(branchIds.includes('b-bsmmu'));
    assert.ok(branchIds.includes('b-popular-dhanmondi'));
    assert.ok(branchIds.includes('b-dmch'));
    assert.ok(branchIds.includes('b-gulshan2'));
    assert.ok(branchIds.includes('b-uttara'));

    // Chittagong is outside core Dhaka bounding box and must be dropped
    assert.ok(!branchIds.includes('b-chittagong'));
  });
});
