import type { BranchService } from '../catalog/contracts';
import { parseBoundedNumber } from './defaults';

export const MAX_FILTER_PRICE_BDT = 1_000_000;
export const RATING_FILTER_OPTIONS = [1, 2, 3, 4] as const;
export type MinRatingFilter = (typeof RATING_FILTER_OPTIONS)[number];

export interface ListingFilterParams {
  minPrice?: number;
  maxPrice?: number;
  minRating?: MinRatingFilter;
}

export interface FilteredListingsResult {
  visible: BranchService[];
  hiddenUnknownPrice: number;
  hiddenNoRating: number;
}

export function parsePriceFilter(value: unknown): number | undefined {
  const parsed = parseBoundedNumber(value, 0, MAX_FILTER_PRICE_BDT);
  if (parsed === undefined || !Number.isInteger(parsed)) return undefined;
  return parsed;
}

export function parsePriceRange(
  minRaw: unknown,
  maxRaw: unknown,
): { minPrice?: number; maxPrice?: number } {
  const minPrice = parsePriceFilter(minRaw);
  const maxPrice = parsePriceFilter(maxRaw);
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    return {};
  }
  return {
    ...(minPrice !== undefined ? { minPrice } : {}),
    ...(maxPrice !== undefined ? { maxPrice } : {}),
  };
}

export function parseRatingFilter(value: unknown): MinRatingFilter | undefined {
  const parsed = parseBoundedNumber(value, 1, 4);
  if (parsed === undefined || !Number.isInteger(parsed)) return undefined;
  return RATING_FILTER_OPTIONS.find((option) => option === parsed);
}

export function applyListingFilters(
  listings: readonly BranchService[],
  ratings: Record<string, number | null>,
  filters: ListingFilterParams,
): FilteredListingsResult {
  const hasPriceFilter = filters.minPrice !== undefined || filters.maxPrice !== undefined;
  const minMinor = filters.minPrice !== undefined ? filters.minPrice * 100 : undefined;
  const maxMinor = filters.maxPrice !== undefined ? filters.maxPrice * 100 : undefined;
  const minRating = filters.minRating;

  const visible: BranchService[] = [];
  let hiddenUnknownPrice = 0;
  let hiddenNoRating = 0;

  for (const listing of listings) {
    if (hasPriceFilter) {
      if (!listing.price) {
        hiddenUnknownPrice += 1;
        continue;
      }
      if (minMinor !== undefined && listing.price.amountMinor < minMinor) continue;
      if (maxMinor !== undefined && listing.price.amountMinor > maxMinor) continue;
    }

    if (minRating !== undefined) {
      const mean = ratings[listing.id];
      if (mean === undefined || mean === null) {
        hiddenNoRating += 1;
        continue;
      }
      if (mean < minRating) continue;
    }

    visible.push(listing);
  }

  return { visible, hiddenUnknownPrice, hiddenNoRating };
}
