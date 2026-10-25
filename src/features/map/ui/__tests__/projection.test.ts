import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeAutoBounds,
  createMapProjector,
  DHAKA_DEFAULT_BOUNDS,
  DHAKA_METRO_BOUNDS,
} from '../projection';

describe('Map Projection and Bounding Box Calculations', () => {
  it('returns default Dhaka core bounds when no branches or center are provided', () => {
    const bounds = computeAutoBounds([]);
    assert.deepEqual(bounds, DHAKA_DEFAULT_BOUNDS);
  });

  it('expands degenerate single coordinate with minimum span', () => {
    const single = [{ coordinates: { latitude: 23.75, longitude: 90.38 } }];
    const bounds = computeAutoBounds(single, null, 0);

    assert.ok(bounds.maxLat > bounds.minLat);
    assert.ok(bounds.maxLon > bounds.minLon);
    assert.ok(bounds.maxLat - bounds.minLat >= 0.0399);
    assert.ok(bounds.maxLon - bounds.minLon >= 0.0399);
  });

  it('computes bounding box encompassing both center and multiple branch locations', () => {
    const center = { latitude: 23.7388, longitude: 90.3957 }; // Shahbagh
    const branches = [
      { coordinates: { latitude: 23.8103, longitude: 90.4312 } }, // Evercare (northeast)
      { coordinates: { latitude: 23.71, longitude: 90.36 } }, // Old Dhaka (southwest)
    ];

    const bounds = computeAutoBounds(branches, center, 0.1);

    // Center must be within bounds
    assert.ok(center.latitude >= bounds.minLat && center.latitude <= bounds.maxLat);
    assert.ok(center.longitude >= bounds.minLon && center.longitude <= bounds.maxLon);

    // All branches must be within bounds
    for (const b of branches) {
      assert.ok(b.coordinates.latitude >= bounds.minLat && b.coordinates.latitude <= bounds.maxLat);
      assert.ok(
        b.coordinates.longitude >= bounds.minLon && b.coordinates.longitude <= bounds.maxLon,
      );
    }
  });

  it('projects geographic coordinates to SVG viewport with isometric scaling', () => {
    const projector = createMapProjector(DHAKA_DEFAULT_BOUNDS, {
      width: 800,
      height: 600,
      padding: 40,
    });

    const pt1 = projector.project({ latitude: 23.75, longitude: 90.38 });
    assert.ok(Number.isFinite(pt1.x));
    assert.ok(Number.isFinite(pt1.y));
    assert.ok(pt1.x >= 0 && pt1.x <= 800);
    assert.ok(pt1.y >= 0 && pt1.y <= 600);

    // Latitude higher => y smaller (higher on SVG canvas)
    const ptNorth = projector.project({ latitude: 23.85, longitude: 90.38 });
    const ptSouth = projector.project({ latitude: 23.7, longitude: 90.38 });
    assert.ok(
      ptNorth.y < ptSouth.y,
      'Northern point must have lower SVG Y coordinate than southern point',
    );

    // Longitude higher => x larger (further right on SVG canvas)
    const ptEast = projector.project({ latitude: 23.75, longitude: 90.44 });
    const ptWest = projector.project({ latitude: 23.75, longitude: 90.34 });
    assert.ok(
      ptEast.x > ptWest.x,
      'Eastern point must have higher SVG X coordinate than western point',
    );
  });

  it('performs accurate unprojection roundtrip', () => {
    const projector = createMapProjector(DHAKA_METRO_BOUNDS, {
      width: 1000,
      height: 800,
      padding: 50,
    });

    const original = { latitude: 23.7654, longitude: 90.3891 };
    const pt = projector.project(original);
    const roundtrip = projector.unproject(pt);

    assert.ok(Math.abs(roundtrip.latitude - original.latitude) < 0.001);
    assert.ok(Math.abs(roundtrip.longitude - original.longitude) < 0.001);
  });
});
