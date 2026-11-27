import { createServerFn } from '@tanstack/react-start';
import { env } from 'cloudflare:workers';
import { getRequest } from '@tanstack/react-start/server';
import { requireSameOriginPost } from '../authentication/server/config.server';
import { reserveMappingRequest } from './provider.server';
import { CatalogRepository } from '../catalog/server/repository.server';
import { isValidCoordinate } from '../map/coordinates';
import type { Coordinates } from '../map/types';
import {
  computeRoadEstimate,
  computeRoadRoute,
} from '../../integrations/mapping/google/routes.server';
import {
  autocompletePlaces,
  fetchPlace,
  isPlaceId,
  isSessionToken,
  type PlaceSuggestion,
  type SelectedPlace,
} from '../../integrations/mapping/google/places.server';
import { catalogId, record, type Service, type BranchService } from '../catalog/contracts';

function serverKey(): string | null {
  const key: unknown = Reflect.get(env, 'GOOGLE_MAPS_SERVER_KEY');
  return typeof key === 'string' && key.trim() ? key.trim() : null;
}

export const publicRoute = createServerFn({ method: 'POST' })
  .validator((value: unknown) => {
    const input = record(value);
    function point(value: unknown): Coordinates {
      const p = record(value);
      const result = { latitude: Number(p.latitude), longitude: Number(p.longitude) };
      if (
        !isValidCoordinate(result) ||
        typeof p.latitude !== 'number' ||
        typeof p.longitude !== 'number'
      )
        throw new Error('Invalid coordinates');
      return result;
    }
    if (input.path !== undefined && typeof input.path !== 'boolean')
      throw new Error('Invalid path');
    return {
      from: point(input.from),
      listing: catalogId(input.listing),
      path: input.path === true,
    };
  })
  .handler(async ({ data }) => {
    const key = serverKey();
    const listing = await new CatalogRepository(env.DB).getBranchService(data.listing);
    if (!listing?.branch.coordinates || !key)
      return {
        available: false as const,
        message: 'Road distance and travel time are unavailable.',
      };
    try {
      requireSameOriginPost(getRequest(), env);
      if (!(await reserveMappingRequest(env.DB))) throw new Error('Mapping request limit');
      const input = { from: data.from, to: listing.branch.coordinates };
      // The route is returned to the browser only. Never store it in D1 or a cache.
      if (data.path) return { available: true as const, ...(await computeRoadRoute(key, input)) };
      return { available: true as const, ...(await computeRoadEstimate(key, input)) };
    } catch {
      return {
        available: false as const,
        message: 'Route lookup failed. Published prices remain available.',
      };
    }
  });

export const publicCatalog = createServerFn({ method: 'GET' })
  .validator((value: unknown) => record(value))
  .handler(async ({ data }) => {
    const db = new CatalogRepository(env.DB);
    const services: Service[] = [];
    let after: string | undefined;
    do {
      const page = await db.listCatalog({ limit: 100, after });
      services.push(...page.items);
      after = page.nextCursor ?? undefined;
    } while (after);
    const serviceId = data.service ? catalogId(data.service) : undefined;
    const listings: BranchService[] = [];
    if (serviceId) {
      do {
        const page = await db.listBranchServices({ serviceId, limit: 100, after });
        listings.push(...page.items);
        after = page.nextCursor ?? undefined;
      } while (after);
    }
    const ratings: Record<string, number | null> = {};
    if (serviceId) {
      const summaries = await env.DB.prepare(
        "SELECT r.listing_id,AVG((json_extract(r.scores,'$[0]')+json_extract(r.scores,'$[1]')+json_extract(r.scores,'$[2]')+json_extract(r.scores,'$[3]')+json_extract(r.scores,'$[4]')+json_extract(r.scores,'$[5]'))/6.0) AS mean FROM service_reviews r JOIN branch_services bs ON bs.id=r.listing_id WHERE bs.service_id=? AND r.visibility='visible' GROUP BY r.listing_id",
      )
        .bind(serviceId)
        .all<{ listing_id: string; mean: number | null }>();
      for (const row of summaries.results) ratings[row.listing_id] = row.mean;
    }
    return { services, listings, ratings };
  });

export const findLocation = createServerFn({ method: 'POST' })
  .validator((value: unknown) => {
    const input = record(value);
    if (
      typeof input.query !== 'string' ||
      input.query.trim().length < 3 ||
      input.query.trim().length > 160
    )
      throw new Error('Enter 3 to 160 characters.');
    if (!isSessionToken(input.sessionToken)) throw new Error('Invalid session token.');
    return { query: input.query.trim(), sessionToken: input.sessionToken };
  })
  .handler(async ({ data }) => {
    const key = serverKey();
    if (!key)
      return {
        suggestions: [] as PlaceSuggestion[],
        message: 'Address lookup is unavailable. Use the map, coordinates, or browser location.',
      };
    try {
      requireSameOriginPost(getRequest(), env);
      if (!(await reserveMappingRequest(env.DB))) throw new Error('Mapping request limit');
      const suggestions = await autocompletePlaces(key, data);
      return {
        suggestions,
        message: suggestions.length
          ? 'Choose a location.'
          : 'No matching Dhaka location. Try another address.',
      };
    } catch {
      return {
        suggestions: [] as PlaceSuggestion[],
        message: 'Address lookup failed. Your previous location is unchanged.',
      };
    }
  });

export const selectLocation = createServerFn({ method: 'POST' })
  .validator((value: unknown) => {
    const input = record(value);
    if (!isPlaceId(input.placeId)) throw new Error('Invalid place.');
    if (!isSessionToken(input.sessionToken)) throw new Error('Invalid session token.');
    return { placeId: input.placeId, sessionToken: input.sessionToken };
  })
  .handler(async ({ data }) => {
    const key = serverKey();
    if (!key)
      return {
        place: null as SelectedPlace | null,
        message: 'Address lookup is unavailable. Use the map, coordinates, or browser location.',
      };
    try {
      requireSameOriginPost(getRequest(), env);
      if (!(await reserveMappingRequest(env.DB))) throw new Error('Mapping request limit');
      const place: SelectedPlace | null = await fetchPlace(key, data);
      return { place, message: 'Location selected.' };
    } catch {
      return {
        place: null as SelectedPlace | null,
        message: 'That address could not be loaded. Your previous location is unchanged.',
      };
    }
  });
