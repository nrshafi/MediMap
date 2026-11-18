import { providerJson } from '../../../features/public/provider.server';
import { decodePolyline } from './polyline';

export type FetchImpl = (input: string, init: RequestInit) => Promise<Response>;
export type RoadPoint = { latitude: number; longitude: number };
export type RoadEstimate = { roadKm: number; minutes: number };
export type RouteStep = {
  instruction: string;
  maneuver: string | null;
  distanceMeters: number | null;
};
export type RoadRoute = RoadEstimate & { path: RoadPoint[]; steps: RouteStep[] };

const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const ESTIMATE_FIELDS = 'routes.distanceMeters,routes.duration';
// Plain polylines and step instructions stay in Compute Routes Essentials.
// Do not add traffic on polylines: it is an Enterprise feature.
const ROUTE_FIELDS = `${ESTIMATE_FIELDS},routes.polyline.encodedPolyline,routes.legs.steps.distanceMeters,routes.legs.steps.navigationInstruction`;
const MAX_STEPS = 200;
const MAX_INSTRUCTION_LENGTH = 500;

export function parseDurationSeconds(value: unknown): number {
  if (typeof value !== 'string' || !/^\d{1,12}(\.\d{1,9})?s$/.test(value))
    throw new Error('Invalid route duration');
  const seconds = Number(value.slice(0, -1));
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error('Invalid route duration');
  return seconds;
}

function waypoint(point: RoadPoint) {
  if (
    !Number.isFinite(point.latitude) ||
    !Number.isFinite(point.longitude) ||
    Math.abs(point.latitude) > 90 ||
    Math.abs(point.longitude) > 180
  )
    throw new Error('Invalid coordinates');
  return { location: { latLng: { latitude: point.latitude, longitude: point.longitude } } };
}

async function requestRoute(
  key: string,
  input: { from: RoadPoint; to: RoadPoint },
  fields: string,
  fetchImpl: FetchImpl,
) {
  if (!key) throw new Error('Missing key');
  const response = await fetchImpl(ROUTES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': fields,
    },
    body: JSON.stringify({
      origin: waypoint(input.from),
      destination: waypoint(input.to),
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_UNAWARE',
      // Without this, Google writes Dhaka step instructions in Bangla. The interface is English.
      ...(fields === ROUTE_FIELDS ? { languageCode: 'en' } : {}),
    }),
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error('Routing unavailable');
  const payload = await providerJson(response);
  const routes = (payload as { routes?: unknown } | null)?.routes;
  if (!Array.isArray(routes) || !routes.length) throw new Error('No route');
  const route = routes[0] as Record<string, unknown> | null;
  if (!route || typeof route !== 'object') throw new Error('No route');
  const meters = route.distanceMeters;
  if (typeof meters !== 'number' || !Number.isFinite(meters) || meters < 0)
    throw new Error('Invalid route distance');
  const estimate: RoadEstimate = {
    roadKm: meters / 1000,
    minutes: parseDurationSeconds(route.duration) / 60,
  };
  return { route, estimate };
}

function parseSteps(legs: unknown): RouteStep[] {
  if (legs === undefined) return [];
  if (!Array.isArray(legs)) throw new Error('Invalid route steps');
  const steps: RouteStep[] = [];
  for (const leg of legs) {
    const raw = (leg as { steps?: unknown } | null)?.steps;
    if (raw === undefined) continue;
    if (!Array.isArray(raw)) throw new Error('Invalid route steps');
    for (const step of raw) {
      if (!step || typeof step !== 'object') throw new Error('Invalid route steps');
      const { navigationInstruction: nav, distanceMeters } = step as Record<string, unknown>;
      const instruction = (nav as { instructions?: unknown } | null | undefined)?.instructions;
      // Google omits instructions for some steps. Skip those steps.
      if (instruction === undefined) continue;
      if (
        typeof instruction !== 'string' ||
        !instruction.trim() ||
        instruction.length > MAX_INSTRUCTION_LENGTH
      )
        throw new Error('Invalid route steps');
      const maneuver = (nav as { maneuver?: unknown }).maneuver;
      if (
        maneuver !== undefined &&
        (typeof maneuver !== 'string' || !/^[A-Z_]{1,40}$/.test(maneuver))
      )
        throw new Error('Invalid route steps');
      if (
        distanceMeters !== undefined &&
        (typeof distanceMeters !== 'number' ||
          !Number.isFinite(distanceMeters) ||
          distanceMeters < 0)
      )
        throw new Error('Invalid route steps');
      steps.push({
        instruction: instruction.trim(),
        maneuver: maneuver ?? null,
        distanceMeters: distanceMeters ?? null,
      });
      if (steps.length > MAX_STEPS) throw new Error('Invalid route steps');
    }
  }
  return steps;
}

/** Requests a driving estimate. Throws on any failure. The caller reserves the mapping budget. */
export async function computeRoadEstimate(
  key: string,
  input: { from: RoadPoint; to: RoadPoint },
  fetchImpl: FetchImpl = fetch,
): Promise<RoadEstimate> {
  return (await requestRoute(key, input, ESTIMATE_FIELDS, fetchImpl)).estimate;
}

/**
 * Requests a driving estimate with the route path and step instructions.
 * Throws on any failure. The caller reserves the mapping budget.
 * Do not store the result: Google terms do not permit caching route content.
 */
export async function computeRoadRoute(
  key: string,
  input: { from: RoadPoint; to: RoadPoint },
  fetchImpl: FetchImpl = fetch,
): Promise<RoadRoute> {
  const { route, estimate } = await requestRoute(key, input, ROUTE_FIELDS, fetchImpl);
  const path = decodePolyline(
    (route.polyline as { encodedPolyline?: unknown } | null | undefined)?.encodedPolyline,
  );
  return { ...estimate, path, steps: parseSteps(route.legs) };
}
