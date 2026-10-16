/**
 * Discovery page view coordinating diagnostic service search, Dhaka location presets,
 * straight-line radius filtering, and synchronized map/list presentation.
 */

import React, { useCallback, useMemo } from 'react';
import { isValidCoordinate } from '../../map/coordinates';
import { parseRadiusFilterInput } from '../../map/radiusFilter';
import type { Coordinates } from '../../map/types';
import { SynchronizedDiscoveryView } from '../../map/ui';
import {
  DEFAULT_DISCOVERY_CENTER,
  DHAKA_LOCATION_PRESETS,
  filterBranchesByQueryAndLocation,
} from '../discoveryData';
import { DiagnosticSearchBox } from './DiagnosticSearchBox';
import type { SearchSelection } from './types';
import './discoveryView.css';

export interface DiscoveryViewProps {
  readonly query?: string;
  readonly q?: string;
  readonly lat?: number;
  readonly lng?: number;
  readonly radius?: number;
  readonly selectedBranchId?: string;
  readonly onSearchChange?: (params: {
    query?: string;
    radius?: number;
    lat?: number;
    lng?: number;
    selectedBranchId?: string;
  }) => void;
  readonly className?: string;
}

/**
 * Integrated discovery view presenting the full end-to-end diagnostic search experience.
 */
export const DiscoveryView: React.FC<DiscoveryViewProps> = ({
  query,
  q,
  lat,
  lng,
  radius,
  selectedBranchId,
  onSearchChange,
  className = '',
}) => {
  const activeQuery = query ?? q ?? 'Complete Blood Count';
  const parsedRadius = parseRadiusFilterInput(radius ?? 3);
  const activeRadius = parsedRadius.valid ? parsedRadius.radiusKm : 3;

  // Resolve center coordinates with fallback to Shahbagh
  const centerCoordinates: Coordinates = useMemo(() => {
    if (
      lat !== undefined &&
      lng !== undefined &&
      isValidCoordinate({ latitude: lat, longitude: lng })
    ) {
      return { latitude: lat, longitude: lng };
    }
    return DEFAULT_DISCOVERY_CENTER;
  }, [lat, lng]);

  // Match current coordinates to a recognized landmark preset
  const activePreset = useMemo(() => {
    return DHAKA_LOCATION_PRESETS.find(
      (preset) =>
        Math.abs(preset.coordinates.latitude - centerCoordinates.latitude) < 0.001 &&
        Math.abs(preset.coordinates.longitude - centerCoordinates.longitude) < 0.001
    );
  }, [centerCoordinates]);

  // Compute filtered diagnostic branches
  const queryResult = useMemo(() => {
    return filterBranchesByQueryAndLocation({
      queryText: activeQuery,
      center: centerCoordinates,
      radiusKm: activeRadius,
    });
  }, [activeQuery, centerCoordinates, activeRadius]);

  const { canonicalService, branches } = queryResult;

  // Handle service selection from combobox
  const handleSelectService = useCallback(
    (selection: SearchSelection) => {
      onSearchChange?.({
        query: selection.canonicalService.name,
        radius: selection.radiusKm,
        lat: centerCoordinates.latitude,
        lng: centerCoordinates.longitude,
        selectedBranchId: undefined,
      });
    },
    [centerCoordinates, onSearchChange]
  );

  // Handle branch card or map pin selection
  const handleSelectBranch = useCallback(
    (branchId: string) => {
      onSearchChange?.({
        query: activeQuery,
        radius: activeRadius,
        lat: centerCoordinates.latitude,
        lng: centerCoordinates.longitude,
        selectedBranchId: branchId,
      });
    },
    [activeQuery, activeRadius, centerCoordinates, onSearchChange]
  );

  // Handle preset location switch
  const handleSelectPreset = useCallback(
    (presetCoordinates: Coordinates) => {
      onSearchChange?.({
        query: activeQuery,
        radius: activeRadius,
        lat: presetCoordinates.latitude,
        lng: presetCoordinates.longitude,
        selectedBranchId: undefined,
      });
    },
    [activeQuery, activeRadius, onSearchChange]
  );

  // Update the radius without selecting a service.
  const handleRadiusChange = useCallback(
    (newRadius: number) => {
      onSearchChange?.({
        query: activeQuery,
        radius: newRadius,
        lat: centerCoordinates.latitude,
        lng: centerCoordinates.longitude,
        selectedBranchId: undefined,
      });
    },
    [activeQuery, centerCoordinates, onSearchChange]
  );

  const locationDisplayLabel = activePreset
    ? activePreset.name
    : `${centerCoordinates.latitude.toFixed(3)}°N, ${centerCoordinates.longitude.toFixed(3)}°E`;

  return (
    <div className={`medimap-discovery-page ${className}`.trim()}>
      {/* Header bar */}
      <header className="medimap-discovery-header" role="banner">
        <div className="medimap-discovery-nav">
          <div className="medimap-discovery-brand">
            <svg
              className="medimap-discovery-brand-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 21s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 7.2c0 7.3-8 11.8-8 11.8z" />
              <circle cx="12" cy="9" r="3" />
            </svg>
            <span className="medimap-discovery-brand-text">MediMap</span>
          </div>
          <span className="medimap-discovery-tagline">
            Dhaka diagnostic service discovery preview
          </span>
        </div>
      </header>

      {/* Main content body */}
      <main className="medimap-discovery-main" role="main">
        <p className="medimap-sample-notice" role="note">
          Demonstration with sample data. Prices, availability, and branch details have not been verified.
          Road estimates are unavailable until a routing provider is configured.
        </p>
        {/* Diagnostic Search Box */}
        <section
          className="medimap-discovery-search-section"
          aria-label="Diagnostic search criteria"
        >
          <DiagnosticSearchBox
            initialQuery={activeQuery}
            initialRadiusKm={activeRadius}
            onSelectService={handleSelectService}
            onQueryChange={(nextQuery) => onSearchChange?.({
              query: nextQuery,
              radius: activeRadius,
              lat: centerCoordinates.latitude,
              lng: centerCoordinates.longitude,
              selectedBranchId: undefined,
            })}
            onRadiusChange={handleRadiusChange}
          />
        </section>

        {/* Location Presets Selector */}
        <section
          className="medimap-preset-selector"
          aria-label="Dhaka reference location presets"
        >
          <div className="medimap-preset-header">
            <svg
              className="medimap-preset-icon"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                clipRule="evenodd"
              />
            </svg>
            <h3 className="medimap-preset-title">Select Center Location</h3>
            <span className="medimap-preset-hint">
              (Preset transit hubs and urban centers across Dhaka)
            </span>
          </div>

          <div
            className="medimap-preset-buttons"
            role="group"
            aria-label="Dhaka landmark location presets"
          >
            {DHAKA_LOCATION_PRESETS.map((preset) => {
              const isSelected = activePreset?.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.coordinates)}
                  className={`medimap-preset-btn ${isSelected ? 'is-active' : ''}`}
                  aria-pressed={isSelected}
                  aria-label={`Set location to ${preset.name} (${preset.area})`}
                >
                  {preset.name}
                </button>
              );
            })}
          </div>
        </section>

        {/* Active Filters Context Banner */}
        <section
          className="medimap-active-filters-bar"
          aria-label="Active search filters and result summary"
        >
          <div className="medimap-active-filters-left">
            <span className="medimap-filter-chip medimap-filter-chip-service">
              Test: <strong>{canonicalService?.name ?? 'Select a diagnostic service'}</strong>
            </span>
            <span className="medimap-filter-chip medimap-filter-chip-radius">
              Straight-line radius: <strong>{activeRadius} km</strong>
            </span>
            <span className="medimap-filter-chip medimap-filter-chip-location">
              From: <strong>{locationDisplayLabel}</strong>
            </span>
          </div>
          <div className="medimap-active-filters-count">
            {branches.length === 1
              ? '1 sample branch found'
              : `${branches.length} sample branches found`}
          </div>
        </section>

        {/* Empty state or Synchronized Discovery View */}
        {!canonicalService ? (
          <section className="medimap-discovery-empty-state" role="status">
            <h2>
              {queryResult.resolution.requiresExplicitSelection
                ? 'Select a diagnostic service to continue'
                : queryResult.resolution.typoSuggestions?.length
                  ? 'Select a suggested service to continue'
                  : 'No matching diagnostic service'}
            </h2>
            <p>Use the search controls to select a service. No branch results are shown for this query.</p>
          </section>
        ) : branches.length === 0 ? (
          <section
            className="medimap-discovery-empty-state"
            aria-label="No branches found"
            role="region"
          >
            <div className="medimap-empty-state-icon">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <h3 className="medimap-empty-state-title">
              No diagnostic branches within {activeRadius} km straight-line radius
            </h3>
            <p className="medimap-empty-state-desc">
              No sample branches offering <strong>{canonicalService.name}</strong> were
              found within {activeRadius} km straight-line distance of {locationDisplayLabel}.
              Try expanding your search radius or selecting a different location.
            </p>
            <div className="medimap-empty-state-actions">
              {activeRadius < 5 && (
                <button
                  type="button"
                  className="medimap-empty-action-btn"
                  onClick={() => handleRadiusChange(5)}
                >
                  Expand radius to 5 km
                </button>
              )}
              {activeRadius < 10 && (
                <button
                  type="button"
                  className="medimap-empty-action-btn medimap-empty-action-btn-secondary"
                  onClick={() => handleRadiusChange(10)}
                >
                  Expand radius to 10 km
                </button>
              )}
              {activePreset?.id !== 'shahbagh' && (
                <button
                  type="button"
                  className="medimap-empty-action-btn medimap-empty-action-btn-secondary"
                  onClick={() => handleSelectPreset(DEFAULT_DISCOVERY_CENTER)}
                >
                  Reset to Central Dhaka (Shahbagh)
                </button>
              )}
            </div>
          </section>
        ) : (
          <section
            className="medimap-discovery-results-section"
            aria-label="Diagnostic branches map and results list"
          >
            <SynchronizedDiscoveryView
              branches={branches}
              centerCoordinates={centerCoordinates}
              selectedBranchId={selectedBranchId ?? null}
              radiusKm={activeRadius}
              onSelectBranch={handleSelectBranch}
            />
          </section>
        )}
      </main>

      {/* Footer with architecture invariants reference */}
      <footer className="medimap-discovery-footer" role="contentinfo">
        <div className="medimap-discovery-footer-content">
          <span>MediMap discovery preview · Sample prices in BDT</span>
          <div className="medimap-footer-invariants">
            <span>Prices in BDT</span>
            <span className="medimap-footer-dot">·</span>
            <span>Straight-line radius eligibility</span>
            <span className="medimap-footer-dot">·</span>
            <span>Distinct road estimates</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
