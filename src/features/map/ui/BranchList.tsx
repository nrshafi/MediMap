/**
 * Scrollable list container displaying diagnostic branch result cards with automatic
 * scroll-into-view when a branch is selected from the map.
 */

import React, { useEffect, useRef } from 'react';
import { BranchResultCard } from './BranchResultCard';
import type { BranchListProps } from './types';

export const BranchList: React.FC<BranchListProps> = ({
  branches,
  selectedBranchId,
  hoveredBranchId,
  onSelectBranch,
  onHoverBranch,
  interactionSource,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Smoothly scroll the selected branch card into view when triggered from the map
  useEffect(() => {
    if (selectedBranchId && interactionSource === 'map') {
      if (typeof document !== 'undefined') {
        const cardElement = document.getElementById(`branch-card-${selectedBranchId}`);
        if (cardElement && typeof cardElement.scrollIntoView === 'function') {
          cardElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
        }
      }
    }
  }, [selectedBranchId, interactionSource]);

  if (branches.length === 0) {
    return (
      <div className="medimap-branch-list-empty" data-testid="branch-list-empty" role="status">
        <div className="medimap-empty-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
        </div>
        <h4 className="medimap-empty-title">
          No diagnostic branches found within the selected radius.
        </h4>
        <p className="medimap-empty-desc">
          Try expanding the straight-line radius or adjusting your search location.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="medimap-branch-list-container"
      role="region"
      aria-label="Diagnostic branches list"
    >
      <div className="medimap-branch-list-header">
        <h2 className="medimap-branch-count-heading">
          Branches found within radius: {branches.length}
        </h2>
      </div>

      <div className="medimap-branch-cards-stack" role="feed" aria-busy="false">
        {branches.map((branch) => (
          <BranchResultCard
            key={branch.id}
            branch={branch}
            isSelected={branch.id === selectedBranchId}
            isHovered={branch.id === hoveredBranchId}
            onSelect={onSelectBranch}
            onHover={onHoverBranch}
          />
        ))}
      </div>
    </div>
  );
};
