import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isValidCoordinate } from '../../map/coordinates';
import { DEFAULT_DIAGNOSTIC_CATALOG } from '../diagnosticCatalog';
import { DHAKA_LANDMARKS } from '../../map/landmarks';
import {
  DEFAULT_DISCOVERY_CENTER,
  DEFAULT_DISCOVERY_SERVICE_ID,
  DHAKA_LOCATION_PRESETS,
  MOCK_BRANCH_LISTINGS,
  filterBranchesByQueryAndLocation,
} from '../discoveryData';

describe('Discovery Data & Query Filter Engine', () => {
  it('does not choose a service for ambiguous, unknown, blank, or typo queries', () => {
    for (const queryText of ['CT', 'USG', 'not a diagnostic service', '', 'lipidd']) {
      const result = filterBranchesByQueryAndLocation({ queryText });
      assert.equal(result.canonicalService, null, queryText);
      assert.deepEqual(result.branches, [], queryText);
    }
    assert.equal(filterBranchesByQueryAndLocation({ serviceId: 'missing' }).canonicalService, null);
    assert.equal(filterBranchesByQueryAndLocation({ catalog: [] }).canonicalService, null);
  });

  it('preserves unknown prices, source evidence, and verification dates', () => {
    const branch = MOCK_BRANCH_LISTINGS[0];
    const result = filterBranchesByQueryAndLocation({
      center: branch.coordinates,
      branches: [
        {
          ...branch,
          isSample: false,
          servicePrices: [
            {
              serviceId: DEFAULT_DISCOVERY_SERVICE_ID,
              basePriceBdt: null,
              priceSource: 'Provider price list',
              verificationStatus: 'unverified',
              verifiedAt: null,
            },
          ],
        },
      ],
    });
    assert.equal(result.branches.length, 1);
    assert.equal(result.branches[0].basePriceBdt, null);
    assert.equal(result.branches[0].priceVerifiedAt, null);
    assert.equal(result.branches[0].priceSource, 'Provider price list');
    assert.equal(result.branches[0].isVerified, false);
    assert.equal(result.branches[0].route?.status, 'unavailable');
  });

  it('uses the shared radius bounds for direct discovery requests', () => {
    for (const radiusKm of [NaN, Infinity, -1, 0, 0.01, 101]) {
      assert.equal(filterBranchesByQueryAndLocation({ radiusKm }).radiusKm, 3);
    }
    assert.equal(filterBranchesByQueryAndLocation({ radiusKm: 0.1 }).radiusKm, 0.1);
    assert.equal(filterBranchesByQueryAndLocation({ radiusKm: 100 }).radiusKm, 100);
  });
  it('keeps sample fixtures unverified and references valid, unique services and branch identifiers', () => {
    const serviceIds = new Set(DEFAULT_DIAGNOSTIC_CATALOG.map((service) => service.id));
    assert.ok(MOCK_BRANCH_LISTINGS.length > 0);
    assert.equal(
      new Set(MOCK_BRANCH_LISTINGS.map((branch) => branch.id)).size,
      MOCK_BRANCH_LISTINGS.length,
    );
    for (const branch of MOCK_BRANCH_LISTINGS) {
      assert.ok(isValidCoordinate(branch.coordinates));
      assert.equal(branch.isSample, true);
      assert.equal(
        new Set(branch.servicePrices.map((price) => price.serviceId)).size,
        branch.servicePrices.length,
      );
      for (const price of branch.servicePrices) {
        assert.ok(serviceIds.has(price.serviceId), price.serviceId);
        assert.ok(
          price.basePriceBdt === null ||
            (Number.isFinite(price.basePriceBdt) && price.basePriceBdt > 0),
        );
        assert.equal(price.verificationStatus, 'unverified');
        assert.equal(price.verifiedAt, null);
        assert.equal(price.priceSource, null);
      }
    }
  });

  it('provides valid location presets with unique identifiers', () => {
    assert.ok(DHAKA_LOCATION_PRESETS.length > 0);
    assert.equal(
      new Set(DHAKA_LOCATION_PRESETS.map((preset) => preset.id)).size,
      DHAKA_LOCATION_PRESETS.length,
    );
    for (const preset of DHAKA_LOCATION_PRESETS) assert.ok(isValidCoordinate(preset.coordinates));
  });

  describe('filterBranchesByQueryAndLocation helper function', () => {
    it('defaults to Complete Blood Count (CBC) and Shahbagh center with 3 km radius', () => {
      const result = filterBranchesByQueryAndLocation();

      assert.equal(result.canonicalService?.id, DEFAULT_DISCOVERY_SERVICE_ID);
      assert.equal(result.center.latitude, DEFAULT_DISCOVERY_CENTER.latitude);
      assert.equal(result.center.longitude, DEFAULT_DISCOVERY_CENTER.longitude);
      assert.equal(result.radiusKm, 3);
      assert.ok(result.branches.length > 0);

      // Invariants verification on all returned branch items
      for (const branch of result.branches) {
        assert.ok(branch.basePriceBdt !== null && branch.basePriceBdt > 0);
        assert.equal(branch.isVerified, false);
        assert.equal(branch.priceVerifiedAt, null);
        assert.equal(branch.priceSource, null);
        assert.ok(branch.straightLineDistanceKm <= 3.0);
        assert.ok(branch.route !== undefined);
        assert.equal(branch.route?.status, 'unavailable');
        assert.equal(branch.roadDistanceKm, undefined);
        assert.equal(branch.travelDurationMinutes, undefined);
      }
    });

    it('resolves canonical service from query text using resolutionEngine', () => {
      const lipidResult = filterBranchesByQueryAndLocation({
        queryText: 'Lipid Profile',
        radiusKm: 5,
      });
      assert.equal(lipidResult.canonicalService?.id, 'lipid-profile');

      const xrayResult = filterBranchesByQueryAndLocation({
        queryText: 'Chest X-Ray',
        radiusKm: 5,
      });
      assert.equal(xrayResult.canonicalService?.id, 'xray-chest');

      const bnResult = filterBranchesByQueryAndLocation({
        queryText: 'সিবিসি',
        radiusKm: 5,
      });
      assert.equal(bnResult.canonicalService?.id, 'complete-blood-count');
    });

    it('resolves directly by serviceId when provided', () => {
      const result = filterBranchesByQueryAndLocation({
        serviceId: 'mri-brain',
        radiusKm: 5,
      });
      assert.equal(result.canonicalService?.id, 'mri-brain');
      assert.equal(result.canonicalService?.name, 'MRI of Brain');
    });

    it('applies spatial straight-line radius filtering correctly from Gulshan-2', () => {
      // From Gulshan-2 (North Dhaka), Evercare and United are nearby, whereas DMCH / BSMMU are > 6 km away
      const gulshanCenter = DHAKA_LANDMARKS.gulshan2.coordinates;
      const result = filterBranchesByQueryAndLocation({
        serviceId: 'complete-blood-count',
        center: gulshanCenter,
        radiusKm: 2.5,
      });

      const branchIds = result.branches.map((b) => b.id);
      assert.ok(branchIds.includes('united-gulshan'));
      assert.ok(!branchIds.includes('dmch-bakshibazar'));
      assert.ok(!branchIds.includes('bsmmu-shahbagh'));

      for (const branch of result.branches) {
        assert.ok(branch.straightLineDistanceKm <= 2.5);
      }
    });

    it('returns empty array when radius is too tight for any hospital branch', () => {
      const emptyResult = filterBranchesByQueryAndLocation({
        center: { latitude: 23.7, longitude: 90.35 }, // Southern edge with no hospitals
        radiusKm: 0.2,
      });

      assert.equal(emptyResult.branches.length, 0);
      assert.equal(emptyResult.canonicalService?.id, 'complete-blood-count');
    });

    it('sorts branches in ascending order of straight-line distance', () => {
      const result = filterBranchesByQueryAndLocation({
        center: DHAKA_LANDMARKS.shahbagh.coordinates,
        radiusKm: 10,
      });

      for (let i = 1; i < result.branches.length; i++) {
        assert.ok(
          result.branches[i].straightLineDistanceKm >=
            result.branches[i - 1].straightLineDistanceKm,
          `Branches should be sorted ascending by straight-line distance: ${result.branches[i - 1].straightLineDistanceKm} <= ${result.branches[i].straightLineDistanceKm}`,
        );
      }
    });
  });
});
