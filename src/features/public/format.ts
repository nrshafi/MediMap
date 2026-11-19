import type { Branch, CurrentPrice } from '../catalog/contracts';

export function formatBdt(amount: number) {
  return `BDT ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function priceStatus(price: CurrentPrice | null): {
  tone: 'verified' | 'disputed' | 'unknown';
  label: string;
} {
  if (!price) return { tone: 'unknown', label: 'Price unknown' };
  if (price.status === 'verified') return { tone: 'verified', label: 'Verified' };
  if (price.status === 'disputed') return { tone: 'disputed', label: 'Disputed, under review' };
  return { tone: 'unknown', label: 'Unverified' };
}

export function directionsUrl(branch: Pick<Branch, 'coordinates' | 'address'>) {
  const destination = branch.coordinates
    ? `${branch.coordinates.latitude},${branch.coordinates.longitude}`
    : branch.address;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export function formatKm(value: number) {
  return `${value.toFixed(1)} km`;
}

export type RouteStep = {
  instruction: string;
  maneuver: string | null;
  distanceMeters: number | null;
};

export type RouteResult =
  | {
      available: true;
      roadKm: number;
      minutes: number;
      path?: { latitude: number; longitude: number }[];
      steps?: RouteStep[];
    }
  | { available: false; message: string };

export function formatMeters(value: number) {
  return value < 1000 ? `${Math.round(value)} m` : `${(value / 1000).toFixed(1)} km`;
}

export function formatReviewDate(value: string | number | null | undefined): string {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Dhaka',
  });
}
