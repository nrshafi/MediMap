import type { RoadPoint } from './routes.server';

/** Maximum encoded length and point count accepted from one route. */
export const MAX_ENCODED_POLYLINE_LENGTH = 40_000;
export const MAX_POLYLINE_POINTS = 5_000;

/**
 * Decodes a Google encoded polyline (precision 5) into WGS 84 points.
 * Throws when the value has characters outside the format, ends inside a value,
 * or decodes to an invalid coordinate.
 */
export function decodePolyline(value: unknown): RoadPoint[] {
  if (typeof value !== 'string' || !value.length || value.length > MAX_ENCODED_POLYLINE_LENGTH)
    throw new Error('Invalid route path');
  const encoded = value;
  const points: RoadPoint[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  function next(): number {
    let result = 0;
    let shift = 0;
    for (;;) {
      if (index >= encoded.length || shift > 30) throw new Error('Invalid route path');
      const code = encoded.charCodeAt(index++) - 63;
      if (code < 0 || code > 63) throw new Error('Invalid route path');
      result |= (code & 0x1f) << shift;
      shift += 5;
      if (code < 0x20) break;
    }
    return result & 1 ? ~(result >> 1) : result >> 1;
  }
  while (index < encoded.length) {
    latitude += next();
    longitude += next();
    const point = { latitude: latitude / 1e5, longitude: longitude / 1e5 };
    if (Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180)
      throw new Error('Invalid route path');
    points.push(point);
    if (points.length > MAX_POLYLINE_POINTS) throw new Error('Invalid route path');
  }
  if (points.length < 2) throw new Error('Invalid route path');
  return points;
}
