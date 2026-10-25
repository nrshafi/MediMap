/**
 * Synchronized map and list discovery view coordinating selection, hover states,
 * desktop split-view layout, and mobile segmented toggling.
 */

import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { BranchList } from './BranchList';
import { DhakaMap } from './DhakaMap';
import type {
  DiscoveryBranchItem,
  InteractionSource,
  MobileViewMode,
  SynchronizedDiscoveryViewProps,
} from './types';

export const SynchronizedDiscoveryView: React.FC<SynchronizedDiscoveryViewProps> = ({
  branches,
  radiusKm,
  centerCoordinates = null,
  selectedBranchId: controlledSelectedId,
  onSelectBranch,
  initialViewMode = 'list',
  className = '',
}) => {
  const liveRegionId = useId();
  const viewId = useId();
  const listTabId = `${viewId}-tab-list`;
  const mapTabId = `${viewId}-tab-map`;
  const listPanelId = `${viewId}-panel-list`;
  const mapPanelId = `${viewId}-panel-map`;

  // Internal selection state for uncontrolled mode
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [dismissedBranchId, setDismissedBranchId] = useState<string | null>(null);
  const selectedBranchId =
    controlledSelectedId !== undefined ? controlledSelectedId : internalSelectedId;
  useEffect(() => {
    setDismissedBranchId(null);
  }, [selectedBranchId]);

  // Hover and interaction source states
  const [hoveredBranchId, setHoveredBranchId] = useState<string | null>(null);
  const [interactionSource, setInteractionSource] = useState<InteractionSource>(null);

  // Mobile segmented control view mode
  const [mobileViewMode, setMobileViewMode] = useState<MobileViewMode>(initialViewMode);
  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    let nextMode: MobileViewMode;
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowRight':
        nextMode = mobileViewMode === 'list' ? 'map' : 'list';
        break;
      case 'Home':
        nextMode = 'list';
        break;
      case 'End':
        nextMode = 'map';
        break;
      default:
        return;
    }
    event.preventDefault();
    setMobileViewMode(nextMode);
    document.getElementById(nextMode === 'list' ? listTabId : mapTabId)?.focus();
  };

  // Find currently selected branch
  const selectedBranch = useMemo<DiscoveryBranchItem | null>(() => {
    if (!selectedBranchId) return null;
    return branches.find((b) => b.id === selectedBranchId) ?? null;
  }, [branches, selectedBranchId]);

  // Live region announcement string
  const announcementText = useMemo(() => {
    if (!selectedBranch) return '';
    const price =
      selectedBranch.basePriceBdt === null
        ? 'Price currently unavailable'
        : `Base price BDT ${selectedBranch.basePriceBdt.toLocaleString('en-US')}`;
    return `Selected ${selectedBranch.providerName}, ${selectedBranch.branchName}. ${price}. ${selectedBranch.straightLineDistanceKm.toFixed(1)} km straight-line distance.`;
  }, [selectedBranch]);

  // Handle branch selection from map
  const handleSelectFromMap = useCallback(
    (branchId: string) => {
      setDismissedBranchId(null);
      setInteractionSource('map');
      if (controlledSelectedId === undefined) {
        setInternalSelectedId(branchId);
      }
      onSelectBranch?.(branchId, 'map');
    },
    [controlledSelectedId, onSelectBranch],
  );

  // Handle branch selection from list
  const handleSelectFromList = useCallback(
    (branchId: string) => {
      setDismissedBranchId(null);
      setInteractionSource('list');
      if (controlledSelectedId === undefined) {
        setInternalSelectedId(branchId);
      }
      onSelectBranch?.(branchId, 'list');
    },
    [controlledSelectedId, onSelectBranch],
  );

  // Dismiss floating card on mobile
  const handleDismissFloatingCard = useCallback(() => {
    setDismissedBranchId(selectedBranchId ?? null);
    if (controlledSelectedId === undefined) {
      setInternalSelectedId(null);
    }
  }, [controlledSelectedId, selectedBranchId]);

  // Switch to list view and inspect card
  const handleViewInList = useCallback(() => {
    setMobileViewMode('list');
    setInteractionSource('map');
    if (selectedBranchId && typeof document !== 'undefined') {
      const cardElement = document.getElementById(`branch-card-${selectedBranchId}`);
      if (cardElement && typeof cardElement.scrollIntoView === 'function') {
        cardElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [selectedBranchId]);

  return (
    <section
      className={`medimap-discovery-view ${className}`}
      aria-label="Synchronized diagnostic branch discovery"
      data-active-view={mobileViewMode}
    >
      {/* Screen-reader live region for selection announcements */}
      <div
        id={liveRegionId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="medimap-sr-only"
      >
        {announcementText}
      </div>

      {/* Mobile view switch header */}
      <div
        className="medimap-mobile-toggle-bar"
        role="tablist"
        aria-label="Select results view format"
        data-active-view={mobileViewMode}
      >
        <button
          type="button"
          role="tab"
          id={listTabId}
          aria-selected={mobileViewMode === 'list'}
          aria-controls={listPanelId}
          tabIndex={mobileViewMode === 'list' ? 0 : -1}
          onKeyDown={handleTabKeyDown}
          onClick={() => setMobileViewMode('list')}
          className={`medimap-mobile-tab-btn ${mobileViewMode === 'list' ? 'is-active' : ''}`}
        >
          <svg
            className="medimap-tab-icon"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
              clipRule="evenodd"
            />
          </svg>
          List ({branches.length})
        </button>
        <button
          type="button"
          role="tab"
          id={mapTabId}
          aria-selected={mobileViewMode === 'map'}
          aria-controls={mapPanelId}
          tabIndex={mobileViewMode === 'map' ? 0 : -1}
          onKeyDown={handleTabKeyDown}
          onClick={() => setMobileViewMode('map')}
          className={`medimap-mobile-tab-btn ${mobileViewMode === 'map' ? 'is-active' : ''}`}
        >
          <svg
            className="medimap-tab-icon"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.553.894l4 2A1 1 0 008 16.5V3.672L3.707 3.293zm12.586 0L12 3.672V16.5a1 1 0 001.447.394l4-2A1 1 0 0018 14V4a1 1 0 00-1.707-.707z"
              clipRule="evenodd"
            />
          </svg>
          Map
        </button>
      </div>

      {/* Main synchronized 2-column container */}
      <div className={`medimap-discovery-grid mobile-mode-${mobileViewMode}`}>
        {/* Branch List Panel */}
        <div
          id={listPanelId}
          role="tabpanel"
          aria-labelledby={listTabId}
          className={`medimap-discovery-list-col ${
            mobileViewMode === 'list' ? 'is-visible' : 'is-hidden-mobile'
          }`}
        >
          <BranchList
            branches={branches}
            selectedBranchId={selectedBranchId}
            hoveredBranchId={hoveredBranchId}
            onSelectBranch={handleSelectFromList}
            onHoverBranch={setHoveredBranchId}
            interactionSource={interactionSource}
          />
        </div>

        {/* Dhaka Map Panel */}
        <div
          id={mapPanelId}
          role="tabpanel"
          aria-labelledby={mapTabId}
          className={`medimap-discovery-map-col ${
            mobileViewMode === 'map' ? 'is-visible' : 'is-hidden-mobile'
          }`}
        >
          <div className="medimap-sticky-map-wrapper">
            <DhakaMap
              radiusKm={radiusKm}
              branches={branches}
              selectedBranchId={selectedBranchId}
              hoveredBranchId={hoveredBranchId}
              centerCoordinates={centerCoordinates}
              onSelectBranch={handleSelectFromMap}
              onHoverBranch={setHoveredBranchId}
            />

            {/* Floating Mobile Summary Card when a pin is selected in mobile map mode */}
            {selectedBranch && selectedBranch.id !== dismissedBranchId && (
              <div
                className="medimap-floating-summary-card"
                role="dialog"
                aria-label={`Selected branch: ${selectedBranch.branchName}`}
                data-testid="mobile-floating-summary"
              >
                <div className="medimap-floating-card-body">
                  <div className="medimap-floating-card-info">
                    <h4 className="medimap-floating-title">{selectedBranch.providerName}</h4>
                    <p className="medimap-floating-subtitle">
                      {selectedBranch.branchName} · {selectedBranch.area}
                    </p>
                    <div className="medimap-floating-metrics">
                      <span className="medimap-floating-price">
                        {selectedBranch.basePriceBdt === null
                          ? 'Price currently unavailable'
                          : `BDT ${selectedBranch.basePriceBdt.toLocaleString('en-US')}`}
                      </span>
                      <span className="medimap-floating-dist">
                        {selectedBranch.straightLineDistanceKm.toFixed(1)} km straight-line
                      </span>
                    </div>
                  </div>
                  <div className="medimap-floating-actions">
                    <button
                      type="button"
                      onClick={handleViewInList}
                      className="medimap-floating-view-btn"
                    >
                      View in list
                    </button>
                    <button
                      type="button"
                      onClick={handleDismissFloatingCard}
                      className="medimap-floating-close-btn"
                      aria-label="Dismiss branch summary"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
