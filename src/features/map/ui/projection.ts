/**
 * Web Mercator and Equirectangular projections for the Dhaka metropolitan area.
 * Converts WGS84 geographic coordinates into 2D SVG canvas coordinates with bounds protection.
 */

import { DHAKA_BOUNDING_BOXES, isValidCoordinate } from '../coordinates';
import type { Coordinates, GeoBoundingBox } from '../types';

/**
 * Default geographic bounding box covering core central Dhaka healthcare corridor.
 */
export const DHAKA_DEFAULT_BOUNDS: GeoBoundingBox = DHAKA_BOUNDING_BOXES.core;

/**
 * Metropolitan bounding box covering Greater Dhaka (Savar, Gazipur, Narayanganj).
 */
export const DHAKA_METRO_BOUNDS: GeoBoundingBox = DHAKA_BOUNDING_BOXES.greaterDhaka;

/**
 * Minimum degree span to avoid degenerate (zero width/height) bounding boxes.
 * 0.04 degrees is approximately 4.4 km north-south and 4.1 km east-west at Dhaka's latitude.
 */
const MIN_DEGREE_SPAN = 0.04;

/**
 * SVG viewport dimensions and padding configuration for map projection.
 */
export interface MapViewport {
  readonly width: number;
  readonly height: number;
  readonly padding?: number;
}

/**
 * 2D projected point in SVG canvas coordinate space.
 */
export interface ProjectedPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Projector contract mapping coordinates to SVG points and vice-versa.
 */
export interface MapProjector {
  readonly project: (coords: Coordinates) => ProjectedPoint;
  readonly unproject: (point: ProjectedPoint) => Coordinates;
  readonly bounds: GeoBoundingBox;
  readonly viewport: Required<MapViewport>;
  readonly scale: number;
}

/**
 * Computes Mercator latitude value in radians.
 * Safe against mathematical singularities at the poles (-90 and 90 degrees).
 */
function toMercatorY(latitudeDegrees: number): number {
  const clampedLat = Math.max(-85, Math.min(85, latitudeDegrees));
  const latRad = (clampedLat * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + latRad / 2));
}

/**
 * Computes latitude in degrees from Mercator Y in radians.
 */
function fromMercatorY(mercatorY: number): number {
  const latRad = 2 * Math.atan(Math.exp(mercatorY)) - Math.PI / 2;
  return (latRad * 180) / Math.PI;
}

/**
 * Computes a dynamic bounding box encompassing all branch coordinates and the search center.
 * Protects against degenerate bounds (single coordinate or zero distance) and applies padding.
 *
 * @param branches - Collection of branch items with coordinates.
 * @param center - Optional search center coordinates.
 * @param paddingRatio - Extra margin ratio around the outer bounds (default: 0.15 or 15%).
 * @returns Bounding box fitted to the input points.
 */
export function computeAutoBounds(
  branches: readonly { readonly coordinates: Coordinates }[],
  center?: Coordinates | null,
  paddingRatio = 0.15
): GeoBoundingBox {
  const points: Coordinates[] = [];

  if (center && isValidCoordinate(center)) {
    points.push(center);
  }

  for (const item of branches) {
    if (item.coordinates && isValidCoordinate(item.coordinates)) {
      points.push(item.coordinates);
    }
  }

  if (points.length === 0) {
    return DHAKA_DEFAULT_BOUNDS;
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;

  for (const point of points) {
    if (point.latitude < minLat) minLat = point.latitude;
    if (point.latitude > maxLat) maxLat = point.latitude;
    if (point.longitude < minLon) minLon = point.longitude;
    if (point.longitude > maxLon) maxLon = point.longitude;
  }

  let spanLat = maxLat - minLat;
  let spanLon = maxLon - minLon;

  // Protect against degenerate single point or identical coordinates
  if (spanLat < MIN_DEGREE_SPAN) {
    const midLat = (minLat + maxLat) / 2;
    minLat = midLat - MIN_DEGREE_SPAN / 2;
    maxLat = midLat + MIN_DEGREE_SPAN / 2;
    spanLat = MIN_DEGREE_SPAN;
  }

  if (spanLon < MIN_DEGREE_SPAN) {
    const midLon = (minLon + maxLon) / 2;
    minLon = midLon - MIN_DEGREE_SPAN / 2;
    maxLon = midLon + MIN_DEGREE_SPAN / 2;
    spanLon = MIN_DEGREE_SPAN;
  }

  const padLat = spanLat * Math.max(0, paddingRatio);
  const padLon = spanLon * Math.max(0, paddingRatio);

  return {
    minLat: minLat - padLat,
    maxLat: maxLat + padLat,
    minLon: minLon - padLon,
    maxLon: maxLon + padLon,
  };
}

/**
 * Creates a map projector for transforming WGS84 coordinates into SVG viewport pixels.
 * Uses Web Mercator projection with isometric aspect-ratio preservation and center alignment.
 *
 * @param bounds - Geographic bounds of the region to display.
 * @param viewport - Canvas viewport width, height, and edge padding.
 * @returns MapProjector instance.
 */
export function createMapProjector(
  bounds: GeoBoundingBox = DHAKA_DEFAULT_BOUNDS,
  viewport: MapViewport = { width: 800, height: 600, padding: 36 }
): MapProjector {
  const width = Math.max(100, viewport.width);
  const height = Math.max(100, viewport.height);
  const padding = Math.max(0, viewport.padding ?? 36);

  const usableWidth = Math.max(1, width - padding * 2);
  const usableHeight = Math.max(1, height - padding * 2);

  const minLon = bounds.minLon;
  const maxLon = bounds.maxLon;
  const minLat = bounds.minLat;
  const maxLat = bounds.maxLat;

  const yMercMin = toMercatorY(minLat);
  const yMercMax = toMercatorY(maxLat);

  // Longitude delta in radians
  const deltaLonRad = Math.max(0.0001, ((maxLon - minLon) * Math.PI) / 180);
  const deltaMercY = Math.max(0.0001, yMercMax - yMercMin);

  // Isometric scale so 1 unit x corresponds to 1 unit y
  const scaleX = usableWidth / deltaLonRad;
  const scaleY = usableHeight / deltaMercY;
  const scale = Math.min(scaleX, scaleY);

  const centerLon = (minLon + maxLon) / 2;
  const centerMercY = (yMercMin + yMercMax) / 2;

  const svgCenterX = width / 2;
  const svgCenterY = height / 2;

  function project(coords: Coordinates): ProjectedPoint {
    if (!isValidCoordinate(coords)) {
      return { x: svgCenterX, y: svgCenterY };
    }

    const lonRad = ((coords.longitude - centerLon) * Math.PI) / 180;
    const mercY = toMercatorY(coords.latitude) - centerMercY;

    // In SVG, positive Y is downwards, whereas higher latitude is upwards
    const x = svgCenterX + lonRad * scale;
    const y = svgCenterY - mercY * scale;

    return {
      x: Number.isFinite(x) ? Math.round(x * 100) / 100 : svgCenterX,
      y: Number.isFinite(y) ? Math.round(y * 100) / 100 : svgCenterY,
    };
  }

  function unproject(point: ProjectedPoint): Coordinates {
    const dx = point.x - svgCenterX;
    const dy = svgCenterY - point.y;

    const lonRad = dx / scale;
    const mercY = centerMercY + dy / scale;

    const longitude = centerLon + (lonRad * 180) / Math.PI;
    const latitude = fromMercatorY(mercY);

    return {
      latitude: Number.isFinite(latitude) ? Math.round(latitude * 10000) / 10000 : 23.75,
      longitude: Number.isFinite(longitude) ? Math.round(longitude * 10000) / 10000 : 90.38,
    };
  }

  return {
    project,
    unproject,
    bounds,
    viewport: { width, height, padding },
    scale,
  };
}
