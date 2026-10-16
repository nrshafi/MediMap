/**
 * Accessible interactive Dhaka SVG map component.
 * Renders stylized Dhaka geographic reference elements, search radius indicators,
 * and synchronized branch pins with high-contrast accessibility states.
 */

import React, { useMemo, useState, useCallback } from 'react';
import type { Coordinates } from '../types';
import { computeAutoBounds, createMapProjector, type MapProjector } from './projection';
import type { DhakaMapProps, DiscoveryBranchItem } from './types';

/**
 * Illustrative water polylines for the Dhaka location schematic.
 */
const BURIGANGA_RIVER: Coordinates[] = [
  { latitude: 23.702, longitude: 90.350 },
  { latitude: 23.708, longitude: 90.365 },
  { latitude: 23.715, longitude: 90.380 },
  { latitude: 23.712, longitude: 90.400 },
  { latitude: 23.700, longitude: 90.418 },
  { latitude: 23.685, longitude: 90.435 },
  { latitude: 23.675, longitude: 90.450 },
];

const TURAG_RIVER: Coordinates[] = [
  { latitude: 23.880, longitude: 90.320 },
  { latitude: 23.850, longitude: 90.332 },
  { latitude: 23.815, longitude: 90.340 },
  { latitude: 23.785, longitude: 90.348 },
  { latitude: 23.760, longitude: 90.352 },
  { latitude: 23.740, longitude: 90.360 },
  { latitude: 23.715, longitude: 90.370 },
];

const HATIRJHEEL_LAKE: Coordinates[] = [
  { latitude: 23.768, longitude: 90.395 },
  { latitude: 23.774, longitude: 90.408 },
  { latitude: 23.771, longitude: 90.418 },
  { latitude: 23.777, longitude: 90.424 },
  { latitude: 23.788, longitude: 90.418 },
  { latitude: 23.798, longitude: 90.412 },
  { latitude: 23.805, longitude: 90.416 },
];

/**
 * Key Dhaka reference locations for landmark orientation.
 */
const DHAKA_DISTRICT_LABELS = [
  { name: 'Uttara', coords: { latitude: 23.8728, longitude: 90.3978 } },
  { name: 'Mirpur', coords: { latitude: 23.8071, longitude: 90.3686 } },
  { name: 'Gulshan', coords: { latitude: 23.7925, longitude: 90.4167 } },
  { name: 'Dhanmondi', coords: { latitude: 23.7461, longitude: 90.3742 } },
  { name: 'Shahbagh', coords: { latitude: 23.7388, longitude: 90.3957 } },
  { name: 'Old Dhaka', coords: { latitude: 23.7100, longitude: 90.4050 } },
];

/**
 * Helper to transform coordinate sequences into SVG polyline path strings.
 */
function coordsToPath(projector: MapProjector, coords: Coordinates[]): string {
  if (coords.length === 0) return '';
  return coords
    .map((c, i) => {
      const pt = projector.project(c);
      return `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`;
    })
    .join(' ');
}

export const DhakaMap: React.FC<DhakaMapProps> = ({
  branches,
  radiusKm,
  selectedBranchId,
  hoveredBranchId,
  centerCoordinates,
  onSelectBranch,
  onHoverBranch,
  className = '',
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Compute bounding box and projector
  const bounds = useMemo(() => {
    return computeAutoBounds(branches, centerCoordinates, 0.18);
  }, [branches, centerCoordinates]);

  const projector = useMemo(() => {
    return createMapProjector(bounds, { width: 800, height: 600, padding: 48 });
  }, [bounds]);

  // Dynamic viewBox calculation for zoom
  const viewBox = useMemo(() => {
    const baseW = 800;
    const baseH = 600;
    const w = baseW / zoomLevel;
    const h = baseH / zoomLevel;
    const x = (baseW - w) / 2;
    const y = (baseH - h) / 2;
    return `${x} ${y} ${w} ${h}`;
  }, [zoomLevel]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(3, Math.round((prev + 0.5) * 10) / 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(1, Math.round((prev - 0.5) * 10) / 10));
  }, []);

  const handleResetView = useCallback(() => {
    setZoomLevel(1);
  }, []);

  // Center point projection and radius guide circle
  const centerPoint = useMemo(() => {
    if (!centerCoordinates) return null;
    return projector.project(centerCoordinates);
  }, [centerCoordinates, projector]);

  const radiusCirclePx = useMemo(() => {
    if (!centerCoordinates || radiusKm === undefined || !Number.isFinite(radiusKm) || radiusKm <= 0) return 0;
    const offsetPoint = projector.project({
      latitude: centerCoordinates.latitude + (radiusKm / 6371) * (180 / Math.PI),
      longitude: centerCoordinates.longitude,
    });
    return Math.abs(offsetPoint.y - (centerPoint?.y ?? 0));
  }, [centerCoordinates, radiusKm, projector, centerPoint]);

  // Find active branch for tooltip display
  const activeBranch = useMemo<DiscoveryBranchItem | null>(() => {
    const activeId = hoveredBranchId || selectedBranchId;
    if (!activeId) return null;
    return branches.find((b) => b.id === activeId) ?? null;
  }, [branches, hoveredBranchId, selectedBranchId]);

  const activePoint = useMemo(() => {
    if (!activeBranch) return null;
    return projector.project(activeBranch.coordinates);
  }, [activeBranch, projector]);

  return (
    <section
      role="region"
      aria-label="Dhaka diagnostic branch map"
      tabIndex={0}
      className={`medimap-dhaka-map-section ${className}`}
    >
      <p>Location schematic. Geographic features are illustrative.</p>
      <div className="medimap-map-viewport-wrapper">
        <svg
          viewBox={viewBox}
          className="medimap-dhaka-svg"
          role="group"
          aria-label="Dhaka location schematic showing diagnostic branch locations"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Map canvas background */}
          <rect
            width="800"
            height="600"
            fill="var(--bg-base)"
            className="medimap-map-canvas-bg"
          />

          {/* Coordinate grid lines */}
          <g className="medimap-map-grid" role="presentation">
            <line x1="100" y1="0" x2="100" y2="600" stroke="var(--border-default)" strokeWidth="0.8" strokeDasharray="4 4" />
            <line x1="300" y1="0" x2="300" y2="600" stroke="var(--border-default)" strokeWidth="0.8" strokeDasharray="4 4" />
            <line x1="500" y1="0" x2="500" y2="600" stroke="var(--border-default)" strokeWidth="0.8" strokeDasharray="4 4" />
            <line x1="700" y1="0" x2="700" y2="600" stroke="var(--border-default)" strokeWidth="0.8" strokeDasharray="4 4" />
            <line x1="0" y1="150" x2="800" y2="150" stroke="var(--border-default)" strokeWidth="0.8" strokeDasharray="4 4" />
            <line x1="0" y1="300" x2="800" y2="300" stroke="var(--border-default)" strokeWidth="0.8" strokeDasharray="4 4" />
            <line x1="0" y1="450" x2="800" y2="450" stroke="var(--border-default)" strokeWidth="0.8" strokeDasharray="4 4" />
          </g>

          {/* Stylized Dhaka water bodies */}
          <g className="medimap-water-bodies" role="presentation">
            {/* Buriganga River */}
            <path
              d={coordsToPath(projector, BURIGANGA_RIVER)}
              fill="none"
              stroke="#b5d6d2"
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.8"
            />
            {/* Turag River */}
            <path
              d={coordsToPath(projector, TURAG_RIVER)}
              fill="none"
              stroke="#b5d6d2"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.8"
            />
            {/* Hatirjheel & Gulshan Lake */}
            <path
              d={coordsToPath(projector, HATIRJHEEL_LAKE)}
              fill="none"
              stroke="#b5d6d2"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.8"
            />
          </g>

          {/* Dhaka District Reference Labels */}
          <g className="medimap-district-labels" role="presentation">
            {DHAKA_DISTRICT_LABELS.map((item) => {
              const pt = projector.project(item.coords);
              return (
                <text
                  key={item.name}
                  x={pt.x}
                  y={pt.y}
                  textAnchor="middle"
                  fill="var(--text-muted)"
                  fontSize="11"
                  fontWeight="500"
                  fontStyle="italic"
                  opacity="0.6"
                >
                  {item.name}
                </text>
              );
            })}
          </g>

          {/* Search center marker and straight-line radius guide */}
          {centerPoint && (
            <g
              className="medimap-search-center-group"
              role="img"
              aria-label="Search center location and straight-line radius"
            >
              {radiusCirclePx > 0 && (
                <circle
                  cx={centerPoint.x}
                  cy={centerPoint.y}
                  r={radiusCirclePx}
                  fill="rgba(17, 124, 115, 0.05)"
                  stroke="var(--accent-primary)"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                />
              )}
              {/* Outer pulse circle */}
              <circle
                cx={centerPoint.x}
                cy={centerPoint.y}
                r="10"
                fill="none"
                stroke="var(--accent-primary)"
                strokeWidth="1.5"
                opacity="0.5"
              />
              {/* Center point pin */}
              <circle
                cx={centerPoint.x}
                cy={centerPoint.y}
                r="4.5"
                fill="var(--accent-primary)"
              />
            </g>
          )}

          {/* Branch Interactive Map Pins */}
          <g className="medimap-branch-pins-layer">
            {branches.map((branch, index) => {
              const pt = projector.project(branch.coordinates);
              const isSelected = branch.id === selectedBranchId;
              const isHovered = branch.id === hoveredBranchId;
              const badgeNumber = index + 1;

              return (
                <g
                  key={branch.id}
                  role="button"
                  tabIndex={0}
                  data-testid={`map-pin-${branch.id}`}
                  aria-label={`${branch.providerName} - ${branch.branchName}. ${branch.basePriceBdt === null ? 'Price currently unavailable' : `BDT ${branch.basePriceBdt}`}. ${branch.straightLineDistanceKm.toFixed(1)} km straight-line.`}
                  aria-pressed={isSelected}
                  aria-expanded={isSelected}
                  onClick={() => onSelectBranch?.(branch.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectBranch?.(branch.id);
                    }
                  }}
                  onMouseEnter={() => onHoverBranch?.(branch.id)}
                  onMouseLeave={() => onHoverBranch?.(null)}
                  onFocus={() => onHoverBranch?.(branch.id)}
                  onBlur={() => onHoverBranch?.(null)}
                  className={`medimap-pin-group ${
                    isSelected ? 'is-selected map-pin--selected' : ''
                  } ${isHovered ? 'is-hovered map-pin--hovered' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  {/* 44px minimum touch target hit circle (radius 22px) */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={22}
                    fill="transparent"
                    pointerEvents="all"
                  />

                  {/* Outer selection ring */}
                  {isSelected && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={20}
                      fill="none"
                      stroke="var(--accent-primary)"
                      strokeWidth="3"
                      opacity="0.85"
                    />
                  )}

                  {/* Pin Body */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 16 : isHovered ? 15 : 13}
                    fill={
                      isSelected
                        ? 'var(--text-primary)'
                        : isHovered
                        ? 'var(--accent-primary)'
                        : 'var(--bg-surface)'
                    }
                    stroke={
                      isSelected
                        ? '#ffffff'
                        : isHovered
                        ? '#ffffff'
                        : 'var(--accent-primary)'
                    }
                    strokeWidth={isSelected || isHovered ? 2.5 : 2}
                  />

                  {/* Pin Index Number */}
                  <text
                    x={pt.x}
                    y={pt.y + 4}
                    textAnchor="middle"
                    fontSize={isSelected ? '12' : '11'}
                    fontWeight="700"
                    fill={
                      isSelected || isHovered
                        ? '#ffffff'
                        : 'var(--text-primary)'
                    }
                    pointerEvents="none"
                  >
                    {badgeNumber}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Floating Tooltip Bubble for Active Branch */}
          {activeBranch && activePoint && (
            <g
              className="medimap-map-tooltip-group"
              transform={`translate(${activePoint.x}, ${activePoint.y - 34})`}
              pointerEvents="none"
              role="presentation"
            >
              <rect
                x="-80"
                y="-32"
                width="160"
                height="32"
                rx="6"
                fill="var(--text-primary)"
                opacity="0.95"
              />
              <polygon
                points="0,0 -6,-6 6,-6"
                fill="var(--text-primary)"
                opacity="0.95"
              />
              <text
                x="0"
                y="-18"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="10"
                fontWeight="600"
              >
                {activeBranch.providerName.length > 20
                  ? `${activeBranch.providerName.slice(0, 19)}…`
                  : activeBranch.providerName}
              </text>
              <text
                x="0"
                y="-6"
                textAnchor="middle"
                fill="#a3e3db"
                fontSize="9"
                fontWeight="700"
              >
                {activeBranch.basePriceBdt === null ? 'Price unavailable' : `BDT ${activeBranch.basePriceBdt.toLocaleString('en-US')}`}
              </text>
            </g>
          )}
        </svg>

        {/* Map Controls Toolbar */}
        <div
          className="medimap-map-controls"
          role="toolbar"
          aria-label="Map view and zoom controls"
        >
          <button
            type="button"
            onClick={handleZoomIn}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleZoomIn();
              }
            }}
            aria-label="Zoom in"
            disabled={zoomLevel >= 3}
            className="medimap-control-btn"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleZoomOut();
              }
            }}
            aria-label="Zoom out"
            disabled={zoomLevel <= 1}
            className="medimap-control-btn"
          >
            −
          </button>
          <button
            type="button"
            onClick={handleResetView}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleResetView();
              }
            }}
            aria-label="Reset map view"
            className="medimap-control-btn"
          >
            ⟲
          </button>
        </div>
      </div>
    </section>
  );
};
