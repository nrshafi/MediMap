import type { Coordinates } from '../map/types';
import type { RouteResult } from '../../integrations/mapping/types';

export interface DiscoveryBranchItem {
  readonly id: string;
  readonly providerId?: string;
  readonly providerName: string;
  readonly branchName: string;
  readonly address?: string;
  readonly area: string;
  readonly coordinates: Coordinates;
  readonly basePriceBdt: number | null;
  readonly priceVerifiedAt: string | null;
  readonly priceSource?: string | null;
  readonly isSample?: boolean;
  readonly isVerified: boolean;
  readonly straightLineDistanceKm: number;
  readonly route?: RouteResult;
  readonly roadDistanceKm?: number;
  readonly travelDurationMinutes?: number;
}
