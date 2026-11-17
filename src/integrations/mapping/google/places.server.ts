import { providerJson } from '../../../features/public/provider.server';
import type { FetchImpl } from './routes.server';

export type PlaceSuggestion = { placeId: string; label: string };
export type SelectedPlace = { label: string; latitude: number; longitude: number };

const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const DETAILS_URL = 'https://places.googleapis.com/v1/places/';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLACE_ID = /^[A-Za-z0-9_-]{1,512}$/;

export const DHAKA_BOUNDS = { south: 23.6, north: 24.0, west: 90.2, east: 90.6 } as const;

export function isSessionToken(value: unknown): value is string {
  return typeof value === 'string' && UUID_V4.test(value);
}
export function isPlaceId(value: unknown): value is string {
  return typeof value === 'string' && PLACE_ID.test(value);
}

/** Requests address suggestions. Throws on any failure. The caller reserves the mapping budget. */
export async function autocompletePlaces(
  key: string,
  input: { query: string; sessionToken: string },
  fetchImpl: FetchImpl = fetch,
): Promise<PlaceSuggestion[]> {
  if (!key) throw new Error('Missing key');
  const query = input.query.trim();
  if (query.length < 3 || query.length > 160) throw new Error('Invalid query');
  if (!isSessionToken(input.sessionToken)) throw new Error('Invalid session token');
  const response = await fetchImpl(AUTOCOMPLETE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask':
        'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text',
    },
    body: JSON.stringify({
      input: query,
      sessionToken: input.sessionToken,
      includedRegionCodes: ['bd'],
      locationRestriction: {
        rectangle: {
          low: { latitude: DHAKA_BOUNDS.south, longitude: DHAKA_BOUNDS.west },
          high: { latitude: DHAKA_BOUNDS.north, longitude: DHAKA_BOUNDS.east },
        },
      },
    }),
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error('Provider unavailable');
  const payload = (await providerJson(response)) as { suggestions?: unknown } | null;
  // Google omits `suggestions` when nothing matches.
  const raw = payload?.suggestions ?? [];
  if (!Array.isArray(raw)) throw new Error('Invalid provider result');
  const result: PlaceSuggestion[] = [];
  for (const item of raw) {
    const prediction = (item as { placePrediction?: unknown } | null)?.placePrediction as
      { placeId?: unknown; text?: { text?: unknown } | null } | undefined;
    if (!prediction) continue;
    const label = prediction.text?.text;
    if (!isPlaceId(prediction.placeId) || typeof label !== 'string' || !label.trim())
      throw new Error('Invalid suggestion');
    result.push({ placeId: prediction.placeId, label: label.slice(0, 300) });
    if (result.length === 5) break;
  }
  return result;
}

/** Loads the selected place. Throws on any failure. The caller reserves the mapping budget. */
export async function fetchPlace(
  key: string,
  input: { placeId: string; sessionToken: string },
  fetchImpl: FetchImpl = fetch,
): Promise<SelectedPlace> {
  if (!key) throw new Error('Missing key');
  if (!isPlaceId(input.placeId)) throw new Error('Invalid place id');
  if (!isSessionToken(input.sessionToken)) throw new Error('Invalid session token');
  const url = `${DETAILS_URL}${encodeURIComponent(input.placeId)}?sessionToken=${encodeURIComponent(input.sessionToken)}`;
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'location,formattedAddress' },
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error('Provider unavailable');
  const place = (await providerJson(response)) as {
    location?: { latitude?: unknown; longitude?: unknown } | null;
    formattedAddress?: unknown;
  } | null;
  const lat = place?.location?.latitude;
  const lng = place?.location?.longitude;
  if (
    typeof place?.formattedAddress !== 'string' ||
    !place.formattedAddress.trim() ||
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < DHAKA_BOUNDS.south ||
    lat > DHAKA_BOUNDS.north ||
    lng < DHAKA_BOUNDS.west ||
    lng > DHAKA_BOUNDS.east
  )
    throw new Error('Invalid location');
  return { label: place.formattedAddress.slice(0, 300), latitude: lat, longitude: lng };
}
