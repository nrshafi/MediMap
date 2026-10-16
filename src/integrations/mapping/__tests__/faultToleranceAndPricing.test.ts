/**
 * Comprehensive test suite for fault-tolerant mapping, routing metrics separation,
 * and core branch price accessibility under failure conditions.
 *
 * Verifies MediMap architecture invariants:
 * 1. Core branch and price data accessibility when routing fails.
 * 2. Separation of straight-line distance, road distance, and travel duration.
 * 3. Fallback routing handler and batch concurrency behavior.
 * 4. Zero-distance routes, invalid coordinates, and timeouts.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateHaversineDistanceKm } from '../../../features/map/haversine';
import { DHAKA_LANDMARKS } from '../../../features/map/landmarks';
import type { Coordinates } from '../../../features/map/types';
import {
  enrichBranchesWithRoutes,
  getBranchRoutes,
  mapConcurrent,
} from '../branchRouting';
import {
  executeWithFallback,
  FallbackRoutingAdapter,
} from '../fallback';
import { OsrmAdapter } from '../osrmAdapter';
import type {
  RoutableBranch,
  RouteResult,
  RoutingAdapter,
} from '../types';

/**
 * Sample branch fixture with pricing and verification metadata.
 */
interface ClinicalBranchFixture extends RoutableBranch {
  readonly branchId: string;
  readonly providerId: string;
  readonly providerName: string;
  readonly branchName: string;
  readonly serviceId: string;
  readonly serviceName: string;
  readonly basePriceBdt: number;
  readonly currency: 'BDT';
  readonly verified: boolean;
  readonly verifiedAt: string;
  readonly verificationSource: string;
  readonly straightLineDistanceKm: number;
  readonly contactPhone: string;
  readonly openingHours: string;
  readonly coordinates: Coordinates;
}

function createSampleBranch(
  overrides?: Partial<ClinicalBranchFixture>
): ClinicalBranchFixture {
  return {
    branchId: 'branch-sq-panthapath',
    providerId: 'provider-square',
    providerName: 'Square Hospitals Ltd',
    branchName: 'Square Hospital Panthapath',
    serviceId: 'complete-blood-count',
    serviceName: 'Complete Blood Count (CBC)',
    basePriceBdt: 1200,
    currency: 'BDT',
    verified: true,
    verifiedAt: '2026-10-10T09:00:00Z',
    verificationSource: 'Official Hospital Tariff Schedule',
    straightLineDistanceKm: 2.85,
    contactPhone: '+88028159457',
    openingHours: '24/7',
    coordinates: DHAKA_LANDMARKS.squareHospital.coordinates,
    ...overrides,
  };
}

describe('Invariant 1: Core Branch and Price Data Accessibility When Routing Fails', () => {
  const origin: Coordinates = DHAKA_LANDMARKS.dmch.coordinates;

  it('preserves all branch and pricing fields when network connection fails', async () => {
    const originalBranch = createSampleBranch();
    const mockFetch: typeof fetch = async (): Promise<Response> => {
      throw new TypeError('Failed to fetch: DNS lookup failed');
    };

    const adapter = new OsrmAdapter({ fetchFn: mockFetch });
    const enriched = await enrichBranchesWithRoutes([originalBranch], origin, adapter);

    assert.equal(enriched.length, 1);
    const branch = enriched[0];

    // Core business and price data must be 100% accessible and unaltered
    assert.equal(branch.branchId, originalBranch.branchId);
    assert.equal(branch.providerId, originalBranch.providerId);
    assert.equal(branch.providerName, 'Square Hospitals Ltd');
    assert.equal(branch.branchName, 'Square Hospital Panthapath');
    assert.equal(branch.serviceId, 'complete-blood-count');
    assert.equal(branch.basePriceBdt, 1200);
    assert.equal(branch.currency, 'BDT');
    assert.equal(branch.verified, true);
    assert.equal(branch.verifiedAt, '2026-10-10T09:00:00Z');
    assert.equal(branch.verificationSource, 'Official Hospital Tariff Schedule');
    assert.equal(branch.straightLineDistanceKm, 2.85);
    assert.equal(branch.contactPhone, '+88028159457');
    assert.equal(branch.openingHours, '24/7');

    // Route status must be explicitly unavailable with undefined road distance and duration
    assert.equal(branch.route.status, 'unavailable');
    if (branch.route.status === 'unavailable') {
      assert.equal(branch.route.reason, 'network_error');
      assert.equal(branch.route.roadDistanceKm, undefined);
      assert.equal(branch.route.travelDurationMinutes, undefined);
      assert.deepEqual(branch.route.origin, origin);
      assert.deepEqual(branch.route.destination, originalBranch.coordinates);
    }
  });

  it('preserves all branch and pricing fields on HTTP 500 server error', async () => {
    const originalBranch = createSampleBranch({
      basePriceBdt: 4500,
      verified: true,
      verifiedAt: '2026-09-15T12:00:00Z',
    });

    const mockFetch: typeof fetch = async (): Promise<Response> => {
      return new Response('Internal Server Error', { status: 500 });
    };

    const adapter = new OsrmAdapter({ fetchFn: mockFetch });
    const enriched = await enrichBranchesWithRoutes([originalBranch], origin, adapter);

    assert.equal(enriched.length, 1);
    const branch = enriched[0];

    assert.equal(branch.basePriceBdt, 4500);
    assert.equal(branch.verified, true);
    assert.equal(branch.verifiedAt, '2026-09-15T12:00:00Z');
    assert.equal(branch.straightLineDistanceKm, 2.85);

    assert.equal(branch.route.status, 'unavailable');
    if (branch.route.status === 'unavailable') {
      assert.equal(branch.route.reason, 'upstream_error');
      assert.equal(branch.route.roadDistanceKm, undefined);
      assert.equal(branch.route.travelDurationMinutes, undefined);
    }
  });

  it('preserves all branch and pricing fields on HTTP 502 Bad Gateway and HTTP 503 Service Unavailable', async () => {
    const originalBranch = createSampleBranch();

    for (const statusCode of [502, 503]) {
      const mockFetch: typeof fetch = async (): Promise<Response> => {
        return new Response('Gateway/Service Error', { status: statusCode });
      };

      const adapter = new OsrmAdapter({ fetchFn: mockFetch });
      const enriched = await enrichBranchesWithRoutes([originalBranch], origin, adapter);

      assert.equal(enriched.length, 1);
      const branch = enriched[0];

      assert.equal(branch.basePriceBdt, 1200);
      assert.equal(branch.straightLineDistanceKm, 2.85);
      assert.equal(branch.route.status, 'unavailable');
      if (branch.route.status === 'unavailable') {
        assert.equal(branch.route.reason, 'upstream_error');
        assert.equal(branch.route.roadDistanceKm, undefined);
        assert.equal(branch.route.travelDurationMinutes, undefined);
      }
    }
  });

  it('preserves all branch and pricing fields on HTTP 429 rate limit', async () => {
    const originalBranch = createSampleBranch({ basePriceBdt: 850 });
    const mockFetch: typeof fetch = async (): Promise<Response> => {
      return new Response('Rate limit reached', { status: 429 });
    };

    const adapter = new OsrmAdapter({ fetchFn: mockFetch });
    const enriched = await enrichBranchesWithRoutes([originalBranch], origin, adapter);

    assert.equal(enriched.length, 1);
    const branch = enriched[0];

    assert.equal(branch.basePriceBdt, 850);
    assert.equal(branch.straightLineDistanceKm, 2.85);
    assert.equal(branch.route.status, 'unavailable');
    if (branch.route.status === 'unavailable') {
      assert.equal(branch.route.reason, 'rate_limit');
      assert.equal(branch.route.roadDistanceKm, undefined);
      assert.equal(branch.route.travelDurationMinutes, undefined);
    }
  });

  it('preserves all branch and pricing fields on request timeout', async () => {
    const originalBranch = createSampleBranch({ basePriceBdt: 3200 });

    const mockFetch: typeof fetch = async (_url, init): Promise<Response> => {
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('Request aborted by timeout');
          err.name = 'AbortError';
          reject(err);
        });
      });
    };

    const adapter = new OsrmAdapter({ fetchFn: mockFetch, defaultTimeoutMs: 30 });
    const enriched = await enrichBranchesWithRoutes([originalBranch], origin, adapter, {
      timeoutMs: 30,
    });

    assert.equal(enriched.length, 1);
    const branch = enriched[0];

    assert.equal(branch.basePriceBdt, 3200);
    assert.equal(branch.straightLineDistanceKm, 2.85);
    assert.equal(branch.route.status, 'unavailable');
    if (branch.route.status === 'unavailable') {
      assert.equal(branch.route.reason, 'timeout');
      assert.equal(branch.route.roadDistanceKm, undefined);
      assert.equal(branch.route.travelDurationMinutes, undefined);
    }
  });

  it('preserves all branch and pricing fields on external AbortSignal cancellation', async () => {
    const originalBranch = createSampleBranch({ basePriceBdt: 2100 });
    const controller = new AbortController();

    const mockFetch: typeof fetch = async (_url, init): Promise<Response> => {
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('Canceled');
          err.name = 'AbortError';
          reject(err);
        });
      });
    };

    const adapter = new OsrmAdapter({ fetchFn: mockFetch });

    setTimeout(() => {
      controller.abort();
    }, 15);

    const enriched = await enrichBranchesWithRoutes([originalBranch], origin, adapter, {
      signal: controller.signal,
    });

    assert.equal(enriched.length, 1);
    const branch = enriched[0];

    assert.equal(branch.basePriceBdt, 2100);
    assert.equal(branch.straightLineDistanceKm, 2.85);
    assert.equal(branch.route.status, 'unavailable');
    if (branch.route.status === 'unavailable') {
      assert.equal(branch.route.reason, 'aborted');
      assert.equal(branch.route.roadDistanceKm, undefined);
      assert.equal(branch.route.travelDurationMinutes, undefined);
    }
  });

  it('preserves all branch and pricing fields when upstream returns non-JSON or HTML', async () => {
    const originalBranch = createSampleBranch();
    const nonJsonPayloads = [
      'Not JSON string',
      '<html><body>502 Bad Gateway</body></html>',
    ];

    for (const payload of nonJsonPayloads) {
      const mockFetch: typeof fetch = async (): Promise<Response> => {
        return new Response(payload, {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      };

      const adapter = new OsrmAdapter({ fetchFn: mockFetch });
      const enriched = await enrichBranchesWithRoutes([originalBranch], origin, adapter);

      assert.equal(enriched.length, 1);
      const branch = enriched[0];

      assert.equal(branch.basePriceBdt, 1200);
      assert.equal(branch.straightLineDistanceKm, 2.85);
      assert.equal(branch.route.status, 'unavailable');
      if (branch.route.status === 'unavailable') {
        assert.equal(branch.route.reason, 'upstream_error');
        assert.equal(branch.route.roadDistanceKm, undefined);
        assert.equal(branch.route.travelDurationMinutes, undefined);
      }
    }
  });

  it('preserves all branch and pricing fields on structurally invalid JSON payloads', async () => {
    const originalBranch = createSampleBranch();

    const malformedJsonPayloads = [
      '{}',
      JSON.stringify({ code: 'Ok', routes: [] }),
      JSON.stringify({ code: 'Ok', routes: [{ distance: -50, duration: 20 }] }),
      JSON.stringify({ code: 'Ok', routes: [{ distance: 100, duration: -10 }] }),
      JSON.stringify({ code: 'Ok', routes: [{ distance: 'one-km', duration: 10 }] }),
      JSON.stringify({ code: 'Ok', routes: [{ distance: 1000, duration: null }] }),
      JSON.stringify({ code: 'Error', message: 'Unknown error' }),
    ];

    for (const payload of malformedJsonPayloads) {
      const mockFetch: typeof fetch = async (): Promise<Response> => {
        return new Response(payload, {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      };

      const adapter = new OsrmAdapter({ fetchFn: mockFetch });
      const enriched = await enrichBranchesWithRoutes([originalBranch], origin, adapter);

      assert.equal(enriched.length, 1);
      const branch = enriched[0];

      assert.equal(branch.basePriceBdt, 1200);
      assert.equal(branch.straightLineDistanceKm, 2.85);
      assert.equal(branch.route.status, 'unavailable');
      if (branch.route.status === 'unavailable') {
        assert.equal(branch.route.reason, 'upstream_error');
        assert.equal(branch.route.roadDistanceKm, undefined);
        assert.equal(branch.route.travelDurationMinutes, undefined);
      }
    }
  });

  it('preserves all branch and pricing fields when FallbackRoutingAdapter is used', async () => {
    const originalBranch = createSampleBranch({
      basePriceBdt: 1950,
      verified: false,
      straightLineDistanceKm: 7.42,
    });

    const fallbackAdapter = new FallbackRoutingAdapter(
      'upstream_error',
      'Routing provider is disabled by operational policy'
    );

    const enriched = await enrichBranchesWithRoutes([originalBranch], origin, fallbackAdapter);

    assert.equal(enriched.length, 1);
    const branch = enriched[0];

    assert.equal(branch.basePriceBdt, 1950);
    assert.equal(branch.verified, false);
    assert.equal(branch.straightLineDistanceKm, 7.42);
    assert.equal(branch.route.status, 'unavailable');
    if (branch.route.status === 'unavailable') {
      assert.equal(branch.route.reason, 'upstream_error');
      assert.equal(branch.route.message, 'Routing provider is disabled by operational policy');
      assert.equal(branch.route.roadDistanceKm, undefined);
      assert.equal(branch.route.travelDurationMinutes, undefined);
    }
  });
});

describe('Invariant 2: Separation of Metrics (Straight-Line Radius vs Road Distance & Travel Duration)', () => {
  const shahbagh: Coordinates = DHAKA_LANDMARKS.shahbagh.coordinates;
  const uttara: Coordinates = DHAKA_LANDMARKS.uttaraHouseBuilding.coordinates;

  it('maintains straightLineDistanceKm separate from roadDistanceKm and travelDurationMinutes', async () => {
    // Calculated Haversine straight-line distance from Shahbagh to Uttara House Building
    const haversineDistKm = calculateHaversineDistanceKm(shahbagh, uttara);
    assert.equal(haversineDistKm > 14.0 && haversineDistKm < 15.0, true);

    const branch = createSampleBranch({
      branchId: 'branch-uttara',
      branchName: 'Uttara Diagnostic Center',
      coordinates: uttara,
      straightLineDistanceKm: haversineDistKm,
      basePriceBdt: 2500,
    });

    // Realistic driving distance and duration through Dhaka Airport Road
    const mockDrivingDistanceMeters = 21450; // 21.45 km
    const mockDrivingDurationSeconds = 3480; // 58 minutes

    const mockFetch: typeof fetch = async (): Promise<Response> => {
      return new Response(
        JSON.stringify({
          code: 'Ok',
          routes: [
            {
              distance: mockDrivingDistanceMeters,
              duration: mockDrivingDurationSeconds,
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const adapter = new OsrmAdapter({ fetchFn: mockFetch });
    const enriched = await enrichBranchesWithRoutes([branch], shahbagh, adapter);

    const result = enriched[0];

    // Verify straight-line distance was NOT overwritten by road distance
    assert.equal(result.straightLineDistanceKm, haversineDistKm);
    assert.notEqual(result.straightLineDistanceKm, 21.45);

    // Verify road distance and travel duration are tracked distinctly
    assert.equal(result.route.status, 'available');
    if (result.route.status === 'available') {
      assert.equal(result.route.roadDistanceKm, 21.45);
      assert.equal(result.route.travelDurationMinutes, 58.0);
      assert.notEqual(result.route.roadDistanceKm, result.straightLineDistanceKm);
    }
  });

  it('verifies straight-line radius filtering is independent of road distance values', async () => {
    // Branch A: close straight-line (2.0 km) but congested road (4.5 km, 25 mins)
    // Branch B: further straight-line (3.5 km) with faster road (4.0 km, 15 mins)
    // Branch C: far straight-line (7.0 km), outside 5 km radius
    const branchA = createSampleBranch({
      branchId: 'branch-a',
      straightLineDistanceKm: 2.0,
      coordinates: DHAKA_LANDMARKS.bsmmu.coordinates,
    });
    const branchB = createSampleBranch({
      branchId: 'branch-b',
      straightLineDistanceKm: 3.5,
      coordinates: DHAKA_LANDMARKS.squareHospital.coordinates,
    });
    const branchC = createSampleBranch({
      branchId: 'branch-c',
      straightLineDistanceKm: 7.0,
      coordinates: DHAKA_LANDMARKS.evercare.coordinates,
    });

    // Filter by straight-line radius 5 km
    const eligibleBranches = [branchA, branchB, branchC].filter(
      (b) => b.straightLineDistanceKm <= 5.0
    );

    assert.equal(eligibleBranches.length, 2);
    assert.deepEqual(
      eligibleBranches.map((b) => b.branchId),
      ['branch-a', 'branch-b']
    );

    // Now enrich eligible branches
    const mockFetch: typeof fetch = async (input): Promise<Response> => {
      const url = String(input);
      const isBSMMU = url.includes(String(DHAKA_LANDMARKS.bsmmu.coordinates.longitude));
      const distance = isBSMMU ? 4500 : 4000;
      const duration = isBSMMU ? 1500 : 900;
      return new Response(
        JSON.stringify({
          code: 'Ok',
          routes: [{ distance, duration }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const adapter = new OsrmAdapter({ fetchFn: mockFetch });
    const enriched = await enrichBranchesWithRoutes(
      eligibleBranches,
      DHAKA_LANDMARKS.dmch.coordinates,
      adapter
    );

    // Straight-line distance sorting
    const sortedByStraightLine = [...enriched].sort(
      (a, b) => a.straightLineDistanceKm - b.straightLineDistanceKm
    );
    assert.equal(sortedByStraightLine[0].branchId, 'branch-a');
    assert.equal(sortedByStraightLine[1].branchId, 'branch-b');

    // Travel duration sorting (Branch B is faster despite longer straight-line distance)
    const sortedByDuration = [...enriched].sort((a, b) => {
      const durA = a.route.travelDurationMinutes ?? Number.POSITIVE_INFINITY;
      const durB = b.route.travelDurationMinutes ?? Number.POSITIVE_INFINITY;
      return durA - durB;
    });
    assert.equal(sortedByDuration[0].branchId, 'branch-b');
    assert.equal(sortedByDuration[1].branchId, 'branch-a');

    // Both straight-line distances remain unchanged
    assert.equal(enriched[0].straightLineDistanceKm, 2.0);
    assert.equal(enriched[1].straightLineDistanceKm, 3.5);
  });
});

describe('Requirement 3: Fallback Handler Behavior & Batch Concurrency', () => {
  const origin: Coordinates = DHAKA_LANDMARKS.dmch.coordinates;

  it('FallbackRoutingAdapter returns explicit unavailable status without invoking network', async () => {
    const adapter = new FallbackRoutingAdapter('rate_limit', 'Offline simulation');

    const result = await adapter.calculateRoute(
      DHAKA_LANDMARKS.dmch.coordinates,
      DHAKA_LANDMARKS.evercare.coordinates
    );

    assert.equal(adapter.name, 'fallback');
    assert.equal(result.status, 'unavailable');
    if (result.status === 'unavailable') {
      assert.equal(result.reason, 'rate_limit');
      assert.equal(result.message, 'Offline simulation');
      assert.equal(result.roadDistanceKm, undefined);
      assert.equal(result.travelDurationMinutes, undefined);
      assert.deepEqual(result.origin, DHAKA_LANDMARKS.dmch.coordinates);
      assert.deepEqual(result.destination, DHAKA_LANDMARKS.evercare.coordinates);
    }
  });

  it('executeWithFallback traps uncaught exceptions and returns safe unavailable result', async () => {
    const dest = DHAKA_LANDMARKS.evercare.coordinates;

    // Operation throwing standard Error
    const failedOp = async (): Promise<RouteResult> => {
      throw new Error('Fatal database connection error inside custom adapter');
    };

    const res = await executeWithFallback(origin, dest, failedOp);
    assert.equal(res.status, 'unavailable');
    if (res.status === 'unavailable') {
      assert.equal(res.reason, 'unknown');
      assert.equal(res.message, 'Fatal database connection error inside custom adapter');
      assert.equal(res.roadDistanceKm, undefined);
      assert.equal(res.travelDurationMinutes, undefined);
    }

    // Operation throwing non-Error primitive
    const stringOp = async (): Promise<RouteResult> => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw 'Raw string rejection';
    };

    const res2 = await executeWithFallback(origin, dest, stringOp);
    assert.equal(res2.status, 'unavailable');
    if (res2.status === 'unavailable') {
      assert.equal(res2.reason, 'unknown');
      assert.equal(res2.message, 'Unknown routing execution error');
    }

    // Operation succeeding
    const successOp = async (): Promise<RouteResult> => {
      return {
        status: 'available',
        roadDistanceKm: 10.0,
        travelDurationMinutes: 25.0,
        origin,
        destination: dest,
        source: 'mock',
      };
    };

    const res3 = await executeWithFallback(origin, dest, successOp);
    assert.equal(res3.status, 'available');
    if (res3.status === 'available') {
      assert.equal(res3.roadDistanceKm, 10.0);
      assert.equal(res3.travelDurationMinutes, 25.0);
    }
  });

  it('enriches mixed lists with working, failing, and rate-limited branches accurately', async () => {
    const branches: ClinicalBranchFixture[] = [
      createSampleBranch({
        branchId: 'b-success-1',
        branchName: 'BSMMU Shahbagh',
        coordinates: DHAKA_LANDMARKS.bsmmu.coordinates,
        basePriceBdt: 400,
      }),
      createSampleBranch({
        branchId: 'b-fail-500',
        branchName: 'Square Panthapath',
        coordinates: DHAKA_LANDMARKS.squareHospital.coordinates,
        basePriceBdt: 1500,
      }),
      createSampleBranch({
        branchId: 'b-fail-429',
        branchName: 'Evercare Bashundhara',
        coordinates: DHAKA_LANDMARKS.evercare.coordinates,
        basePriceBdt: 3000,
      }),
      createSampleBranch({
        branchId: 'b-success-2',
        branchName: 'United Gulshan',
        coordinates: DHAKA_LANDMARKS.unitedHospital.coordinates,
        basePriceBdt: 2800,
      }),
    ];

    const mockFetch: typeof fetch = async (input): Promise<Response> => {
      const url = String(input);
      if (url.includes(String(DHAKA_LANDMARKS.bsmmu.coordinates.longitude))) {
        return new Response(
          JSON.stringify({ code: 'Ok', routes: [{ distance: 1800, duration: 360 }] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes(String(DHAKA_LANDMARKS.squareHospital.coordinates.longitude))) {
        return new Response('Internal Server Error', { status: 500 });
      }
      if (url.includes(String(DHAKA_LANDMARKS.evercare.coordinates.longitude))) {
        return new Response('Rate Limit', { status: 429 });
      }
      if (url.includes(String(DHAKA_LANDMARKS.unitedHospital.coordinates.longitude))) {
        return new Response(
          JSON.stringify({ code: 'Ok', routes: [{ distance: 10500, duration: 1500 }] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not Found', { status: 404 });
    };

    const adapter = new OsrmAdapter({ fetchFn: mockFetch });
    const enriched = await enrichBranchesWithRoutes(branches, origin, adapter, {
      concurrency: 2,
    });

    assert.equal(enriched.length, 4);

    // Branch 1: Success
    assert.equal(enriched[0].branchId, 'b-success-1');
    assert.equal(enriched[0].basePriceBdt, 400);
    assert.equal(enriched[0].route.status, 'available');
    if (enriched[0].route.status === 'available') {
      assert.equal(enriched[0].route.roadDistanceKm, 1.8);
      assert.equal(enriched[0].route.travelDurationMinutes, 6.0);
    }

    // Branch 2: Failed 500
    assert.equal(enriched[1].branchId, 'b-fail-500');
    assert.equal(enriched[1].basePriceBdt, 1500);
    assert.equal(enriched[1].route.status, 'unavailable');
    if (enriched[1].route.status === 'unavailable') {
      assert.equal(enriched[1].route.reason, 'upstream_error');
      assert.equal(enriched[1].route.roadDistanceKm, undefined);
    }

    // Branch 3: Failed 429
    assert.equal(enriched[2].branchId, 'b-fail-429');
    assert.equal(enriched[2].basePriceBdt, 3000);
    assert.equal(enriched[2].route.status, 'unavailable');
    if (enriched[2].route.status === 'unavailable') {
      assert.equal(enriched[2].route.reason, 'rate_limit');
      assert.equal(enriched[2].route.roadDistanceKm, undefined);
    }

    // Branch 4: Success
    assert.equal(enriched[3].branchId, 'b-success-2');
    assert.equal(enriched[3].basePriceBdt, 2800);
    assert.equal(enriched[3].route.status, 'available');
    if (enriched[3].route.status === 'available') {
      assert.equal(enriched[3].route.roadDistanceKm, 10.5);
      assert.equal(enriched[3].route.travelDurationMinutes, 25.0);
    }
  });

  it('respects concurrency limit during batch execution', async () => {
    let currentInFlight = 0;
    let maxInFlight = 0;
    const requestedConcurrency = 3;

    const mockAdapter: RoutingAdapter = {
      name: 'concurrency-tracker',
      calculateRoute: async (orig, dest) => {
        currentInFlight++;
        if (currentInFlight > maxInFlight) {
          maxInFlight = currentInFlight;
        }
        // Artificial delay to observe concurrency
        await new Promise((resolve) => setTimeout(resolve, 15));
        currentInFlight--;

        return {
          status: 'available',
          roadDistanceKm: 5.0,
          travelDurationMinutes: 12.0,
          origin: orig,
          destination: dest,
          source: 'tracker',
        };
      },
    };

    const destinations: Coordinates[] = [
      DHAKA_LANDMARKS.dmch.coordinates,
      DHAKA_LANDMARKS.bsmmu.coordinates,
      DHAKA_LANDMARKS.squareHospital.coordinates,
      DHAKA_LANDMARKS.unitedHospital.coordinates,
      DHAKA_LANDMARKS.evercare.coordinates,
      DHAKA_LANDMARKS.popularDhanmondi.coordinates,
      DHAKA_LANDMARKS.ibnSinaDhanmondi.coordinates,
      DHAKA_LANDMARKS.ibnSinaBadda.coordinates,
    ];

    const results = await getBranchRoutes(origin, destinations, mockAdapter, {
      concurrency: requestedConcurrency,
    });

    assert.equal(results.length, 8);
    assert.equal(maxInFlight <= requestedConcurrency, true);
    assert.equal(maxInFlight >= 2, true);
  });

  it('rejects invalid concurrency and caps workers at the item count', async () => {
    const items = [1, 2, 3];

    for (const concurrency of [-5, 0, Number.NaN, Infinity, 1.5]) {
      await assert.rejects(mapConcurrent(items, concurrency, async (item) => item * 10), RangeError);
    }

    // Concurrency > length handles without error
    const resLarge = await mapConcurrent(items, 100, async (x) => x * 10);
    assert.deepEqual(resLarge, [10, 20, 30]);
  });

});

describe('Requirement 5: Error and Edge Cases', () => {
  const dmch = DHAKA_LANDMARKS.dmch.coordinates;

  it('handles zero-distance route when origin and destination are identical', async () => {
    const mockFetch: typeof fetch = async (): Promise<Response> => {
      return new Response(
        JSON.stringify({
          code: 'Ok',
          routes: [{ distance: 0.0, duration: 0.0 }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const adapter = new OsrmAdapter({ fetchFn: mockFetch });
    const result = await adapter.calculateRoute(dmch, dmch);

    assert.equal(result.status, 'available');
    if (result.status === 'available') {
      assert.equal(result.roadDistanceKm, 0);
      assert.equal(result.travelDurationMinutes, 0);
      assert.deepEqual(result.origin, dmch);
      assert.deepEqual(result.destination, dmch);
    }
  });

  it('rejects out-of-bounds latitude without making network calls', async () => {
    let fetchDispatched = false;
    const mockFetch: typeof fetch = async (): Promise<Response> => {
      fetchDispatched = true;
      return new Response('{}');
    };

    const adapter = new OsrmAdapter({ fetchFn: mockFetch });

    const invalidLatitudes = [90.0001, -90.0001, 150.0, -200.0];
    for (const lat of invalidLatitudes) {
      const invalidOrigin: Coordinates = { latitude: lat, longitude: 90.4 };
      const res = await adapter.calculateRoute(invalidOrigin, dmch);

      assert.equal(fetchDispatched, false);
      assert.equal(res.status, 'unavailable');
      if (res.status === 'unavailable') {
        assert.equal(res.reason, 'invalid_coordinates');
      }
    }
  });

  it('rejects out-of-bounds longitude without making network calls', async () => {
    let fetchDispatched = false;
    const mockFetch: typeof fetch = async (): Promise<Response> => {
      fetchDispatched = true;
      return new Response('{}');
    };

    const adapter = new OsrmAdapter({ fetchFn: mockFetch });

    const invalidLongitudes = [180.0001, -180.0001, 250.0, -360.0];
    for (const lon of invalidLongitudes) {
      const invalidDest: Coordinates = { latitude: 23.7, longitude: lon };
      const res = await adapter.calculateRoute(dmch, invalidDest);

      assert.equal(fetchDispatched, false);
      assert.equal(res.status, 'unavailable');
      if (res.status === 'unavailable') {
        assert.equal(res.reason, 'invalid_coordinates');
      }
    }
  });

  it('rejects NaN, Infinity, and non-finite coordinates without making network calls', async () => {
    let fetchDispatched = false;
    const mockFetch: typeof fetch = async (): Promise<Response> => {
      fetchDispatched = true;
      return new Response('{}');
    };

    const adapter = new OsrmAdapter({ fetchFn: mockFetch });

    const nonFiniteCoords: Coordinates[] = [
      { latitude: Number.NaN, longitude: 90.4 },
      { latitude: 23.7, longitude: Number.NaN },
      { latitude: Number.POSITIVE_INFINITY, longitude: 90.4 },
      { latitude: 23.7, longitude: Number.NEGATIVE_INFINITY },
    ];

    for (const coord of nonFiniteCoords) {
      const res = await adapter.calculateRoute(coord, dmch);
      assert.equal(fetchDispatched, false);
      assert.equal(res.status, 'unavailable');
      if (res.status === 'unavailable') {
        assert.equal(res.reason, 'invalid_coordinates');
      }
    }
  });

  it('returns aborted immediately when AbortSignal is pre-aborted without network call', async () => {
    let fetchDispatched = false;
    const mockFetch: typeof fetch = async (): Promise<Response> => {
      fetchDispatched = true;
      return new Response('{}');
    };

    const adapter = new OsrmAdapter({ fetchFn: mockFetch });
    const preAbortedSignal = AbortSignal.abort();

    const result = await adapter.calculateRoute(
      dmch,
      DHAKA_LANDMARKS.evercare.coordinates,
      { signal: preAbortedSignal }
    );

    assert.equal(fetchDispatched, false);
    assert.equal(result.status, 'unavailable');
    if (result.status === 'unavailable') {
      assert.equal(result.reason, 'aborted');
      assert.equal(result.message, 'Route calculation request was aborted.');
    }
  });

  it('handles immediate short timeout without hanging', async () => {
    const mockFetch: typeof fetch = async (_url, init): Promise<Response> => {
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('Aborted by timeout');
          err.name = 'AbortError';
          reject(err);
        });
      });
    };

    const adapter = new OsrmAdapter({ fetchFn: mockFetch, defaultTimeoutMs: 10 });
    const result = await adapter.calculateRoute(
      dmch,
      DHAKA_LANDMARKS.squareHospital.coordinates,
      { timeoutMs: 10 }
    );

    assert.equal(result.status, 'unavailable');
    if (result.status === 'unavailable') {
      assert.equal(result.reason, 'timeout');
    }
  });
});
