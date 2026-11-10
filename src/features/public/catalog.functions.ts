import { createServerFn } from '@tanstack/react-start';
import { env } from 'cloudflare:workers';
import { CatalogRepository } from '../catalog/server/repository.server';
import { isValidCoordinate } from '../map/coordinates';
import type { Coordinates } from '../map/types';

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
    return { from: point(input.from), listing: catalogId(input.listing) };
  })
  .handler(async ({ data }) => {
    const key: unknown = Reflect.get(env, 'GEOAPIFY_API_KEY');
    const listing = await new CatalogRepository(env.DB).getBranchService(data.listing);
    if (!listing?.branch.coordinates || typeof key !== 'string' || !key)
      return {
        available: false as const,
        message: 'Road distance and travel time are unavailable.',
      };
    try {
      const to = listing.branch.coordinates;
      const url = new URL('https://api.geoapify.com/v1/routing');
      url.search = new URLSearchParams({
        waypoints: `${data.from.latitude},${data.from.longitude}|${to.latitude},${to.longitude}`,
        mode: 'drive',
        apiKey: key,
      }).toString();
      const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!response.ok) throw new Error('Routing unavailable');
      const payload = record(await response.json());
      if (!Array.isArray(payload.features) || !payload.features.length) throw new Error('No route');
      const properties = record(record(payload.features[0]).properties);
      if (
        typeof properties.distance !== 'number' ||
        typeof properties.time !== 'number' ||
        !Number.isFinite(properties.distance) ||
        !Number.isFinite(properties.time) ||
        properties.distance < 0 ||
        properties.time < 0
      )
        throw new Error('Invalid route');
      return {
        available: true as const,
        roadKm: properties.distance / 1000,
        minutes: properties.time / 60,
      };
    } catch {
      return {
        available: false as const,
        message: 'Route lookup failed. Published prices remain available.',
      };
    }
  });
import { catalogId, record, type Service, type BranchService } from '../catalog/contracts';

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
    return { services, listings };
  });

export const findLocation = createServerFn({ method: 'POST' })
  .validator((value: unknown) => {
    const input = record(value);
    if (
      typeof input.query !== 'string' ||
      input.query.trim().length < 3 ||
      input.query.length > 160
    )
      throw new Error('Enter 3 to 160 characters.');
    return input.query.trim();
  })
  .handler(async ({ data }) => {
    const key: unknown = Reflect.get(env, 'GEOAPIFY_API_KEY');
    if (typeof key !== 'string' || !key)
      return {
        places: [],
        message: 'Address lookup is unavailable. Use the map, coordinates, or browser location.',
      };
    try {
      const url = new URL('https://api.geoapify.com/v1/geocode/search');
      url.search = new URLSearchParams({
        text: data,
        filter: 'rect:90.2,23.6,90.6,24.0',
        format: 'json',
        limit: '5',
        apiKey: key,
      }).toString();
      const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!response.ok) throw new Error('Provider unavailable');
      const payload = record(await response.json());
      if (!Array.isArray(payload.results)) throw new Error('Invalid provider result');
      const places = payload.results.map((value: unknown) => {
        const p = record(value);
        if (
          typeof p.formatted !== 'string' ||
          typeof p.lat !== 'number' ||
          typeof p.lon !== 'number' ||
          !Number.isFinite(p.lat) ||
          !Number.isFinite(p.lon) ||
          p.lat < 23.6 ||
          p.lat > 24 ||
          p.lon < 90.2 ||
          p.lon > 90.6
        )
          throw new Error('Invalid location');
        return { label: p.formatted.slice(0, 300), latitude: p.lat, longitude: p.lon };
      });
      return {
        places,
        message: places.length
          ? 'Choose a location.'
          : 'No matching Dhaka location. Try another address.',
      };
    } catch {
      return { places: [], message: 'Address lookup failed. Your previous location is unchanged.' };
    }
  });
