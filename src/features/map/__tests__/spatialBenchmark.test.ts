import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DHAKA_LANDMARKS,
  EARTH_RADIUS_KM,
  calculateHaversineDistanceKm,
  roundDistanceKm,
  type Coordinates,
} from '../index';

describe('Haversine reference distances', () => {
  it('matches the spherical law of cosines for an oblique route at 60 degrees latitude', () => {
    const distance = calculateHaversineDistanceKm(
      { latitude: 60, longitude: 0 },
      { latitude: 60, longitude: 90 },
    );
    // The central angle has cosine 3/4 for these coordinates.
    const expectedKm = 6371 * Math.acos(0.75);
    assert.ok(Math.abs(distance - expectedKm) < 1e-8);
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
      }
    }
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
        }
      }
    }
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
