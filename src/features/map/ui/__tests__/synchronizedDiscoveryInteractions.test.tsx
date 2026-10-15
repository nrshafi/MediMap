import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type {
  RouteAvailableResult,
  RouteUnavailableResult,
} from '../../../../integrations/mapping/types';
import {
  BranchList,
  BranchResultCard,
  DhakaMap,
  SynchronizedDiscoveryView,
} from '../index';
import type { DiscoveryBranchItem, InteractionSource } from '../types';

interface RenderResult {
  container: HTMLDivElement;
  root: Root;
  unmount: () => void;
}

const activeRenders = new Set<RenderResult>();

function renderComponent(ui: React.ReactElement): RenderResult {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  const result: RenderResult = {
    container,
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

// Helper to simulate key events
function pressKey(element: Element, key: string): void {
  act(() => {
    element.dispatchEvent(
      new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
      })
    );
  });
}

// Helper to simulate mouse events
function clickElement(element: Element): void {
  act(() => {
    element.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      })
    );
  });
}

function mouseEnterElement(element: Element): void {
  act(() => {
    element.dispatchEvent(
      new MouseEvent('mouseover', {
        bubbles: true,
        cancelable: true,
      })
    );
    element.dispatchEvent(
      new MouseEvent('mouseenter', {
        bubbles: false,
        cancelable: true,
      })
    );
  });
}

function mouseLeaveElement(element: Element): void {
  act(() => {
    element.dispatchEvent(
      new MouseEvent('mouseout', {
        bubbles: true,
        cancelable: true,
      })
    );
    element.dispatchEvent(
      new MouseEvent('mouseleave', {
        bubbles: false,
        cancelable: true,
      })
    );
  });
}

const mockAvailableRoute: RouteAvailableResult = {
  status: 'available',
  roadDistanceKm: 4.2,
  travelDurationMinutes: 22.5,
  origin: { latitude: 23.7388, longitude: 90.3957 },
  destination: { latitude: 23.7533, longitude: 90.3816 },
  source: 'osrm',
};

const mockUnavailableRoute: RouteUnavailableResult = {
  status: 'unavailable',
  reason: 'timeout',
  message: 'Routing request timed out',
  origin: { latitude: 23.7388, longitude: 90.3957 },
  destination: { latitude: 23.8103, longitude: 90.4312 },
};

const sampleBranches: DiscoveryBranchItem[] = [
  {
    id: 'branch-square-panthapath',
    providerId: 'square-hospital',
    providerName: 'Square Hospital',
    branchName: 'Panthapath Main Branch',
    address: '18/F Bir Uttam Qazi Nuruzzaman Sarak',
    area: 'Panthapath',
    coordinates: { latitude: 23.7533, longitude: 90.3816 },
    basePriceBdt: 2500,
    priceVerifiedAt: '2026-10-10',
    isVerified: true,
    straightLineDistanceKm: 1.8,
    route: mockAvailableRoute,
    roadDistanceKm: 4.2,
    travelDurationMinutes: 22,
  },
  {
    id: 'branch-evercare-bashundhara',
    providerId: 'evercare-hospital',
    providerName: 'Evercare Hospital Dhaka',
    branchName: 'Bashundhara Branch',
    address: 'Plot 81, Block E, Bashundhara R/A',
    area: 'Bashundhara',
    coordinates: { latitude: 23.8103, longitude: 90.4312 },
    basePriceBdt: 3200,
    priceVerifiedAt: '2026-10-08',
    isVerified: true,
    straightLineDistanceKm: 8.5,
    route: mockUnavailableRoute,
  },
  {
    id: 'branch-popular-dhanmondi',
    providerId: 'popular-diagnostic',
    providerName: 'Popular Diagnostic Centre',
    branchName: 'Dhanmondi Branch',
    address: 'House 16, Road 2, Dhanmondi',
    area: 'Dhanmondi',
    coordinates: { latitude: 23.742, longitude: 90.383 },
    basePriceBdt: 1200,
    priceVerifiedAt: '2026-10-12',
    isVerified: false,
    straightLineDistanceKm: 1.2,
  },
  {
    id: 'branch-labaid-dhanmondi',
    providerId: 'labaid-diagnostic',
    providerName: 'Labaid Diagnostic',
    branchName: 'Dhanmondi Specialized',
    address: 'House 1, Road 4, Dhanmondi',
    area: 'Dhanmondi',
    coordinates: { latitude: 23.7435, longitude: 90.382 },
    basePriceBdt: 1600,
    priceVerifiedAt: '2026-10-14',
    isVerified: true,
    straightLineDistanceKm: 1.4,
  },
];

describe('Synchronized Discovery Map & List Interactions Test Suite', () => {
  let originalScrollIntoView: typeof Element.prototype.scrollIntoView;
  let lastScrolledId: string | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
    lastScrolledId = null;
    originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function () {
      lastScrolledId = this.id;
    };
  });

  afterEach(() => {
    Element.prototype.scrollIntoView = originalScrollIntoView;
    for (const r of [...activeRenders]) {
      r.unmount();
    }
  });

  // =========================================================================
  // 1. Bidirectional Selection Synchronization
  // =========================================================================
  describe('1. Bidirectional Selection Synchronization', () => {
    it('selecting a map pin highlights the pin (map-pin--selected) and updates the list selection (branch-card--selected)', () => {
      let selectedBranchId: string | null = null;
      let selectedSource: InteractionSource = null;

      const { container } = renderComponent(
        <SynchronizedDiscoveryView
          branches={sampleBranches}
          onSelectBranch={(id, source) => {
            selectedBranchId = id;
            selectedSource = source ?? null;
          }}
        />
      );

      const targetPin = container.querySelector(
        '[data-testid="map-pin-branch-evercare-bashundhara"]'
      );
      assert.ok(targetPin, 'Evercare pin should exist in DOM');

      // Click the map pin
      clickElement(targetPin);

      // Verify callback arguments
      assert.equal(selectedBranchId, 'branch-evercare-bashundhara');
      assert.equal(selectedSource, 'map');

      // Verify pin highlighted with both classes and ARIA attributes
      assert.ok(
        targetPin.classList.contains('map-pin--selected'),
        'Pin must have map-pin--selected class'
      );
      assert.ok(
        targetPin.classList.contains('is-selected'),
        'Pin must retain is-selected class'
      );
      assert.equal(targetPin.getAttribute('aria-pressed'), 'true');
      assert.equal(targetPin.getAttribute('aria-expanded'), 'true');

      // Verify corresponding list card highlighted
      const targetCard = container.querySelector(
        '#branch-card-branch-evercare-bashundhara'
      );
      assert.ok(targetCard, 'Evercare card should exist in list');
      assert.ok(
        targetCard.classList.contains('branch-card--selected'),
        'Card must have branch-card--selected class'
      );
      assert.ok(
        targetCard.classList.contains('is-selected'),
        'Card must retain is-selected class'
      );
      assert.equal(targetCard.getAttribute('aria-selected'), 'true');
    });

    it('selecting a list card highlights the card (branch-card--selected) and updates the map pin selection (map-pin--selected)', () => {
      let selectedBranchId: string | null = null;
      let selectedSource: InteractionSource = null;

      const { container } = renderComponent(
        <SynchronizedDiscoveryView
          branches={sampleBranches}
          onSelectBranch={(id, source) => {
            selectedBranchId = id;
            selectedSource = source ?? null;
          }}
        />
      );

      const targetCard = container.querySelector(
        '#branch-card-branch-popular-dhanmondi'
      );
      assert.ok(targetCard, 'Popular card must exist in list');

      // Click card
      clickElement(targetCard);

      // Verify callback arguments
      assert.equal(selectedBranchId, 'branch-popular-dhanmondi');
      assert.equal(selectedSource, 'list');

      // Verify card highlighted
      assert.ok(
        targetCard.classList.contains('branch-card--selected'),
        'List card must receive branch-card--selected class'
      );
      assert.equal(targetCard.getAttribute('aria-selected'), 'true');

      // Verify corresponding map pin highlighted
      const targetPin = container.querySelector(
        '[data-testid="map-pin-branch-popular-dhanmondi"]'
      );
      assert.ok(targetPin, 'Popular map pin must exist');
      assert.ok(
        targetPin.classList.contains('map-pin--selected'),
        'Map pin must receive map-pin--selected class'
      );
      assert.equal(targetPin.getAttribute('aria-pressed'), 'true');
    });

    it('clicking the card action button View on map selects the branch with source list', () => {
      let reportedSource: InteractionSource = null;
      let reportedId: string | null = null;

      const { container } = renderComponent(
        <SynchronizedDiscoveryView
          branches={sampleBranches}
          onSelectBranch={(id, source) => {
            reportedId = id;
            reportedSource = source ?? null;
          }}
        />
      );

      const card = container.querySelector('#branch-card-branch-labaid-dhanmondi')!;
      const selectBtn = card.querySelector<HTMLButtonElement>(
        '.medimap-card-select-btn'
      )!;
      assert.ok(selectBtn);

      clickElement(selectBtn);

      assert.equal(reportedId, 'branch-labaid-dhanmondi');
      assert.equal(reportedSource, 'list');
      assert.equal(selectBtn.textContent, 'Selected');
    });

    it('supports controlled selectedBranchId prop and reflects external selection changes', () => {
      const { container, root } = renderComponent(
        <SynchronizedDiscoveryView
          branches={sampleBranches}
          selectedBranchId="branch-square-panthapath"
        />
      );

      let squarePin = container.querySelector(
        '[data-testid="map-pin-branch-square-panthapath"]'
      );
      let squareCard = container.querySelector(
        '#branch-card-branch-square-panthapath'
      );
      assert.ok(squarePin?.classList.contains('map-pin--selected'));
      assert.ok(squareCard?.classList.contains('branch-card--selected'));

      // Switch controlled prop to Evercare
      act(() => {
        root.render(
          <SynchronizedDiscoveryView
            branches={sampleBranches}
            selectedBranchId="branch-evercare-bashundhara"
          />
        );
      });

      squarePin = container.querySelector(
        '[data-testid="map-pin-branch-square-panthapath"]'
      );
      squareCard = container.querySelector(
        '#branch-card-branch-square-panthapath'
      );
      assert.equal(squarePin?.classList.contains('map-pin--selected'), false);
      assert.equal(squareCard?.classList.contains('branch-card--selected'), false);

      const evercarePin = container.querySelector(
        '[data-testid="map-pin-branch-evercare-bashundhara"]'
      );
      const evercareCard = container.querySelector(
        '#branch-card-branch-evercare-bashundhara'
      );
      assert.ok(evercarePin?.classList.contains('map-pin--selected'));
      assert.ok(evercareCard?.classList.contains('branch-card--selected'));
    });
  });

  // =========================================================================
  // 2. Bidirectional Hover Synchronization
  // =========================================================================
  describe('2. Bidirectional Hover Synchronization', () => {
    it('mouse enter on a pin triggers hover state on the pin and highlights the matching branch card', () => {
      const { container } = renderComponent(
        <SynchronizedDiscoveryView branches={sampleBranches} />
      );

      const pin = container.querySelector(
        '[data-testid="map-pin-branch-square-panthapath"]'
      )!;
      const card = container.querySelector(
        '#branch-card-branch-square-panthapath'
      )!;

      // Initial state: not hovered
      assert.equal(pin.classList.contains('map-pin--hovered'), false);
      assert.equal(card.classList.contains('branch-card--hovered'), false);

      // Trigger hover on pin
      mouseEnterElement(pin);

      assert.ok(
        pin.classList.contains('map-pin--hovered'),
        'Pin should have map-pin--hovered'
      );
      assert.ok(
        card.classList.contains('branch-card--hovered'),
        'Matching card should have branch-card--hovered'
      );

      // Map renders tooltip bubble on active hover
      const tooltip = container.querySelector('.medimap-map-tooltip-group');
      assert.ok(tooltip, 'Tooltip must render on pin hover');
      assert.ok(tooltip.textContent?.includes('Square Hospital'));
    });

    it('mouse enter on a card triggers hover state on the pin marker and renders map tooltip', () => {
      const { container } = renderComponent(
        <SynchronizedDiscoveryView branches={sampleBranches} />
      );

      const card = container.querySelector(
        '#branch-card-branch-labaid-dhanmondi'
      )!;
      const pin = container.querySelector(
        '[data-testid="map-pin-branch-labaid-dhanmondi"]'
      )!;

      mouseEnterElement(card);

      assert.ok(
        card.classList.contains('branch-card--hovered'),
        'Card must have branch-card--hovered'
      );
      assert.ok(
        pin.classList.contains('map-pin--hovered'),
        'Pin must have map-pin--hovered'
      );

      // Verify tooltip
      const tooltip = container.querySelector('.medimap-map-tooltip-group');
      assert.ok(tooltip);
      assert.ok(tooltip.textContent?.includes('Labaid Diagnostic'));
      assert.ok(tooltip.textContent?.includes('BDT 1,600'));
    });

    it('mouse leave cleans up hover states from both elements and removes tooltip', () => {
      const { container } = renderComponent(
        <SynchronizedDiscoveryView branches={sampleBranches} />
      );

      const pin = container.querySelector(
        '[data-testid="map-pin-branch-popular-dhanmondi"]'
      )!;
      const card = container.querySelector(
        '#branch-card-branch-popular-dhanmondi'
      )!;

      // Enter
      mouseEnterElement(pin);
      assert.ok(pin.classList.contains('map-pin--hovered'));
      assert.ok(card.classList.contains('branch-card--hovered'));

      // Leave
      mouseLeaveElement(pin);
      assert.equal(pin.classList.contains('map-pin--hovered'), false);
      assert.equal(card.classList.contains('branch-card--hovered'), false);

      const tooltip = container.querySelector('.medimap-map-tooltip-group');
      assert.equal(tooltip, null, 'Tooltip must disappear when hover ends');
    });

    it('focus and blur on card synchronize hover state for keyboard users', () => {
      const { container } = renderComponent(
        <SynchronizedDiscoveryView branches={sampleBranches} />
      );

      const card = container.querySelector<HTMLDivElement>(
        '#branch-card-branch-square-panthapath'
      )!;
      const pin = container.querySelector(
        '[data-testid="map-pin-branch-square-panthapath"]'
      )!;

      act(() => {
        card.focus();
      });
      assert.ok(card.classList.contains('branch-card--hovered'));
      assert.ok(pin.classList.contains('map-pin--hovered'));

      act(() => {
        card.blur();
      });
      assert.equal(card.classList.contains('branch-card--hovered'), false);
      assert.equal(pin.classList.contains('map-pin--hovered'), false);
    });
  });

  // =========================================================================
  // 3. Keyboard & Accessibility
  // =========================================================================
  describe('3. Keyboard & Accessibility', () => {
    it('pins have role="button", tabIndex={0}, aria-pressed, and aria-expanded', () => {
      const { container } = renderComponent(
        <DhakaMap branches={sampleBranches} />
      );

      const pins = container.querySelectorAll('.medimap-pin-group');
      assert.equal(pins.length, 4);

      pins.forEach((pin) => {
        assert.equal(pin.getAttribute('role'), 'button');
        assert.equal(pin.getAttribute('tabindex'), '0');
        assert.equal(pin.getAttribute('aria-pressed'), 'false');
        assert.equal(pin.getAttribute('aria-expanded'), 'false');
        assert.ok(
          (pin.getAttribute('aria-label')?.length ?? 0) > 0,
          'Pin must provide informative aria-label'
        );
      });
    });

    it('pressing Enter on a focused pin selects the branch', () => {
      let selectedId: string | null = null;
      const { container } = renderComponent(
        <DhakaMap
          branches={sampleBranches}
          onSelectBranch={(id) => {
            selectedId = id;
          }}
        />
      );

      const pin = container.querySelector(
        '[data-testid="map-pin-branch-square-panthapath"]'
      )!;
      pressKey(pin, 'Enter');

      assert.equal(selectedId, 'branch-square-panthapath');
    });

    it('pressing Space on a focused pin selects the branch', () => {
      let selectedId: string | null = null;
      const { container } = renderComponent(
        <DhakaMap
          branches={sampleBranches}
          onSelectBranch={(id) => {
            selectedId = id;
          }}
        />
      );

      const pin = container.querySelector(
        '[data-testid="map-pin-branch-popular-dhanmondi"]'
      )!;
      pressKey(pin, ' ');

      assert.equal(selectedId, 'branch-popular-dhanmondi');
    });

    it('polite live region announcement updates when a branch is selected', () => {
      const { container } = renderComponent(
        <SynchronizedDiscoveryView branches={sampleBranches} />
      );

      const liveRegion = container.querySelector('[role="status"]');
      assert.ok(liveRegion, 'Live region with role="status" must exist');
      assert.equal(liveRegion.getAttribute('aria-live'), 'polite');
      assert.equal(liveRegion.getAttribute('aria-atomic'), 'true');
      assert.equal(liveRegion.textContent, '');

      // Select pin
      const pin = container.querySelector(
        '[data-testid="map-pin-branch-square-panthapath"]'
      )!;
      clickElement(pin);

      // Verify live region text has clinical details
      assert.ok(
        liveRegion.textContent?.includes('Selected Square Hospital, Panthapath Main Branch')
      );
      assert.ok(liveRegion.textContent?.includes('Base price BDT 2,500'));
      assert.ok(liveRegion.textContent?.includes('1.8 km straight-line distance'));
    });

    it('zoom controls toolbar is accessible with aria-label and works on click and keyboard', () => {
      const { container } = renderComponent(
        <DhakaMap branches={sampleBranches} />
      );

      const toolbar = container.querySelector('[role="toolbar"]');
      assert.ok(toolbar);
      assert.equal(
        toolbar.getAttribute('aria-label'),
        'Map view and zoom controls'
      );

      const zoomInBtn = container.querySelector<HTMLButtonElement>(
        'button[aria-label="Zoom in"]'
      )!;
      const zoomOutBtn = container.querySelector<HTMLButtonElement>(
        'button[aria-label="Zoom out"]'
      )!;
      const resetBtn = container.querySelector<HTMLButtonElement>(
        'button[aria-label="Reset map view"]'
      )!;

      assert.ok(zoomInBtn);
      assert.ok(zoomOutBtn);
      assert.ok(resetBtn);

      const svg = container.querySelector('svg.medimap-dhaka-svg')!;
      assert.equal(svg.getAttribute('viewBox'), '0 0 800 600');

      // Test click zoom in
      clickElement(zoomInBtn);
      assert.notEqual(svg.getAttribute('viewBox'), '0 0 800 600');

      // Test keyboard zoom out via Enter
      pressKey(zoomOutBtn, 'Enter');
      assert.equal(svg.getAttribute('viewBox'), '0 0 800 600');

      // Test keyboard zoom in via Space
      pressKey(zoomInBtn, ' ');
      assert.notEqual(svg.getAttribute('viewBox'), '0 0 800 600');

      // Test keyboard reset via Enter
      pressKey(resetBtn, 'Enter');
      assert.equal(svg.getAttribute('viewBox'), '0 0 800 600');
    });

    it('disables zoom in at maximum zoom level and disables zoom out at minimum zoom level', () => {
      const { container } = renderComponent(
        <DhakaMap branches={sampleBranches} />
      );

      const zoomInBtn = container.querySelector<HTMLButtonElement>(
        'button[aria-label="Zoom in"]'
      )!;
      const zoomOutBtn = container.querySelector<HTMLButtonElement>(
        'button[aria-label="Zoom out"]'
      )!;

      // Initial zoom is 1: zoomOut is disabled
      assert.equal(zoomOutBtn.disabled, true);
      assert.equal(zoomInBtn.disabled, false);

      // Zoom in to level 1.5, 2.0, 2.5, 3.0
      clickElement(zoomInBtn);
      assert.equal(zoomOutBtn.disabled, false);
      clickElement(zoomInBtn);
      clickElement(zoomInBtn);
      clickElement(zoomInBtn);

      // Now at max zoom 3: zoomIn must be disabled
      assert.equal(zoomInBtn.disabled, true);
    });
  });

  // =========================================================================
  // 4. Mobile Screen Switching & Floating Card
  // =========================================================================
  describe('4. Mobile Screen Switching & Floating Card', () => {
    it('mobile segmented tablist switches between activeView === "list" and activeView === "map"', () => {
      const { container } = renderComponent(
        <SynchronizedDiscoveryView
          branches={sampleBranches}
          initialViewMode="list"
        />
      );

      const rootSection = container.querySelector('.medimap-discovery-view')!;
      const tablist = container.querySelector('.medimap-mobile-toggle-bar')!;
      const listTab = container.querySelector<HTMLButtonElement>('#tab-view-list')!;
      const mapTab = container.querySelector<HTMLButtonElement>('#tab-view-map')!;
      const listCol = container.querySelector('#panel-view-list')!;
      const mapCol = container.querySelector('#panel-view-map')!;

      // Initial state is list
      assert.equal(rootSection.getAttribute('data-active-view'), 'list');
      assert.equal(tablist.getAttribute('data-active-view'), 'list');
      assert.equal(listTab.getAttribute('aria-selected'), 'true');
      assert.equal(mapTab.getAttribute('aria-selected'), 'false');
      assert.ok(listCol.classList.contains('is-visible'));
      assert.ok(mapCol.classList.contains('is-hidden-mobile'));

      // Switch to Map
      clickElement(mapTab);

      assert.equal(rootSection.getAttribute('data-active-view'), 'map');
      assert.equal(tablist.getAttribute('data-active-view'), 'map');
      assert.equal(listTab.getAttribute('aria-selected'), 'false');
      assert.equal(mapTab.getAttribute('aria-selected'), 'true');
      assert.ok(mapCol.classList.contains('is-visible'));
      assert.ok(listCol.classList.contains('is-hidden-mobile'));

      // Switch back to List
      clickElement(listTab);

      assert.equal(rootSection.getAttribute('data-active-view'), 'list');
      assert.equal(listTab.getAttribute('aria-selected'), 'true');
      assert.equal(mapTab.getAttribute('aria-selected'), 'false');
    });

    it('in mobile map mode, selecting a pin renders the floating bottom summary card with branch details', () => {
      const { container } = renderComponent(
        <SynchronizedDiscoveryView
          branches={sampleBranches}
          initialViewMode="map"
        />
      );

      // Initially no floating card
      assert.equal(
        container.querySelector('[data-testid="mobile-floating-summary"]'),
        null
      );

      // Select pin on map
      const pin = container.querySelector(
        '[data-testid="map-pin-branch-evercare-bashundhara"]'
      )!;
      clickElement(pin);

      const summaryCard = container.querySelector(
        '[data-testid="mobile-floating-summary"]'
      );
      assert.ok(summaryCard, 'Floating bottom summary card must render');
      assert.equal(summaryCard.getAttribute('role'), 'dialog');

      // Verify details
      const title = summaryCard.querySelector('.medimap-floating-title');
      assert.equal(title?.textContent?.trim(), 'Evercare Hospital Dhaka');

      const subtitle = summaryCard.querySelector('.medimap-floating-subtitle');
      assert.ok(subtitle?.textContent?.includes('Bashundhara Branch'));
      assert.ok(subtitle?.textContent?.includes('Bashundhara'));

      const price = summaryCard.querySelector('.medimap-floating-price');
      assert.equal(price?.textContent?.trim(), 'BDT 3,200');

      const dist = summaryCard.querySelector('.medimap-floating-dist');
      assert.ok(dist?.textContent?.includes('8.5 km straight-line'));
    });

    it('clicking dismiss button ✕ on mobile summary card closes the floating card in uncontrolled mode', () => {
      const { container } = renderComponent(
        <SynchronizedDiscoveryView
          branches={sampleBranches}
          initialViewMode="map"
        />
      );

      const pin = container.querySelector(
        '[data-testid="map-pin-branch-square-panthapath"]'
      )!;
      clickElement(pin);
      assert.ok(container.querySelector('[data-testid="mobile-floating-summary"]'));

      const closeBtn = container.querySelector<HTMLButtonElement>(
        '.medimap-floating-close-btn'
      )!;
      assert.ok(closeBtn);
      assert.equal(
        closeBtn.getAttribute('aria-label'),
        'Dismiss branch summary'
      );

      clickElement(closeBtn);

      assert.equal(
        container.querySelector('[data-testid="mobile-floating-summary"]'),
        null
      );
    });

    it('clicking View in list on the mobile summary card switches activeView to list and scrolls to that card', () => {
      const { container } = renderComponent(
        <SynchronizedDiscoveryView
          branches={sampleBranches}
          initialViewMode="map"
        />
      );

      // Select pin
      const pin = container.querySelector(
        '[data-testid="map-pin-branch-evercare-bashundhara"]'
      )!;
      clickElement(pin);

      const viewInListBtn = container.querySelector<HTMLButtonElement>(
        '.medimap-floating-view-btn'
      )!;
      assert.ok(viewInListBtn);
      assert.equal(viewInListBtn.textContent?.trim(), 'View in list');

      // Click "View in list"
      clickElement(viewInListBtn);

      // Should switch to list view
      const rootSection = container.querySelector('.medimap-discovery-view')!;
      assert.equal(rootSection.getAttribute('data-active-view'), 'list');

      const listTab = container.querySelector<HTMLButtonElement>('#tab-view-list')!;
      assert.equal(listTab.getAttribute('aria-selected'), 'true');

      // Should have triggered scrollIntoView on target card
      assert.equal(lastScrolledId, 'branch-card-branch-evercare-bashundhara');
    });
  });

  // =========================================================================
  // 5. Invariants Verification
  // =========================================================================
  describe('5. Invariants Verification', () => {
    it('Invariant 7: preserves prices and straight-line metrics when route is unavailable, displaying Road estimate unavailable', () => {
      const { container } = renderComponent(
        <BranchResultCard branch={sampleBranches[1]} />
      );

      // Base price is preserved and visible
      const priceVal = container.querySelector('.medimap-branch-price-value');
      assert.equal(priceVal?.textContent?.trim(), 'BDT 3,200');

      // Straight-line distance is preserved and explicitly labeled
      const straightLineMetric = container.querySelector(
        '.medimap-metric-straight-line'
      );
      assert.ok(
        straightLineMetric?.textContent?.includes('8.5 km (straight-line)')
      );

      // Explicit fallback label rendered
      const roadMetric = container.querySelector('.medimap-metric-road');
      assert.ok(
        roadMetric?.textContent?.includes('Road estimate unavailable'),
        'Must display explicit Road estimate unavailable label'
      );

      // Verification badge is intact
      const badge = container.querySelector('.medimap-verification-badge');
      assert.ok(badge?.classList.contains('is-verified'));
      assert.ok(badge?.textContent?.includes('Verified: 2026-10-08'));
    });

    it('Invariant 7: preserves prices and straight-line metrics when route is undefined, displaying Road estimate unavailable', () => {
      const branchWithoutRoute: DiscoveryBranchItem = {
        id: 'branch-no-route',
        providerName: 'Delta Medical',
        branchName: 'Mirpur Branch',
        area: 'Mirpur',
        coordinates: { latitude: 23.8071, longitude: 90.3686 },
        basePriceBdt: 950,
        priceVerifiedAt: '2026-09-30',
        isVerified: false,
        straightLineDistanceKm: 6.2,
      };

      const { container } = renderComponent(
        <BranchResultCard branch={branchWithoutRoute} />
      );

      const priceVal = container.querySelector('.medimap-branch-price-value');
      assert.equal(priceVal?.textContent?.trim(), 'BDT 950');

      const straightLineMetric = container.querySelector(
        '.medimap-metric-straight-line'
      );
      assert.ok(
        straightLineMetric?.textContent?.includes('6.2 km (straight-line)')
      );

      const roadMetric = container.querySelector('.medimap-metric-road');
      assert.ok(
        roadMetric?.textContent?.includes('Road estimate unavailable')
      );
    });

    it('Invariant 8: map-list parity invariant guarantees DhakaMap renders exactly N pins and BranchList renders exactly N cards for empty collections (N=0)', () => {
      const { container } = renderComponent(
        <SynchronizedDiscoveryView branches={[]} />
      );

      const pins = container.querySelectorAll('.medimap-pin-group');
      const cards = container.querySelectorAll('.medimap-branch-card');
      const emptyState = container.querySelector('[data-testid="branch-list-empty"]');

      assert.equal(pins.length, 0, 'DhakaMap must render exactly 0 pins when N=0');
      assert.equal(cards.length, 0, 'BranchList must render exactly 0 cards when N=0');
      assert.ok(emptyState, 'BranchList must render empty state placeholder when N=0');

      // Standalone BranchList empty state parity verification
      const { container: standaloneContainer } = renderComponent(
        <BranchList branches={[]} />
      );
      assert.ok(
        standaloneContainer.querySelector('[data-testid="branch-list-empty"]')
      );
    });

    it('Invariant 8: map-list parity invariant guarantees DhakaMap renders exactly N pins and BranchList renders exactly N cards for single branch (N=1)', () => {
      const single = [sampleBranches[0]];
      const { container } = renderComponent(
        <SynchronizedDiscoveryView branches={single} />
      );

      const pins = container.querySelectorAll('.medimap-pin-group');
      const cards = container.querySelectorAll('.medimap-branch-card');

      assert.equal(pins.length, 1);
      assert.equal(cards.length, 1);
      assert.equal(
        container.querySelector('[data-testid="map-pin-branch-square-panthapath"]')?.getAttribute('role'),
        'button'
      );
      assert.ok(container.querySelector('#branch-card-branch-square-panthapath'));
    });

    it('Invariant 8: map-list parity invariant guarantees exact N-card and N-pin parity for multi-item collections', () => {
      const generatedBranches: DiscoveryBranchItem[] = Array.from(
        { length: 8 },
        (_, idx) => ({
          id: `branch-test-${idx + 1}`,
          providerName: `Provider ${idx + 1}`,
          branchName: `Branch ${idx + 1}`,
          area: 'Dhanmondi',
          coordinates: {
            latitude: 23.74 + idx * 0.005,
            longitude: 90.38 + idx * 0.005,
          },
          basePriceBdt: 1000 + idx * 100,
          priceVerifiedAt: '2026-10-15',
          isVerified: idx % 2 === 0,
          straightLineDistanceKm: 1.0 + idx * 0.5,
        })
      );

      const { container } = renderComponent(
        <SynchronizedDiscoveryView branches={generatedBranches} />
      );

      const pins = container.querySelectorAll('.medimap-pin-group');
      const cards = container.querySelectorAll('.medimap-branch-card');

      assert.equal(pins.length, 8);
      assert.equal(cards.length, 8);

      // Verify sequential 1-based pin badge numbering
      pins.forEach((pin, i) => {
        const text = pin.querySelector('text');
        assert.equal(text?.textContent, String(i + 1));
      });
    });
  });

  // =========================================================================
  // 6. Responsive & Touch Target Guidelines
  // =========================================================================
  describe('6. Responsive & Touch Target Guidelines', () => {
    it('verifies minimum 44px hit circles (r=22) on all SVG map pins', () => {
      const { container } = renderComponent(
        <DhakaMap branches={sampleBranches} />
      );

      const pins = container.querySelectorAll('.medimap-pin-group');
      pins.forEach((pin) => {
        const hitCircle = pin.querySelector('circle[r="22"]');
        assert.ok(
          hitCircle,
          'Pin must have transparent circle with radius 22px (44px diameter touch target)'
        );
        assert.equal(hitCircle.getAttribute('pointer-events'), 'all');
        assert.equal(hitCircle.getAttribute('fill'), 'transparent');
      });
    });

    it('verifies minimum 44px touch target rules in mapUi.css', () => {
      const cssPath = join(__dirname, '..', 'mapUi.css');
      const cssContent = readFileSync(cssPath, 'utf-8');

      // Segmented tab controls min-height 44px
      assert.match(
        cssContent,
        /\.medimap-mobile-tab-btn\s*\{[^}]*min-height:\s*44px;/s,
        'Mobile tab buttons must have min-height 44px'
      );

      // Zoom control buttons min 44x44px
      assert.match(
        cssContent,
        /\.medimap-control-btn\s*\{[^}]*min-width:\s*44px;/s,
        'Zoom buttons must have min-width 44px'
      );
      assert.match(
        cssContent,
        /\.medimap-control-btn\s*\{[^}]*min-height:\s*44px;/s,
        'Zoom buttons must have min-height 44px'
      );

      // Card select buttons min-height 44px
      assert.match(
        cssContent,
        /\.medimap-card-select-btn\s*\{[^}]*min-height:\s*44px;/s,
        'Card select buttons must have min-height 44px'
      );

      // Mobile floating card view button min-height 44px
      assert.match(
        cssContent,
        /\.medimap-floating-view-btn\s*\{[^}]*min-height:\s*44px;/s,
        'Floating card view button must have min-height 44px'
      );

      // Mobile floating card close button min 44x44px
      assert.match(
        cssContent,
        /\.medimap-floating-close-btn\s*\{[^}]*min-width:\s*44px;/s,
        'Floating card close button must have min-width 44px'
      );
      assert.match(
        cssContent,
        /\.medimap-floating-close-btn\s*\{[^}]*min-height:\s*44px;/s,
        'Floating card close button must have min-height 44px'
      );
    });

    it('verifies responsive layout CSS rules for mobile (max-width: 768px)', () => {
      const cssPath = join(__dirname, '..', 'mapUi.css');
      const cssContent = readFileSync(cssPath, 'utf-8');

      assert.match(cssContent, /@media\s*\(max-width:\s*768px\)/);
      assert.match(cssContent, /\.is-hidden-mobile\s*\{[^}]*display:\s*none/s);
      assert.match(cssContent, /\.is-visible\s*\{[^}]*display:\s*block/s);
    });
  });
});
