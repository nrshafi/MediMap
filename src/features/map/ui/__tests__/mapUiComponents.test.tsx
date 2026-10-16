import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { RouteAvailableResult, RouteUnavailableResult } from '../../../../integrations/mapping/types';
import {
  BranchList,
  BranchResultCard,
  DhakaMap,
  SynchronizedDiscoveryView,
} from '../index';
import type { DiscoveryBranchItem } from '../types';

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

const mockAvailableRoute: RouteAvailableResult = {
  status: 'available',
  roadDistanceKm: 3.4,
  travelDurationMinutes: 18.2,
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

const mockBranches: DiscoveryBranchItem[] = [
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
    roadDistanceKm: 3.4,
    travelDurationMinutes: 18,
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
    coordinates: { latitude: 23.7420, longitude: 90.3830 },
    basePriceBdt: 1200,
    priceVerifiedAt: '2026-10-12',
    isVerified: false,
    straightLineDistanceKm: 1.2,
  },
];

describe('Map & Discovery UI Components Test Suite', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    for (const r of [...activeRenders]) {
      r.unmount();
    }
  });

  // =========================================================================
  // 1. BranchResultCard Tests
  // =========================================================================
  describe('BranchResultCard', () => {
    it('preserves unknown prices and dates and labels sample prices', () => {
      const branch = { ...mockBranches[0], basePriceBdt: null, priceVerifiedAt: null, isVerified: false };
      const { container, root } = renderComponent(<BranchResultCard branch={branch} />);
      assert.ok(container.textContent?.includes('Price currently unavailable'));
      assert.ok(container.textContent?.includes('Verification date unavailable'));
      act(() => root.render(<BranchResultCard branch={{ ...branch, isSample: true }} />));
      assert.ok(container.textContent?.includes('Sample price'));
      assert.equal(container.textContent?.includes('Verification date unavailable'), false);
    });

    it('renders provider name, branch name, area, and formatted BDT price', () => {
      const { container } = renderComponent(
        <BranchResultCard branch={mockBranches[0]} />
      );

      const title = container.querySelector('.medimap-branch-provider-name');
      assert.equal(title?.textContent, 'Square Hospital');

      const subtitle = container.querySelector('.medimap-branch-name');
      assert.equal(subtitle?.textContent, 'Panthapath Main Branch');

      const area = container.querySelector('.medimap-branch-area');
      assert.ok(area?.textContent?.includes('Panthapath'));

      const price = container.querySelector('.medimap-branch-price-value');
      assert.equal(price?.textContent, 'BDT 2,500');
    });

    it('renders straight-line distance with explicit metric label', () => {
      const { container } = renderComponent(
        <BranchResultCard branch={mockBranches[0]} />
      );

      const straightLine = container.querySelector('.medimap-metric-straight-line');
      assert.ok(straightLine?.textContent?.includes('1.8 km (straight-line)'));
    });

    it('renders road distance and travel duration when route is available', () => {
      const { container } = renderComponent(
        <BranchResultCard branch={mockBranches[0]} />
      );

      const roadMetric = container.querySelector('.medimap-metric-road');
      assert.ok(roadMetric?.textContent?.includes('Road: 3.4 km · ~18 mins'));
    });

    it('renders explicit unavailable fallback text when road route failed without hiding price or straight-line distance', () => {
      const { container } = renderComponent(
        <BranchResultCard branch={mockBranches[1]} />
      );

      const price = container.querySelector('.medimap-branch-price-value');
      assert.equal(price?.textContent, 'BDT 3,200');

      const straightLine = container.querySelector('.medimap-metric-straight-line');
      assert.ok(straightLine?.textContent?.includes('8.5 km (straight-line)'));

      const roadMetric = container.querySelector('.medimap-metric-road');
      assert.ok(roadMetric?.textContent?.includes('Road estimate unavailable'));
    });

    it('renders verification badge with verification date for verified and unverified listings', () => {
      // Verified branch
      const { container: verifiedContainer } = renderComponent(
        <BranchResultCard branch={mockBranches[0]} />
      );
      const verifiedBadge = verifiedContainer.querySelector('.medimap-verification-badge');
      assert.ok(verifiedBadge?.classList.contains('is-verified'));
      assert.ok(verifiedBadge?.textContent?.includes('Verified: 2026-10-10'));

      // Unverified branch
      const { container: unverifiedContainer } = renderComponent(
        <BranchResultCard branch={mockBranches[2]} />
      );
      const unverifiedBadge = unverifiedContainer.querySelector('.medimap-verification-badge');
      assert.ok(unverifiedBadge?.classList.contains('is-unverified'));
      assert.ok(unverifiedBadge?.textContent?.includes('Unverified: 2026-10-12'));
    });

    it('invokes onSelect when card or select button is clicked or activated by keyboard', () => {
      let selectedId = '';
      const { container } = renderComponent(
        <BranchResultCard
          branch={mockBranches[0]}
          onSelect={(id) => {
            selectedId = id;
          }}
        />
      );

      const card = container.querySelector('.medimap-branch-card') as HTMLDivElement;
      act(() => {
        card.click();
      });
      assert.equal(selectedId, 'branch-square-panthapath');

      // Test keyboard Enter
      selectedId = '';
      act(() => {
        card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      });
      assert.equal(selectedId, 'branch-square-panthapath');
    });

    it('invokes onHover when card receives focus and blur', () => {
      let hoveredId: string | null = null;
      const { container } = renderComponent(
        <BranchResultCard
          branch={mockBranches[0]}
          onHover={(id) => {
            hoveredId = id;
          }}
        />
      );

      const card = container.querySelector('.medimap-branch-card') as HTMLDivElement;
      act(() => {
        card.focus();
      });
      assert.equal(hoveredId, 'branch-square-panthapath');

      act(() => {
        card.blur();
      });
      assert.equal(hoveredId, null);
    });
  });

  // =========================================================================
  // 2. BranchList Tests
  // =========================================================================
  describe('BranchList', () => {
    it('displays branch count heading and renders all branch cards', () => {
      const { container } = renderComponent(
        <BranchList branches={mockBranches} />
      );

      const heading = container.querySelector('.medimap-branch-count-heading');
      assert.equal(heading?.textContent, 'Branches found within radius: 3');

      const cards = container.querySelectorAll('.medimap-branch-card');
      assert.equal(cards.length, 3);
    });

    it('displays empty state when branches array is empty', () => {
      const { container } = renderComponent(
        <BranchList branches={[]} />
      );

      const emptyEl = container.querySelector('[data-testid="branch-list-empty"]');
      assert.ok(emptyEl);
      assert.ok(
        emptyEl?.textContent?.includes('No diagnostic branches found within the selected radius.')
      );
    });
  });

  // =========================================================================
  // 3. DhakaMap Tests
  // =========================================================================
  describe('DhakaMap', () => {
    it('draws the selected radius and exposes interactive pins inside a group', () => {
      const center = { latitude: 23.7388, longitude: 90.3957 };
      const { container, root } = renderComponent(<DhakaMap branches={mockBranches} centerCoordinates={center} radiusKm={1} />);
      const radius1 = Number(container.querySelector('.medimap-search-center-group circle')?.getAttribute('r'));
      act(() => root.render(<DhakaMap branches={mockBranches} centerCoordinates={center} radiusKm={5} />));
      const radius5 = Number(container.querySelector('.medimap-search-center-group circle')?.getAttribute('r'));
      assert.ok(radius5 > radius1 * 4.9 && radius5 < radius1 * 5.1);
      assert.equal(container.querySelector('svg')?.getAttribute('role'), 'group');
      assert.ok(container.textContent?.includes('Location schematic'));
    });

    it('renders accessible section with region role and aria-label', () => {
      const { container } = renderComponent(
        <DhakaMap branches={mockBranches} />
      );

      const section = container.querySelector('section[role="region"]');
      assert.ok(section);
      assert.equal(section?.getAttribute('aria-label'), 'Dhaka diagnostic branch map');
    });


    it('renders search center marker when centerCoordinates is provided', () => {
      const { container } = renderComponent(
        <DhakaMap
          branches={mockBranches}
          centerCoordinates={{ latitude: 23.7388, longitude: 90.3957 }}
        />
      );

      const centerMarker = container.querySelector('.medimap-search-center-group');
      assert.ok(centerMarker);
      assert.equal(centerMarker?.getAttribute('aria-label'), 'Search center location and straight-line radius');
    });

    it('renders keyboard-focusable branch pins with numbered labels', () => {
      const { container } = renderComponent(
        <DhakaMap branches={mockBranches} />
      );

      const pins = container.querySelectorAll('.medimap-pin-group');
      assert.equal(pins.length, 3);

      pins.forEach((pin, index) => {
        assert.equal(pin.getAttribute('role'), 'button');
        assert.equal(pin.getAttribute('tabindex'), '0');



        // Check index number badge
        const text = pin.querySelector('text');
        assert.equal(text?.textContent, String(index + 1));
      });
    });

    it('highlights selected pin with distinct styling and attributes', () => {
      const { container } = renderComponent(
        <DhakaMap
          branches={mockBranches}
          selectedBranchId="branch-square-panthapath"
        />
      );

      const selectedPin = container.querySelector('[data-testid="map-pin-branch-square-panthapath"]');
      assert.ok(selectedPin?.classList.contains('is-selected'));
      assert.equal(selectedPin?.getAttribute('aria-pressed'), 'true');

      // Check outer selection ring (r=20)
      const ring = selectedPin?.querySelector('circle[r="20"]');
      assert.ok(ring);
    });

    it('invokes onSelectBranch on pin click and keyboard Enter', () => {
      let selectedId = '';
      const { container } = renderComponent(
        <DhakaMap
          branches={mockBranches}
          onSelectBranch={(id) => {
            selectedId = id;
          }}
        />
      );

      const pin = container.querySelector('[data-testid="map-pin-branch-square-panthapath"]') as SVGGElement;
      act(() => {
        pin.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      assert.equal(selectedId, 'branch-square-panthapath');

      // Test space key
      selectedId = '';
      act(() => {
        pin.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      });
      assert.equal(selectedId, 'branch-square-panthapath');
    });

    it('supports zoom controls and adjusts SVG viewBox', () => {
      const { container } = renderComponent(
        <DhakaMap branches={mockBranches} />
      );

      const svg = container.querySelector('svg.medimap-dhaka-svg') as SVGSVGElement;
      const initialViewBox = svg.getAttribute('viewBox');
      assert.equal(initialViewBox, '0 0 800 600');

      const zoomInBtn = container.querySelector('button[aria-label="Zoom in"]') as HTMLButtonElement;
      act(() => {
        zoomInBtn.click();
      });

      const zoomedViewBox = svg.getAttribute('viewBox');
      assert.notEqual(zoomedViewBox, initialViewBox);

      // Reset view button resets back to 0 0 800 600
      const resetBtn = container.querySelector('button[aria-label="Reset map view"]') as HTMLButtonElement;
      act(() => {
        resetBtn.click();
      });
      assert.equal(svg.getAttribute('viewBox'), '0 0 800 600');
    });

    it('renders floating tooltip bubble when branch is selected or hovered', () => {
      const { container } = renderComponent(
        <DhakaMap
          branches={mockBranches}
          hoveredBranchId="branch-square-panthapath"
        />
      );

      const tooltip = container.querySelector('.medimap-map-tooltip-group');
      assert.ok(tooltip);
      assert.ok(tooltip?.textContent?.includes('Square Hospital'));
      assert.ok(tooltip?.textContent?.includes('BDT 2,500'));
    });
  });

  // =========================================================================
  // 4. SynchronizedDiscoveryView Tests
  // =========================================================================
  describe('SynchronizedDiscoveryView', () => {
    it('uses unique tab relationships and keyboard navigation with one tab stop', () => {
      const { container } = renderComponent(<><SynchronizedDiscoveryView branches={mockBranches} /><SynchronizedDiscoveryView branches={[]} /></>);
      const tabs = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
      assert.equal(new Set(tabs.map((tab) => tab.id)).size, 4);
      for (const tab of tabs) {
        const panel = document.getElementById(tab.getAttribute('aria-controls') ?? '');
        assert.equal(panel?.getAttribute('aria-labelledby'), tab.id);
      }
      const [listTab, mapTab] = tabs;
      assert.equal(listTab.tabIndex, 0);
      assert.equal(mapTab.tabIndex, -1);
      for (const [source, key, target] of [
        [listTab, 'ArrowRight', mapTab],
        [mapTab, 'ArrowLeft', listTab],
        [listTab, 'End', mapTab],
        [mapTab, 'Home', listTab],
      ] as const) {
        act(() => source.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })));
        assert.equal(document.activeElement, target);
        assert.equal(target.tabIndex, 0);
        assert.equal(target.getAttribute('aria-selected'), 'true');
        assert.equal((target === listTab ? mapTab : listTab).tabIndex, -1);
      }
    });

    it('dismisses the floating card when branch selection is controlled', () => {
      const { container } = renderComponent(<SynchronizedDiscoveryView branches={mockBranches} selectedBranchId={mockBranches[0].id} initialViewMode="map" />);
      assert.ok(container.querySelector('.medimap-floating-summary-card'));
      act(() => (container.querySelector('.medimap-floating-close-btn') as HTMLButtonElement).click());
      assert.equal(container.querySelector('.medimap-floating-summary-card'), null);
    });

    it('renders both list and map columns with the exact same filtered branches', () => {
      const { container } = renderComponent(
        <SynchronizedDiscoveryView branches={mockBranches} />
      );

      const listCards = container.querySelectorAll('.medimap-branch-card');
      const mapPins = container.querySelectorAll('.medimap-pin-group');

      // Invariant: Map pins and list cards display the EXACT same filtered branch records
      assert.equal(listCards.length, mockBranches.length);
      assert.equal(mapPins.length, mockBranches.length);
    });



  });
});
