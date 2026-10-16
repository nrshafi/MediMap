import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DHAKA_LANDMARKS,
  EARTH_RADIUS_KM,
  calculateHaversineDistanceKm,
  roundDistanceKm,
  type Coordinates,
} from '../index';

describe('Haversine Distance Accuracy Benchmarks (Dhaka Landmarks)', () => {
  it('benchmarks very close healthcare landmarks: Shahbagh to BSMMU', () => {
    // BSMMU is directly adjacent to Shahbagh intersection
    const dist = calculateHaversineDistanceKm(
      DHAKA_LANDMARKS.shahbagh.coordinates,
      DHAKA_LANDMARKS.bsmmu.coordinates,
    );

    // Centroid straight-line distance is ~0.056 km (56m)
    // Within campus perimeter is ~0.13 km (130m)
    assert.ok(dist >= 0.05, `Distance should be >= 0.05 km, got ${dist}`);
    assert.ok(dist <= 0.15, `Distance should be <= 0.15 km, got ${dist}`);
    assert.equal(roundDistanceKm(dist, 2), 0.06);

    // Exact benchmark point for BSMMU OPD / Cabin Block (23.7394, 90.3962)
    const bsmmuOpdPoint: Coordinates = { latitude: 23.7394, longitude: 90.3962 };
    const distToOpd = calculateHaversineDistanceKm(DHAKA_LANDMARKS.shahbagh.coordinates, bsmmuOpdPoint);
    assert.ok(Math.abs(distToOpd - 0.13) < 0.02, `OPD distance should be ~0.13 km, got ${distToOpd}`);
  });

  it('benchmarks Farmgate to Square Hospital (~0.65 - 0.74 km)', () => {
    const dist = calculateHaversineDistanceKm(
      DHAKA_LANDMARKS.farmgate.coordinates,
      DHAKA_LANDMARKS.squareHospital.coordinates,
    );

    // Centroid straight line is ~0.65 km (650m), travel distance ~0.74 km
    assert.ok(dist >= 0.60 && dist <= 0.75, `Expected 0.60 - 0.75 km, got ${dist}`);
    assert.equal(roundDistanceKm(dist, 2), 0.65);

    // Benchmark point for Panthapath / Square Emergency gate (23.7538, 90.3805)
    const squareEmergencyGate: Coordinates = { latitude: 23.7538, longitude: 90.3805 };
    const distToEmergency = calculateHaversineDistanceKm(DHAKA_LANDMARKS.farmgate.coordinates, squareEmergencyGate);
    assert.ok(Math.abs(distToEmergency - 0.73) < 0.03, `Emergency gate should be ~0.74 km, got ${distToEmergency}`);
  });

  it('benchmarks Shahbagh to DMCH (~1.38 - 1.39 km)', () => {
    const dist = calculateHaversineDistanceKm(
      DHAKA_LANDMARKS.shahbagh.coordinates,
      DHAKA_LANDMARKS.dmch.coordinates,
    );

    // Straight-line distance is ~1.39 km (1392m)
    assert.ok(dist >= 1.35 && dist <= 1.45, `Expected 1.35 - 1.45 km, got ${dist}`);
    assert.equal(roundDistanceKm(dist, 2), 1.39);
    assert.ok(Math.abs(dist - 1.38) <= 0.02, `Should match ~1.38 km reference within 0.02km, got ${dist}`);
  });

  it('benchmarks Shahbagh to Farmgate (~2.16 - 2.58 km)', () => {
    const dist = calculateHaversineDistanceKm(
      DHAKA_LANDMARKS.shahbagh.coordinates,
      DHAKA_LANDMARKS.farmgate.coordinates,
    );

    // Centroid straight-line is ~2.16 km; travel corridor is ~2.58 km
    assert.ok(dist >= 2.10 && dist <= 2.30, `Expected 2.10 - 2.30 km straight-line, got ${dist}`);
    assert.equal(roundDistanceKm(dist, 2), 2.16);

    // Benchmark transit point north of Farmgate flyover (23.7595, 90.3850)
    const farmgateNorthPt: Coordinates = { latitude: 23.7595, longitude: 90.3850 };
    const distNorth = calculateHaversineDistanceKm(DHAKA_LANDMARKS.shahbagh.coordinates, farmgateNorthPt);
    assert.ok(Math.abs(distNorth - 2.58) < 0.25, `Corridor benchmark should approximate ~2.58 km, got ${distNorth}`);
  });

  it('benchmarks Shahbagh to Gulshan-2 (~6.57 - 6.58 km)', () => {
    const dist = calculateHaversineDistanceKm(
      DHAKA_LANDMARKS.shahbagh.coordinates,
      DHAKA_LANDMARKS.gulshan2.coordinates,
    );

    // Straight line distance is ~6.57 km
    assert.ok(dist >= 6.50 && dist <= 6.65, `Expected 6.50 - 6.65 km, got ${dist}`);
    assert.equal(roundDistanceKm(dist, 2), 6.57);
    assert.ok(Math.abs(dist - 6.58) <= 0.02, `Should match 6.58 km reference within 0.02 km, got ${dist}`);
  });

  it('benchmarks Shahbagh to Evercare Hospital Bashundhara (~8.71 - 8.78 km)', () => {
    const dist = calculateHaversineDistanceKm(
      DHAKA_LANDMARKS.shahbagh.coordinates,
      DHAKA_LANDMARKS.evercare.coordinates,
    );

    // Straight line distance is ~8.78 km
    assert.ok(dist >= 8.65 && dist <= 8.85, `Expected 8.65 - 8.85 km, got ${dist}`);
    assert.equal(roundDistanceKm(dist, 2), 8.78);
    assert.ok(Math.abs(dist - 8.71) <= 0.1, `Should match 8.71 km reference within 0.1 km, got ${dist}`);
  });

  it('benchmarks Shahbagh to Uttara House Building (~14.41 - 15.19 km)', () => {
    const dist = calculateHaversineDistanceKm(
      DHAKA_LANDMARKS.shahbagh.coordinates,
      DHAKA_LANDMARKS.uttaraHouseBuilding.coordinates,
    );

    // Centroid straight-line is ~14.41 km; road benchmark is ~15.19 km
    assert.ok(dist >= 14.30 && dist <= 14.55, `Expected 14.30 - 14.55 km, got ${dist}`);
    assert.equal(roundDistanceKm(dist, 2), 14.41);

    // Uttara Sector 11/13 benchmark point (23.8745, 90.3950)
    const uttaraSector13: Coordinates = { latitude: 23.8745, longitude: 90.3950 };
    const distUttaraSec13 = calculateHaversineDistanceKm(DHAKA_LANDMARKS.shahbagh.coordinates, uttaraSector13);
    assert.ok(Math.abs(distUttaraSec13 - 15.14) < 0.1, `Uttara north point should approximate ~15.19 km, got ${distUttaraSec13}`);
  });

  it('benchmarks secondary Dhaka healthcare pairs accurately', () => {
    // Dhanmondi Popular to Square Hospital: ~1.14 km
    const distPopularSquare = calculateHaversineDistanceKm(
      DHAKA_LANDMARKS.popularDhanmondi.coordinates,
      DHAKA_LANDMARKS.squareHospital.coordinates,
    );
    assert.ok(distPopularSquare >= 1.10 && distPopularSquare <= 1.20);
    assert.equal(roundDistanceKm(distPopularSquare, 2), 1.14);

    // Ibn Sina Dhanmondi to United Hospital (Gulshan-2): ~7.84 km
    const distIbnSinaUnited = calculateHaversineDistanceKm(
      DHAKA_LANDMARKS.ibnSinaDhanmondi.coordinates,
      DHAKA_LANDMARKS.unitedHospital.coordinates,
    );
    assert.ok(distIbnSinaUnited >= 7.80 && distIbnSinaUnited <= 7.90);
    assert.equal(roundDistanceKm(distIbnSinaUnited, 2), 7.86);

    // Mirpur-10 Circle to Shahbagh: ~8.11 km
    const distMirpurShahbagh = calculateHaversineDistanceKm(
      DHAKA_LANDMARKS.mirpur10.coordinates,
      DHAKA_LANDMARKS.shahbagh.coordinates,
    );
    assert.ok(distMirpurShahbagh >= 8.00 && distMirpurShahbagh <= 8.20);
    assert.equal(roundDistanceKm(distMirpurShahbagh, 2), 8.11);
  });
});

describe('Haversine Formula Mathematical Invariants & Metric Space Axioms', () => {
  const landmarks = Object.values(DHAKA_LANDMARKS);

  it('satisfies identity axiom: distance(A, A) === 0 for all landmarks', () => {
    for (const landmark of landmarks) {
      const coord = landmark.coordinates;
      const d1 = calculateHaversineDistanceKm(coord, coord);
      assert.equal(d1, 0, `distance(A, A) must be 0 for ${landmark.id}`);

      // Separate object reference with same coordinates
      const clonedCoord: Coordinates = { latitude: coord.latitude, longitude: coord.longitude };
      const d2 = calculateHaversineDistanceKm(coord, clonedCoord);
      assert.equal(d2, 0, `distance(A, clone(A)) must be 0 for ${landmark.id}`);
    }
  });

  it('satisfies symmetry axiom: distance(A, B) === distance(B, A) across all landmark pairs', () => {
    let comparisonCount = 0;
    for (let i = 0; i < landmarks.length; i++) {
      for (let j = 0; j < landmarks.length; j++) {
        const a = landmarks[i]?.coordinates;
        const b = landmarks[j]?.coordinates;
        if (!a || !b) continue;

        const distAB = calculateHaversineDistanceKm(a, b);
        const distBA = calculateHaversineDistanceKm(b, a);

        // Floating-point symmetry must hold to within double-precision machine epsilon
        assert.ok(
          Math.abs(distAB - distBA) < 1e-12,
          `Symmetry violated between ${landmarks[i]?.id} and ${landmarks[j]?.id}: ${distAB} !== ${distBA}`,
        );
        comparisonCount++;
      }
    }
    // 14 landmarks * 14 landmarks = 196 comparisons
    assert.equal(comparisonCount, 196);
  });

  it('satisfies non-negativity axiom: distance(A, B) >= 0 for all pairs', () => {
    for (const a of landmarks) {
      for (const b of landmarks) {
        const d = calculateHaversineDistanceKm(a.coordinates, b.coordinates);
        assert.ok(d >= 0, `Distance must be non-negative, got ${d}`);
      }
    }
  });

  it('satisfies triangle inequality axiom: distance(A, C) <= distance(A, B) + distance(B, C)', () => {
    let tripletCount = 0;
    const tolerance = 1e-9; // Floating-point rounding tolerance

    for (const a of landmarks) {
      for (const b of landmarks) {
        for (const c of landmarks) {
          const dAC = calculateHaversineDistanceKm(a.coordinates, c.coordinates);
          const dAB = calculateHaversineDistanceKm(a.coordinates, b.coordinates);
          const dBC = calculateHaversineDistanceKm(b.coordinates, c.coordinates);

          assert.ok(
            dAC <= dAB + dBC + tolerance,
            `Triangle inequality violated: d(${a.id}, ${c.id}) = ${dAC} > d(${a.id}, ${b.id}) = ${dAB} + d(${b.id}, ${c.id}) = ${dBC}`,
          );
          tripletCount++;
        }
      }
    }
    // 14 * 14 * 14 = 2,744 triplets verified
    assert.equal(tripletCount, 2744);
  });
});

describe('Numerical Stability, Clamping, and Extreme Coordinates', () => {
  it('handles micro-differences and floating-point jitter without NaN or domain error', () => {
    const base: Coordinates = { latitude: 23.7383, longitude: 90.3957 };
    const jittered: Coordinates = {
      latitude: base.latitude + 1e-15,
      longitude: base.longitude - 1e-15,
    };

    const dist = calculateHaversineDistanceKm(base, jittered);
    assert.ok(Number.isFinite(dist));
    assert.ok(!Number.isNaN(dist));
    assert.ok(dist >= 0);
    assert.ok(dist < 1e-8);
  });

  it('calculates antipodal points accurately and verifies numerical clamping stability', () => {
    const halfCircumference = Math.PI * EARTH_RADIUS_KM; // ~20015.086796... km

    // North Pole to South Pole
    const northPole: Coordinates = { latitude: 90, longitude: 0 };
    const southPole: Coordinates = { latitude: -90, longitude: 0 };
    const distPoles = calculateHaversineDistanceKm(northPole, southPole);
    assert.equal(roundDistanceKm(distPoles, 2), roundDistanceKm(halfCircumference, 2));

    // Equator antipodes (0, 0) and (0, 180)
    const eq0: Coordinates = { latitude: 0, longitude: 0 };
    const eq180: Coordinates = { latitude: 0, longitude: 180 };
    const distEqAntipodal = calculateHaversineDistanceKm(eq0, eq180);
    assert.equal(roundDistanceKm(distEqAntipodal, 2), roundDistanceKm(halfCircumference, 2));

    // Equator antipodes (0, 90) and (0, -90)
    const eqEast: Coordinates = { latitude: 0, longitude: 90 };
    const eqWest: Coordinates = { latitude: 0, longitude: -90 };
    const distEqEastWest = calculateHaversineDistanceKm(eqEast, eqWest);
    assert.equal(roundDistanceKm(distEqEastWest, 2), roundDistanceKm(halfCircumference, 2));

    // Arbitrary antipodal coordinates: (23.7, 90.3) and (-23.7, -89.7)
    const dhakaApprox: Coordinates = { latitude: 23.7, longitude: 90.3 };
    const dhakaAntipodal: Coordinates = { latitude: -23.7, longitude: -89.7 };
    const distArbitraryAntipodal = calculateHaversineDistanceKm(dhakaApprox, dhakaAntipodal);
    assert.equal(roundDistanceKm(distArbitraryAntipodal, 2), roundDistanceKm(halfCircumference, 2));
  });

  it('measures 1 degree along equator and meridian accurately (~111.19 km)', () => {
    const oneDegreeKm = (2 * Math.PI * EARTH_RADIUS_KM) / 360; // ~111.1949 km

    // 1 degree along meridian (latitude change)
    const p1: Coordinates = { latitude: 0, longitude: 0 };
    const p2: Coordinates = { latitude: 1, longitude: 0 };
    const distMeridian = calculateHaversineDistanceKm(p1, p2);
    assert.equal(roundDistanceKm(distMeridian, 2), roundDistanceKm(oneDegreeKm, 2));

    // 1 degree along equator (longitude change)
    const p3: Coordinates = { latitude: 0, longitude: 1 };
    const distEquator = calculateHaversineDistanceKm(p1, p3);
    assert.equal(roundDistanceKm(distEquator, 2), roundDistanceKm(oneDegreeKm, 2));
  });

  it('rejects invalid coordinate pairs before testing equality', () => {
    const valid = { latitude: 23.7, longitude: 90.4 };
    for (const invalid of [
      { latitude: 91, longitude: 90.4 },
      { latitude: 23.7, longitude: -181 },
      { latitude: Infinity, longitude: 90.4 },
      { latitude: Number.NaN, longitude: 90.4 },
    ]) {
      assert.throws(() => calculateHaversineDistanceKm(invalid, invalid), RangeError);
      assert.throws(() => calculateHaversineDistanceKm(valid, invalid), RangeError);
      assert.throws(() => calculateHaversineDistanceKm(invalid, valid), RangeError);
    }
  });

  it('handles distance rounding edge cases and decimal precision with roundDistanceKm', () => {
    // Standard rounding
    assert.equal(roundDistanceKm(2.18945, 2), 2.19);
    assert.equal(roundDistanceKm(2.18145, 2), 2.18);
    assert.equal(roundDistanceKm(2.18945, 1), 2.2);
    assert.equal(roundDistanceKm(2.18945, 0), 2);
    assert.equal(roundDistanceKm(2.18945, 4), 2.1895);

    // Negative distances or zeroes
    assert.equal(roundDistanceKm(0, 2), 0);
    assert.equal(roundDistanceKm(-0, 2), 0);

    assert.throws(() => roundDistanceKm(Number.NaN, 2), RangeError);
    assert.throws(() => roundDistanceKm(Number.POSITIVE_INFINITY, 2), RangeError);
    assert.throws(() => roundDistanceKm(Number.NEGATIVE_INFINITY, 2), RangeError);
  });
});
