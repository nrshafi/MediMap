/**
 * Result card displaying diagnostic branch pricing, verification, straight-line distance,
 * and fault-tolerant road travel estimates.
 */

import React, { useCallback } from 'react';
import type { BranchResultCardProps } from './types';

/**
 * Formats a currency value in Bangladeshi Taka (BDT).
 */
function formatBdt(amount: number | null): string {
  if (amount === null) return 'Price currently unavailable';
  return `BDT ${amount.toLocaleString('en-US')}`;
}

/**
 * Formats straight-line distance with explicit label to preserve metric separation.
 */
function formatStraightLineDistance(distanceKm: number): string {
  return `${distanceKm.toFixed(1)} km (straight-line)`;
}

export const BranchResultCard: React.FC<BranchResultCardProps> = ({
  branch,
  isSelected = false,
  isHovered = false,
  onSelect,
  onHover,
  id,
}) => {
  const cardId = id ?? `branch-card-${branch.id}`;

  const handleClick = useCallback(() => {
    onSelect?.(branch.id);
  }, [branch.id, onSelect]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect?.(branch.id);
      }
    },
    [branch.id, onSelect],
  );

  const handleMouseEnter = useCallback(() => {
    onHover?.(branch.id);
  }, [branch.id, onHover]);

  const handleMouseLeave = useCallback(() => {
    onHover?.(null);
  }, [onHover]);

  const handleFocus = useCallback(() => {
    onHover?.(branch.id);
  }, [branch.id, onHover]);

  const handleBlur = useCallback(() => {
    onHover?.(null);
  }, [onHover]);

  // Determine road travel metrics
  const routeAvailable = branch.route?.status === 'available';
  const isRouteExplicitlyUnavailable = branch.route?.status === 'unavailable';
  const roadKm = routeAvailable
    ? branch.route?.roadDistanceKm
    : isRouteExplicitlyUnavailable
      ? undefined
      : branch.roadDistanceKm;
  const durationMin = routeAvailable
    ? branch.route?.travelDurationMinutes
    : isRouteExplicitlyUnavailable
      ? undefined
      : branch.travelDurationMinutes;

  const hasRoadEstimate =
    typeof roadKm === 'number' &&
    typeof durationMin === 'number' &&
    Number.isFinite(roadKm) &&
    Number.isFinite(durationMin);

  return (
    <div
      id={cardId}
      data-testid="branch-result-card"
      role="article"
      aria-label={`${branch.providerName} - ${branch.branchName}`}
      aria-selected={isSelected}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={`medimap-branch-card ${
        isSelected ? 'is-selected branch-card--selected' : ''
      } ${isHovered ? 'is-hovered branch-card--hovered' : ''}`}
    >
      <div className="medimap-branch-card-header">
        <div className="medimap-branch-titles">
          <h3 className="medimap-branch-provider-name">{branch.providerName}</h3>
          <p className="medimap-branch-name">{branch.branchName}</p>
        </div>
        <div className="medimap-branch-price-block">
          <span className="medimap-branch-price-label">Base price</span>
          <span className="medimap-branch-price-value">{formatBdt(branch.basePriceBdt)}</span>
        </div>
      </div>

      <div className="medimap-branch-location-info">
        <span className="medimap-branch-area">
          <svg
            className="medimap-card-icon"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433 1.244-.77 2.87-2.072 4.148-3.924C16.804 12.553 18 9.948 18 7.5a8 8 0 10-16 0c0 2.448 1.196 5.053 2.48 6.928 1.278 1.852 2.904 3.155 4.148 3.924.31.193.571.337.757.433.098.05.18.091.24.122l.041.018.018.008.006.003zM10 10.5a3 3 0 100-6 3 3 0 000 6z"
              clipRule="evenodd"
            />
          </svg>
          {branch.area}
        </span>
        {branch.address && <span className="medimap-branch-address">{branch.address}</span>}
      </div>

      <div className="medimap-branch-metrics-grid">
        {/* Straight-line distance is always shown and labeled */}
        <div className="medimap-metric-badge medimap-metric-straight-line">
          <span className="medimap-metric-label">Distance:</span>
          <span className="medimap-metric-value">
            {formatStraightLineDistance(branch.straightLineDistanceKm)}
          </span>
        </div>

        {/* Fault-tolerant road travel estimates */}
        <div className="medimap-metric-badge medimap-metric-road">
          {hasRoadEstimate ? (
            <span className="medimap-metric-value">
              Road: {roadKm.toFixed(1)} km · ~{Math.round(durationMin)} mins
            </span>
          ) : (
            <span className="medimap-metric-value medimap-metric-unavailable">
              Road estimate unavailable
            </span>
          )}
        </div>
      </div>

      <div className="medimap-branch-card-footer">
        <div
          className={`medimap-verification-badge ${
            branch.isVerified ? 'is-verified' : 'is-unverified'
          }`}
        >
          {branch.isSample ? (
            <span>Sample price</span>
          ) : branch.isVerified ? (
            <>
              <svg
                className="medimap-badge-icon"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" />
              </svg>
              <span>Verified: {branch.priceVerifiedAt ?? 'Verification date unavailable'}</span>
            </>
          ) : (
            <span>Unverified: {branch.priceVerifiedAt ?? 'Verification date unavailable'}</span>
          )}
        </div>
        {branch.priceSource && <span>Source: {branch.priceSource}</span>}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(branch.id);
          }}
          className="medimap-card-select-btn"
          aria-label={`Select ${branch.providerName} ${branch.branchName}`}
        >
          {isSelected ? 'Selected' : 'View on map'}
        </button>
      </div>
    </div>
  );
};
