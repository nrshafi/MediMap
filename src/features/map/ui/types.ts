/**
 * Domain types and component prop contracts for synchronized map and list discovery view.
 */

import type { Coordinates } from '../types';
import type { RouteResult } from '../../../integrations/mapping/types';

/**
 * Diagnostic branch item prepared for discovery view presentation.
 * Retains all price, verification, coordinate, and distance metrics.
 */
export interface DiscoveryBranchItem {
  readonly id: string;
  readonly providerId?: string;
  readonly providerName: string;
  readonly branchName: string;
  readonly address?: string;
  readonly area: string;
  readonly coordinates: Coordinates;
  readonly basePriceBdt: number;
  readonly priceVerifiedAt: string;
  readonly isVerified: boolean;
  readonly straightLineDistanceKm: number;
  readonly route?: RouteResult;
  readonly roadDistanceKm?: number;
  readonly travelDurationMinutes?: number;
}

/**
 * Mobile view toggle mode between list and map presentations.
 */
export type MobileViewMode = 'list' | 'map';

/**
 * Source of branch selection to govern scroll-into-view behavior.
 */
export type InteractionSource = 'map' | 'list' | null;

/**
 * Props for the interactive Dhaka SVG map.
 */
export interface DhakaMapProps {
  readonly branches: readonly DiscoveryBranchItem[];
  readonly selectedBranchId?: string | null;
  readonly hoveredBranchId?: string | null;
  readonly centerCoordinates?: Coordinates | null;
  readonly onSelectBranch?: (branchId: string) => void;
  readonly onHoverBranch?: (branchId: string | null) => void;
  readonly className?: string;
}

/**
 * Props for an individual branch result card.
 */
export interface BranchResultCardProps {
  readonly branch: DiscoveryBranchItem;
  readonly isSelected?: boolean;
  readonly isHovered?: boolean;
  readonly onSelect?: (branchId: string) => void;
  readonly onHover?: (branchId: string | null) => void;
  readonly id?: string;
}

/**
 * Props for the branch results list container.
 */
export interface BranchListProps {
  readonly branches: readonly DiscoveryBranchItem[];
  readonly selectedBranchId?: string | null;
  readonly hoveredBranchId?: string | null;
  readonly onSelectBranch?: (branchId: string) => void;
  readonly onHoverBranch?: (branchId: string | null) => void;
  readonly interactionSource?: InteractionSource;
}

/**
 * Props for the top-level synchronized discovery view.
 */
export interface SynchronizedDiscoveryViewProps {
  readonly branches: readonly DiscoveryBranchItem[];
  readonly centerCoordinates?: Coordinates | null;
  readonly selectedBranchId?: string | null;
  readonly onSelectBranch?: (branchId: string, source?: InteractionSource) => void;
  readonly initialViewMode?: MobileViewMode;
  readonly className?: string;
}
