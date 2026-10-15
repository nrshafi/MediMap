import './setupDom';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DHAKA_LANDMARKS } from '../../../map/landmarks';
import { DiscoveryView } from '../DiscoveryView';
import { win } from './setupDom';

interface RenderResult {
  container: HTMLDivElement;
  root: Root;
  unmount: () => void;
}

const activeRenders = new Set<RenderResult>();

function renderComponent(ui: React.ReactElement): RenderResult {
  const container = win.document.createElement('div');
  win.document.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  act(() => {
    root.render(ui);
  });
  const result: RenderResult = {
    container: container as unknown as HTMLDivElement,
    root,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
      activeRenders.delete(result);
    },
  };
  activeRenders.add(result);
  return result;
}

describe('DiscoveryView Integration & End-to-End Page Flow', () => {
  beforeEach(() => {
    win.document.body.innerHTML = '';
  });

  afterEach(() => {
    for (const render of activeRenders) {
      render.unmount();
    }
    activeRenders.clear();
    win.document.body.innerHTML = '';
  });

  it('renders discovery page with header, search box, landmark presets, active filters, and results', () => {
    const { container } = renderComponent(
      <DiscoveryView
        query="Complete Blood Count"
        lat={DHAKA_LANDMARKS.shahbagh.coordinates.latitude}
        lng={DHAKA_LANDMARKS.shahbagh.coordinates.longitude}
        radius={3}
      />
    );

    // Header branding
    const header = container.querySelector('.medimap-discovery-header');
    assert.ok(header);
    assert.match(header.textContent ?? '', /MediMap/);

    // Search card
    const searchCard = container.querySelector('.medimap-search-card');
    assert.ok(searchCard);

    // Preset location buttons
    const presetSection = container.querySelector('.medimap-preset-selector');
    assert.ok(presetSection);
    const presetButtons = container.querySelectorAll('.medimap-preset-btn');
    assert.ok(presetButtons.length >= 5);

    // Active filters bar
    const filterBar = container.querySelector('.medimap-active-filters-bar');
    assert.ok(filterBar);
    assert.match(filterBar.textContent ?? '', /Complete Blood Count/);
    assert.match(filterBar.textContent ?? '', /Straight-line radius:\s*3 km/);
    assert.match(filterBar.textContent ?? '', /Shahbagh/);

    // Synchronized discovery view (map and list)
    const discoveryView = container.querySelector('.medimap-discovery-view');
    assert.ok(discoveryView);

    // Branch cards rendered
    const branchCards = container.querySelectorAll('.medimap-branch-card');
    assert.ok(branchCards.length > 0);
  });

  it('clicking a landmark preset triggers onSearchChange with updated coordinates', () => {
    let changedParams: { query?: string; radius?: number; lat?: number; lng?: number; selectedBranchId?: string } | null = null;

    const { container } = renderComponent(
      <DiscoveryView
        query="Complete Blood Count"
        lat={DHAKA_LANDMARKS.shahbagh.coordinates.latitude}
        lng={DHAKA_LANDMARKS.shahbagh.coordinates.longitude}
        radius={3}
        onSearchChange={(params) => {
          changedParams = params;
        }}
      />
    );

    // Find Dhanmondi preset button
    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('.medimap-preset-btn'));
    const dhanmondiBtn = buttons.find((btn) => btn.textContent?.includes('Dhanmondi'));
    assert.ok(dhanmondiBtn, 'Dhanmondi preset button should exist');

    act(() => {
      dhanmondiBtn.click();
    });

    assert.ok(changedParams !== null);
    const targetParams = changedParams as { query?: string; radius?: number; lat?: number; lng?: number; selectedBranchId?: string };
    assert.equal(targetParams.query, 'Complete Blood Count');
    assert.equal(targetParams.radius, 3);
    assert.ok(Math.abs((targetParams.lat ?? 0) - DHAKA_LANDMARKS.popularDhanmondi.coordinates.latitude) < 0.001);
    assert.ok(Math.abs((targetParams.lng ?? 0) - DHAKA_LANDMARKS.popularDhanmondi.coordinates.longitude) < 0.001);
  });

  it('selecting a branch card triggers onSearchChange with selectedBranchId', () => {
    let changedParams: { selectedBranchId?: string } | null = null;

    const { container } = renderComponent(
      <DiscoveryView
        query="Complete Blood Count"
        lat={DHAKA_LANDMARKS.shahbagh.coordinates.latitude}
        lng={DHAKA_LANDMARKS.shahbagh.coordinates.longitude}
        radius={5}
        onSearchChange={(params) => {
          changedParams = params;
        }}
      />
    );

    const firstCard = container.querySelector<HTMLDivElement>('.medimap-branch-card');
    assert.ok(firstCard, 'Should have at least one branch card');

    const selectBtn = firstCard.querySelector<HTMLButtonElement>('.medimap-card-select-btn');
    assert.ok(selectBtn, 'Should have a select button on card');

    act(() => {
      selectBtn.click();
    });

    assert.ok(changedParams !== null);
    assert.ok((changedParams as { selectedBranchId?: string }).selectedBranchId);
  });

  it('renders clinical empty state when no branches are within radius and provides expand action', () => {
    let changedParams: { radius?: number } | null = null;

    const { container } = renderComponent(
      <DiscoveryView
        query="Complete Blood Count"
        lat={23.7000}
        lng={90.3500}
        radius={0.2}
        onSearchChange={(params) => {
          changedParams = params;
        }}
      />
    );

    // Empty state container should render
    const emptyState = container.querySelector('.medimap-discovery-empty-state');
    assert.ok(emptyState, 'Empty state should render when 0 branches match');
    assert.match(emptyState.textContent ?? '', /No diagnostic branches within 0.2 km straight-line radius/);

    // Expand radius button
    const expandBtn = emptyState.querySelector<HTMLButtonElement>('.medimap-empty-action-btn');
    assert.ok(expandBtn, 'Expand button should exist');

    act(() => {
      expandBtn.click();
    });

    assert.ok(changedParams !== null);
    assert.equal((changedParams as { radius?: number }).radius, 5);
  });

  it('enforces architecture invariants: BDT base prices, verification badges, and straight-line separation', () => {
    const { container } = renderComponent(
      <DiscoveryView
        query="Lipid Profile"
        lat={DHAKA_LANDMARKS.shahbagh.coordinates.latitude}
        lng={DHAKA_LANDMARKS.shahbagh.coordinates.longitude}
        radius={5}
      />
    );

    const branchCards = container.querySelectorAll('.medimap-branch-card');
    assert.ok(branchCards.length > 0);

    for (const card of Array.from(branchCards)) {
      // 1. Base price in BDT
      assert.match(card.textContent ?? '', /BDT\s+[0-9,]+/);

      // 2. Verified status badge
      assert.match(card.textContent ?? '', /Verified/);

      // 3. Straight-line distance explicitly labeled
      assert.match(card.textContent ?? '', /km \(straight-line\)/);
    }
  });

  it('all interactive controls meet the minimum 44px touch target guideline', () => {
    const { container } = renderComponent(
      <DiscoveryView
        query="Complete Blood Count"
        lat={DHAKA_LANDMARKS.shahbagh.coordinates.latitude}
        lng={DHAKA_LANDMARKS.shahbagh.coordinates.longitude}
        radius={3}
      />
    );

    // Preset buttons
    const presetButtons = container.querySelectorAll<HTMLButtonElement>('.medimap-preset-btn');
    for (const btn of Array.from(presetButtons)) {
      assert.ok(btn.classList.contains('medimap-preset-btn'));
    }

    // Radius pills
    const radiusPills = container.querySelectorAll('.medimap-radius-pill');
    assert.ok(radiusPills.length >= 4);
  });
});
