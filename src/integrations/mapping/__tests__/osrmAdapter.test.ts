/**
 * Unit tests for OSRM routing adapter, fallback behavior, and branch routing helpers.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DHAKA_LANDMARKS } from '../../../features/map/landmarks';
import type { Coordinates } from '../../../features/map/types';
import {
  enrichBranchesWithRoutes,
  getBranchRoutes,
  mapConcurrent,
} from '../branchRouting';
import {
  createUnavailableRouteResult,
  FallbackRoutingAdapter,
  isRouteAvailable,
  isRouteUnavailable,
} from '../fallback';
import { buildOsrmUrl, OsrmAdapter } from '../osrmAdapter';
import type { RouteAvailableResult, RouteResult } from '../types';

describe('buildOsrmUrl', () => {
  it('formats coordinates in longitude,latitude order', () => {
    const origin: Coordinates = { latitude: 23.7259, longitude: 90.3976 };
    const destination: Coordinates = { latitude: 23.8103, longitude: 90.4312 };

    const url = buildOsrmUrl('https://router.project-osrm.org', origin, destination);

    // OSRM requires {lon},{lat};{lon},{lat}
    assert.equal(
      url,
      'https://router.project-osrm.org/route/v1/driving/90.3976,23.7259;90.4312,23.8103?overview=false&steps=false&alternatives=false'
    );
  });

  it('removes trailing slashes from the base URL', () => {
    const origin: Coordinates = { latitude: 23.7, longitude: 90.3 };
    const destination: Coordinates = { latitude: 23.8, longitude: 90.4 };

    const url = buildOsrmUrl('https://router.project-osrm.org///', origin, destination);
    assert.equal(url.startsWith('https://router.project-osrm.org/route/v1/'), true);
  });
});

describe('OsrmAdapter', () => {
  const dmchCoord: Coordinates = DHAKA_LANDMARKS.dmch.coordinates;
  const evercareCoord: Coordinates = DHAKA_LANDMARKS.evercare.coordinates;

  it('calculates road distance in km and travel duration in minutes on success', async () => {
    const mockFetch: typeof fetch = async (): Promise<Response> => {
      const mockPayload = {
        code: 'Ok',
        routes: [
          {
            distance: 12450.0, // 12.45 km
            duration: 1830.0, // 30.5 minutes
          },
        ],
      };
      return new Response(JSON.stringify(mockPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const adapter = new OsrmAdapter({ fetchFn: mockFetch });
    const result = await adapter.calculateRoute(dmchCoord, evercareCoord);

    assert.equal(result.status, 'available');
    if (result.status === 'available') {
      assert.equal(result.roadDistanceKm, 12.45);
      assert.equal(result.travelDurationMinutes, 30.5);
      assert.deepEqual(result.origin, dmchCoord);
      assert.deepEqual(result.destination, evercareCoord);
      assert.equal(result.source, 'osrm');
    }
  });

  it('rejects invalid coordinates without making a network request', async () => {
    let fetchCalled = false;
    const mockFetch: typeof fetch = async (): Promise<Response> => {
      fetchCalled = true;
      return new Response('{}');
    };

    const adapter = new OsrmAdapter({ fetchFn: mockFetch });
    const invalidCoord: Coordinates = { latitude: 999, longitude: 90.0 };

    const result = await adapter.calculateRoute(invalidCoord, evercareCoord);

    assert.equal(fetchCalled, false);
    assert.equal(result.status, 'unavailable');
    if (result.status === 'unavailable') {
      assert.equal(result.reason, 'invalid_coordinates');
      assert.equal(result.roadDistanceKm, undefined);
      assert.equal(result.travelDurationMinutes, undefined);
    }
  });

  it('handles OSRM NoRoute code gracefully', async () => {
    const mockFetch: typeof fetch = async (): Promise<Response> => {
      return new Response(JSON.stringify({ code: 'NoRoute', routes: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const adapter = new OsrmAdapter({ fetchFn: mockFetch });
    const result = await adapter.calculateRoute(dmchCoord, evercareCoord);

    assert.equal(result.status, 'unavailable');
    if (result.status === 'unavailable') {
      assert.equal(result.reason, 'no_route');
    }
  });

  it('handles rate limiting (HTTP 429) as unavailable status', async () => {
    const mockFetch: typeof fetch = async (): Promise<Response> => {
      return new Response('Too Many Requests', { status: 429 });
    };

    const adapter = new OsrmAdapter({ fetchFn: mockFetch });
    const result = await adapter.calculateRoute(dmchCoord, evercareCoord);

    assert.equal(result.status, 'unavailable');
    if (result.status === 'unavailable') {
      assert.equal(result.reason, 'rate_limit');
    }
  });

  it('does not infer coordinate errors from an unstructured HTTP 400', async () => {
    const mockFetch: typeof fetch = async (): Promise<Response> => {
      return new Response('Bad Request', { status: 400 });
    };

    const adapter = new OsrmAdapter({ fetchFn: mockFetch });
    const result = await adapter.calculateRoute(dmchCoord, evercareCoord);

    assert.equal(result.status, 'unavailable');
    if (result.status === 'unavailable') {
      assert.equal(result.reason, 'upstream_error');
    }
  });

  it('classifies structured OSRM errors on HTTP 400', async () => {
    for (const [code, reason] of [
      ['NoRoute', 'no_route'],
      ['NoSegment', 'no_route'],
      ['InvalidOptions', 'upstream_error'],
      ['InvalidQuery', 'upstream_error'],
    ]) {
      const adapter = new OsrmAdapter({
        fetchFn: async () => new Response(JSON.stringify({ code }), { status: 400 }),
      });
      const result = await adapter.calculateRoute(dmchCoord, evercareCoord);
      assert.equal(result.status, 'unavailable');
      if (result.status === 'unavailable') {
        assert.equal(result.reason, reason);
      }
    }
  });

  it('classifies invalid JSON in a successful response as upstream failure', async () => {
    const adapter = new OsrmAdapter({
      fetchFn: async () => new Response('invalid JSON'),
    });
    const result = await adapter.calculateRoute(dmchCoord, evercareCoord);
    assert.equal(result.status, 'unavailable');
    if (result.status === 'unavailable') {
      assert.equal(result.reason, 'upstream_error');
    }
  });

  it('handles server error (HTTP 500) as upstream_error', async () => {
    const mockFetch: typeof fetch = async (): Promise<Response> => {
      return new Response('Server Error', { status: 500 });
    };

    const adapter = new OsrmAdapter({ fetchFn: mockFetch });
    const result = await adapter.calculateRoute(dmchCoord, evercareCoord);

    assert.equal(result.status, 'unavailable');
    if (result.status === 'unavailable') {
      assert.equal(result.reason, 'upstream_error');
    }
  });

  it('handles network exceptions without crashing', async () => {
    const mockFetch: typeof fetch = async (): Promise<Response> => {
      throw new TypeError('Failed to fetch');
    };

    const adapter = new OsrmAdapter({ fetchFn: mockFetch });
    const result = await adapter.calculateRoute(dmchCoord, evercareCoord);

    assert.equal(result.status, 'unavailable');
    if (result.status === 'unavailable') {
      assert.equal(result.reason, 'network_error');
    }
  });

  it('handles timeout when request duration exceeds timeout limit', async () => {
    const mockFetch: typeof fetch = async (_url, init): Promise<Response> => {
      return new Promise<Response>((_, reject) => {
        const signal = init?.signal;
        if (signal) {
          signal.addEventListener('abort', () => {
            const abortError = new Error('The operation was aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          });
        }
      });
    };

    const adapter = new OsrmAdapter({
      fetchFn: mockFetch,
      defaultTimeoutMs: 50,
    });

    const result = await adapter.calculateRoute(dmchCoord, evercareCoord, {
      timeoutMs: 50,
    });

    assert.equal(result.status, 'unavailable');
    if (result.status === 'unavailable') {
      assert.equal(result.reason, 'timeout');
    }
  });

  it('handles external AbortSignal cancellation', async () => {
    const controller = new AbortController();
    const mockFetch: typeof fetch = async (_url, init): Promise<Response> => {
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const abortError = new Error('Aborted');
          abortError.name = 'AbortError';
          reject(abortError);
        });
      });
    };

    const adapter = new OsrmAdapter({ fetchFn: mockFetch });

    setTimeout(() => {
      controller.abort();
    }, 20);

    const result = await adapter.calculateRoute(dmchCoord, evercareCoord, {
      signal: controller.signal,
    });

    assert.equal(result.status, 'unavailable');
    if (result.status === 'unavailable') {
      assert.equal(result.reason, 'aborted');
    }
  });

  it('handles malformed JSON payload', async () => {
    const mockFetch: typeof fetch = async (): Promise<Response> => {
      return new Response(JSON.stringify({ code: 'Ok', routes: [{ distance: 'invalid' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const adapter = new OsrmAdapter({ fetchFn: mockFetch });
    const result = await adapter.calculateRoute(dmchCoord, evercareCoord);

    assert.equal(result.status, 'unavailable');
    if (result.status === 'unavailable') {
      assert.equal(result.reason, 'upstream_error');
    }
  });
});

describe('Fallback and Type Guards', () => {
  const coordA: Coordinates = { latitude: 23.7, longitude: 90.3 };
  const coordB: Coordinates = { latitude: 23.8, longitude: 90.4 };

  it('creates unavailable result with undefined distances', () => {
    const res = createUnavailableRouteResult(coordA, coordB, 'timeout', 'Timed out');
    assert.equal(res.status, 'unavailable');
    assert.equal(res.reason, 'timeout');
    assert.equal(res.message, 'Timed out');
    assert.equal(res.roadDistanceKm, undefined);
    assert.equal(res.travelDurationMinutes, undefined);
  });

  it('FallbackRoutingAdapter always returns unavailable results', async () => {
    const adapter = new FallbackRoutingAdapter('upstream_error', 'Service offline');
    const res = await adapter.calculateRoute(coordA, coordB);
    assert.equal(res.status, 'unavailable');
    if (res.status === 'unavailable') {
      assert.equal(res.reason, 'upstream_error');
    }
  });

  it('type guards distinguish between available and unavailable', () => {
    const available: RouteAvailableResult = {
      status: 'available',
      roadDistanceKm: 5.2,
      travelDurationMinutes: 14,
      origin: coordA,
      destination: coordB,
      source: 'osrm',
    };
    const unavailable = createUnavailableRouteResult(coordA, coordB, 'no_route', 'No route');

    assert.equal(isRouteAvailable(available), true);
    assert.equal(isRouteAvailable(unavailable), false);
    assert.equal(isRouteUnavailable(unavailable), true);
    assert.equal(isRouteUnavailable(available), false);
  });
});

describe('Branch Routing Helpers', () => {
  const origin: Coordinates = DHAKA_LANDMARKS.dmch.coordinates;

  it('keeps routing unavailable until an adapter is explicitly supplied', async () => {
    const routes = await getBranchRoutes(origin, [origin]);
    assert.equal(routes[0].status, 'unavailable');
  });

  it('isolates adapter rejection and preserves other branch results', async () => {
    const branches = [
      { id: 'failed', coordinates: origin, priceBdt: 400 },
      { id: 'success', coordinates: DHAKA_LANDMARKS.evercare.coordinates, priceBdt: 900 },
    ];
    const enriched = await enrichBranchesWithRoutes(branches, origin, {
      name: 'partial-failure',
      calculateRoute: async (start, destination) => {
        if (destination === origin) {
          throw new Error('Adapter failed');
        }
        return {
          status: 'available', origin: start, destination,
          roadDistanceKm: 12, travelDurationMinutes: 30, source: 'test',
        };
      },
    });
    for (const [index, branch] of branches.entries()) {
      assert.equal(enriched[index].id, branch.id);
      assert.equal(enriched[index].priceBdt, branch.priceBdt);
      assert.deepEqual(enriched[index].coordinates, branch.coordinates);
    }
    assert.equal(enriched[0].route.status, 'unavailable');
    assert.equal(enriched[1].route.status, 'available');
  });

  it('preserves item order in mapConcurrent', async () => {
    const items = [10, 20, 30, 40, 50];
    const results = await mapConcurrent(items, 2, async (item) => {
      return item * 2;
    });

    assert.deepEqual(results, [20, 40, 60, 80, 100]);
  });

  it('handles empty branch lists in enrichBranchesWithRoutes', async () => {
    const enriched = await enrichBranchesWithRoutes([], origin);
    assert.deepEqual(enriched, []);
  });

  it('enriches branches and preserves core branch and price data when routing succeeds', async () => {
    const branches = [
      {
        id: 'branch-1',
        name: 'Square Hospital Panthapath',
        coordinates: DHAKA_LANDMARKS.squareHospital.coordinates,
        priceBdt: 1500,
        verified: true,
        straightLineDistanceKm: 2.5,
      },
      {
        id: 'branch-2',
        name: 'BSMMU Shahbagh',
        coordinates: DHAKA_LANDMARKS.bsmmu.coordinates,
        priceBdt: 400,
        verified: true,
        straightLineDistanceKm: 1.4,
      },
    ];

    const mockFetch: typeof fetch = async (input): Promise<Response> => {
      const url = String(input);
      const isSquare = url.includes(String(DHAKA_LANDMARKS.squareHospital.coordinates.longitude));
      const distance = isSquare ? 3500 : 1800; // meters
      const duration = isSquare ? 900 : 420; // seconds

      return new Response(
        JSON.stringify({
          code: 'Ok',
          routes: [{ distance, duration }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const adapter = new OsrmAdapter({ fetchFn: mockFetch });
    const enriched = await enrichBranchesWithRoutes(branches, origin, adapter);

    assert.equal(enriched.length, 2);

    // Branch 1 verification
    assert.equal(enriched[0].id, 'branch-1');
    assert.equal(enriched[0].name, 'Square Hospital Panthapath');
    assert.equal(enriched[0].priceBdt, 1500);
    assert.equal(enriched[0].verified, true);
    assert.equal(enriched[0].straightLineDistanceKm, 2.5);
    assert.equal(enriched[0].route.status, 'available');
    if (enriched[0].route.status === 'available') {
      assert.equal(enriched[0].route.roadDistanceKm, 3.5);
      assert.equal(enriched[0].route.travelDurationMinutes, 15);
    }

    // Branch 2 verification
    assert.equal(enriched[1].id, 'branch-2');
    assert.equal(enriched[1].priceBdt, 400);
    assert.equal(enriched[1].route.status, 'available');
    if (enriched[1].route.status === 'available') {
      assert.equal(enriched[1].route.roadDistanceKm, 1.8);
      assert.equal(enriched[1].route.travelDurationMinutes, 7);
    }
  });

  it('preserves all branch and price data when routing encounters network failures or timeouts', async () => {
    const branches = [
      {
        id: 'branch-evercare',
        name: 'Evercare Hospital',
        coordinates: DHAKA_LANDMARKS.evercare.coordinates,
        priceBdt: 2200,
        verified: false,
        straightLineDistanceKm: 8.7,
      },
    ];

    // Mock fetch that simulates network failure
    const failingFetch: typeof fetch = async (): Promise<Response> => {
      throw new TypeError('Network connection refused');
    };

    const failingAdapter = new OsrmAdapter({ fetchFn: failingFetch });
    const enriched = await enrichBranchesWithRoutes(branches, origin, failingAdapter);

    assert.equal(enriched.length, 1);
    const branch = enriched[0];

    // Core business data remains completely intact
    assert.equal(branch.id, 'branch-evercare');
    assert.equal(branch.name, 'Evercare Hospital');
    assert.equal(branch.priceBdt, 2200);
    assert.equal(branch.verified, false);
    assert.equal(branch.straightLineDistanceKm, 8.7);

    // Route status is explicitly unavailable with undefined road distance and duration
    assert.equal(branch.route.status, 'unavailable');
    if (branch.route.status === 'unavailable') {
      assert.equal(branch.route.reason, 'network_error');
      assert.equal(branch.route.roadDistanceKm, undefined);
      assert.equal(branch.route.travelDurationMinutes, undefined);
    }
  });

  it('calculates routes for destinations using getBranchRoutes in exact order', async () => {
    const destinations = [
      DHAKA_LANDMARKS.squareHospital.coordinates,
      DHAKA_LANDMARKS.evercare.coordinates,
    ];

    const mockAdapter: { name: string; calculateRoute: (orig: Coordinates, dest: Coordinates) => Promise<RouteResult> } = {
      name: 'test-adapter',
      calculateRoute: async (_orig, dest) => {
        return {
          status: 'available',
          roadDistanceKm: dest === DHAKA_LANDMARKS.squareHospital.coordinates ? 3.5 : 12.0,
          travelDurationMinutes: 10,
          origin,
          destination: dest,
          source: 'test',
        };
      },
    };

    const routes = await getBranchRoutes(origin, destinations, mockAdapter);

    assert.equal(routes.length, 2);
    assert.equal(routes[0].status, 'available');
    assert.equal(routes[1].status, 'available');
    if (routes[0].status === 'available' && routes[1].status === 'available') {
      assert.equal(routes[0].roadDistanceKm, 3.5);
      assert.equal(routes[1].roadDistanceKm, 12.0);
    }
  });
});
