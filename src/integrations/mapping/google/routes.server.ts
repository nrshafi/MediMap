import { providerJson } from '../../../features/public/provider.server';

export type FetchImpl = (input: string, init: RequestInit) => Promise<Response>;
export type RoadPoint = { latitude: number; longitude: number };
export type RoadEstimate = { roadKm: number; minutes: number };

const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

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

/** Requests a driving estimate. Throws on any failure. The caller reserves the mapping budget. */
export async function computeRoadEstimate(
  key: string,
  input: { from: RoadPoint; to: RoadPoint },
  fetchImpl: FetchImpl = fetch,
): Promise<RoadEstimate> {
  if (!key) throw new Error('Missing key');
  const response = await fetchImpl(ROUTES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
    },
    body: JSON.stringify({
      origin: waypoint(input.from),
      destination: waypoint(input.to),
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_UNAWARE',
    }),
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error('Routing unavailable');
  const payload = await providerJson(response);
  const routes = (payload as { routes?: unknown } | null)?.routes;
  if (!Array.isArray(routes) || !routes.length) throw new Error('No route');
  const route = routes[0] as { distanceMeters?: unknown; duration?: unknown } | null;
  const meters = route?.distanceMeters;
  if (typeof meters !== 'number' || !Number.isFinite(meters) || meters < 0)
    throw new Error('Invalid route distance');
  return { roadKm: meters / 1000, minutes: parseDurationSeconds(route?.duration) / 60 };
}
