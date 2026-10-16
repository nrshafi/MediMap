import { DHAKA_LANDMARKS } from '../map/landmarks';
import { parseRadiusFilterInput, filterBranchesByRadius } from '../map/radiusFilter';
import type { Coordinates } from '../map/types';
import type { DiscoveryBranchItem } from './discoveryTypes';
import { createUnavailableRouteResult } from '../../integrations/mapping/fallback';
import { MOCK_BRANCH_LISTINGS } from './fixtures/branchListings';
export { MOCK_BRANCH_LISTINGS } from './fixtures/branchListings';
import { DEFAULT_DIAGNOSTIC_CATALOG } from './diagnosticCatalog';
import { resolveDiagnosticQuery } from './resolutionEngine';
import type { CanonicalService } from './types';


export interface BranchServicePrice {
  readonly serviceId: string;
  readonly basePriceBdt: number | null;
  readonly priceSource: string | null;
  readonly verificationStatus: 'verified' | 'unverified';
  readonly verifiedAt: string | null;
}


export interface MockBranchListing {
  readonly id: string;
  readonly name: string;
  readonly providerId: string;
  readonly providerName: string;
  readonly branchName: string;
  readonly address: string;
  readonly area: string;
  readonly coordinates: Coordinates;
  readonly phone: string;
  readonly servicePrices: readonly BranchServicePrice[];
  readonly isSample?: boolean;
}


export interface LocationPreset {
  readonly id: string;
  readonly name: string;
  readonly nameBn: string;
  readonly coordinates: Coordinates;
  readonly area: string;
}


export const DHAKA_LOCATION_PRESETS: readonly LocationPreset[] = [
  {
    id: 'shahbagh',
    name: 'Shahbagh',
    nameBn: 'শাহবাগ',
    coordinates: DHAKA_LANDMARKS.shahbagh.coordinates,
    area: 'Shahbagh',
  },
  {
    id: 'dhanmondi',
    name: 'Dhanmondi',
    nameBn: 'ধানমন্ডি',
    coordinates: DHAKA_LANDMARKS.popularDhanmondi.coordinates,
    area: 'Dhanmondi',
  },
  {
    id: 'farmgate',
    name: 'Farmgate',
    nameBn: 'ফার্মগেট',
    coordinates: DHAKA_LANDMARKS.farmgate.coordinates,
    area: 'Farmgate',
  },
  {
    id: 'gulshan2',
    name: 'Gulshan-2',
    nameBn: 'গুলশান-২',
    coordinates: DHAKA_LANDMARKS.gulshan2.coordinates,
    area: 'Gulshan-2',
  },
  {
    id: 'mirpur10',
    name: 'Mirpur-10',
    nameBn: 'মিরপুর-১০',
    coordinates: DHAKA_LANDMARKS.mirpur10.coordinates,
    area: 'Mirpur-10',
  },
  {
    id: 'uttara',
    name: 'Uttara',
    nameBn: 'উত্তরা',
    coordinates: DHAKA_LANDMARKS.uttaraHouseBuilding.coordinates,
    area: 'Uttara Sector 7/9',
  },
] as const;

export interface DiscoveryQueryFilterOptions {
  readonly serviceId?: string;
  readonly queryText?: string;
  readonly center?: Coordinates;
  readonly radiusKm?: number;
  readonly catalog?: readonly CanonicalService[];
  readonly branches?: readonly MockBranchListing[];
}

export interface DiscoveryQueryResult {
  readonly canonicalService: CanonicalService | null;
  readonly resolution: ReturnType<typeof resolveDiagnosticQuery>;
  readonly center: Coordinates;
  readonly radiusKm: number;
  readonly branches: readonly DiscoveryBranchItem[];
}

export const DEFAULT_DISCOVERY_SERVICE_ID = 'complete-blood-count';
export const DEFAULT_DISCOVERY_CENTER: Coordinates = DHAKA_LANDMARKS.shahbagh.coordinates;

export function filterBranchesByQueryAndLocation(
  options: DiscoveryQueryFilterOptions = {}
): DiscoveryQueryResult {
  const catalog = options.catalog ?? DEFAULT_DIAGNOSTIC_CATALOG;
  const branches = options.branches ?? MOCK_BRANCH_LISTINGS;
  const center = options.center ?? DEFAULT_DISCOVERY_CENTER;
  const parsedRadius = parseRadiusFilterInput(options.radiusKm ?? 3);
  const radiusKm = parsedRadius.valid ? parsedRadius.radiusKm : 3;
  const resolution = resolveDiagnosticQuery(
    options.queryText ?? (options.serviceId === undefined ? 'Complete Blood Count' : ''),
    catalog
  );
  const service = options.serviceId !== undefined
    ? catalog.find((entry) => entry.id === options.serviceId)
    : resolution.status === 'resolved' && resolution.primaryMatch?.matchType !== 'typo_suggestion'
      ? resolution.primaryMatch?.canonicalService
      : undefined;

  if (!service) {
    return { canonicalService: null, resolution, center, radiusKm, branches: [] };
  }

  const candidates = branches.flatMap((branch) => {
    const price = branch.servicePrices.find((entry) => entry.serviceId === service.id);
    return price ? [{ ...branch, price }] : [];
  });
  const distanceResults = filterBranchesByRadius(candidates, { center, maxRadiusKm: radiusKm });
  const items: DiscoveryBranchItem[] = distanceResults.map(({ branch, distanceKm }) => ({
    id: branch.id,
    providerId: branch.providerId,
    providerName: branch.providerName,
    branchName: branch.branchName,
    address: branch.address,
    area: branch.area,
    coordinates: branch.coordinates,
    basePriceBdt: branch.price.basePriceBdt,
    priceVerifiedAt: branch.price.verifiedAt,
    priceSource: branch.price.priceSource,
    isSample: branch.isSample ?? false,
    isVerified: !branch.isSample && branch.price.verificationStatus === 'verified',
    straightLineDistanceKm: distanceKm,
    route: createUnavailableRouteResult(center, branch.coordinates, 'not_configured', 'Routing provider has not been configured.'),
  }));

  return { canonicalService: service, resolution, center, radiusKm, branches: items };
}
