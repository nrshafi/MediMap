export const DEFAULT_CENTER = { latitude: 23.8103, longitude: 90.4125 } as const;
export const DEFAULT_RADIUS_KM = 10;
export const RADIUS_PRESETS = [1, 3, 5, DEFAULT_RADIUS_KM] as const;

export function parseBoundedNumber(value: unknown, min: number, max: number): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.trim())
        : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return undefined;
  return parsed;
}

export function parseCoordinate(value: unknown, limit: number, fallback: number): number {
  return parseBoundedNumber(value, -limit, limit) ?? fallback;
}

export function parseRadius(value: unknown, fallback = DEFAULT_RADIUS_KM): number {
  return parseBoundedNumber(value, 0.1, 100) ?? fallback;
}
