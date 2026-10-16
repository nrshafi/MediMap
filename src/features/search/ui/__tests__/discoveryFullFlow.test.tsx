import './setupDom';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DHAKA_LANDMARKS } from '../../../map/landmarks';
import { BranchResultCard } from '../../../map/ui/BranchResultCard';
import type { DiscoveryBranchItem } from '../../../map/ui/types';
import { Route, type DiscoveryRouteSearchParams } from '../../../../routes/discovery';
import { validateDiscoverySearch } from '../../discoverySearch';
import { DiscoveryView, type DiscoveryViewProps } from '../DiscoveryView';
import { win } from './setupDom';

declare const jest: {
  useFakeTimers(): void;
  useRealTimers(): void;
  advanceTimersByTime(ms: number): void;
};

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

function changeInputValue(input: HTMLInputElement, value: string) {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    win.HTMLInputElement.prototype,
    'value'
  )?.set;
  act(() => {
    nativeSetter?.call(input, value);
    input.dispatchEvent(
      new win.Event('input', { bubbles: true }) as unknown as Event
    );
  });
}

function clickElement(element: HTMLElement | SVGElement) {
  act(() => {
    element.dispatchEvent(
      new win.MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }) as unknown as MouseEvent
    );
  });
}

function pressKey(element: HTMLElement | SVGElement, key: string) {
  act(() => {
    element.dispatchEvent(
      new win.KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
      }) as unknown as KeyboardEvent
    );
  });
}

/**
 * Integrated discovery test harness simulating the TanStack Router discovery page loop.
 * Synchronizes search parameters across query, location coordinates, radius, and branch selection.
 */
interface TestHarnessProps {
  readonly initialParams?: DiscoveryRouteSearchParams;
  readonly onSearchChangeSpy?: (params: {
    query?: string;
    radius?: number;
    lat?: number;
    lng?: number;
    selectedBranchId?: string;
  }) => void;
}

function DiscoveryTestHarness({
  initialParams = {},
  onSearchChangeSpy,
}: TestHarnessProps) {
  const [params, setParams] = useState<DiscoveryRouteSearchParams>({
    query: initialParams.query ?? initialParams.q ?? 'Complete Blood Count',
    q: initialParams.q ?? initialParams.query ?? 'Complete Blood Count',
    lat: initialParams.lat ?? DHAKA_LANDMARKS.shahbagh.coordinates.latitude,
    lng: initialParams.lng ?? DHAKA_LANDMARKS.shahbagh.coordinates.longitude,
    radius: initialParams.radius ?? 3,
    selectedBranchId: initialParams.selectedBranchId,
  });

  const handleSearchChange: NonNullable<DiscoveryViewProps['onSearchChange']> = (newParams) => {
    onSearchChangeSpy?.(newParams);
    setParams((prev) => ({
      ...prev,
      query: newParams.query ?? prev.query,
      q: newParams.query ?? prev.q,
      lat: newParams.lat ?? prev.lat,
      lng: newParams.lng ?? prev.lng,
      radius: newParams.radius ?? prev.radius ?? 3,
      selectedBranchId: newParams.selectedBranchId,
    }));
  };

  return (
    <DiscoveryView
      query={params.query ?? params.q}
      lat={params.lat}
      lng={params.lng}
      radius={params.radius}
      selectedBranchId={params.selectedBranchId}
      onSearchChange={handleSearchChange}
    />
  );
}

describe('Discovery End-to-End User Flow Integration Test Suite', () => {
  it('rejects malformed URL numbers, invalid coordinate pairs, and out-of-range radii', () => {
    const validate = validateDiscoverySearch;
    assert.ok(typeof validate === 'function');
    for (const radius of ['3garbage', '', Infinity, NaN, 0.01, 101]) {
      assert.equal(validate({ radius }).radius, 3);
    }
    for (const params of [{ lat: 91, lng: 90 }, { lat: 23, lng: 181 }, { lat: 23 }, { lat: '23junk', lng: 90 }]) {
      const parsed = validate(params);
      assert.equal(parsed.lat, undefined);
      assert.equal(parsed.lng, undefined);
    }
    assert.equal(validate({ radius: '0.1' }).radius, 0.1);
    assert.equal(validate({ radius: '100' }).radius, 100);
  });
  beforeEach(() => {
    jest.useFakeTimers();
    win.document.body.innerHTML = '';
  });

  afterEach(() => {
    for (const res of [...activeRenders]) {
      res.unmount();
    }
    activeRenders.clear();
    win.document.body.innerHTML = '';
    jest.useRealTimers();
  });

  describe('1. TanStack Router Search Parameter Validation & Synchronization', () => {
    const validateSearch = Route.options.validateSearch as (
      search: Record<string, unknown>
    ) => DiscoveryRouteSearchParams;

    it('validates and extracts complete search query parameters', () => {
      assert.equal(typeof validateSearch, 'function');

      const validated = validateSearch({
        q: 'CBC',
        lat: 23.7388,
        lng: 90.3957,
        radius: 5,
        selectedBranchId: 'bsmmu-shahbagh',
      });

      assert.equal(validated.q, 'CBC');
      assert.equal(validated.query, 'CBC');
      assert.equal(validated.lat, 23.7388);
      assert.equal(validated.lng, 90.3957);
      assert.equal(validated.radius, 5);
      assert.equal(validated.selectedBranchId, 'bsmmu-shahbagh');
    });

    it('parses stringified numeric parameters and falls back to default 3 km radius when invalid', () => {
      const validated = validateSearch({
        query: 'Lipid Profile',
        lat: '23.7925',
        lng: '90.4167',
        radius: '-1',
      });

      assert.equal(validated.query, 'Lipid Profile');
      assert.equal(validated.q, 'Lipid Profile');
      assert.equal(validated.lat, 23.7925);
      assert.equal(validated.lng, 90.4167);
      assert.equal(validated.radius, 3, 'Radius <= 0 must default to 3 km');
      assert.equal(validated.selectedBranchId, undefined);
    });

    it('trims whitespace and rejects blank selectedBranchId', () => {
      const validated = validateSearch({
        selectedBranchId: '   ',
      });

      assert.equal(validated.selectedBranchId, undefined);

      const validatedTrimmed = validateSearch({
        selectedBranchId: '  square-panthapath  ',
      });

      assert.equal(validatedTrimmed.selectedBranchId, 'square-panthapath');
    });
  });

  describe('2. Complete Search Flow: Diagnostic Query to Filtered Branch Results and BDT Pricing', () => {
    it('executes user journey: search for "Lipid Profile", select suggestion, and verify updated BDT branch prices', () => {
      const recordedParamChanges: Array<{ query?: string; radius?: number; lat?: number; lng?: number; selectedBranchId?: string }> = [];

      const { container } = renderComponent(
        <DiscoveryTestHarness
          initialParams={{
            query: 'Complete Blood Count',
            radius: 5,
          }}
          onSearchChangeSpy={(p) => recordedParamChanges.push(p)}
        />
      );

      // Verify initial state: Complete Blood Count
      const filterBar = container.querySelector('.medimap-active-filters-bar');
      assert.ok(filterBar);
      assert.match(filterBar.textContent ?? '', /Complete Blood Count/);

      // Verify initial branch prices reflect Complete Blood Count (BSMMU: 200 BDT, Popular: 550 BDT, DMCH: 150 BDT)
      const initialCards = Array.from(container.querySelectorAll('.medimap-branch-card'));
      assert.ok(initialCards.length > 0);
      const bsmmuInitial = initialCards.find((c) => c.textContent?.includes('BSMMU'));
      assert.ok(bsmmuInitial, 'BSMMU branch card must exist');
      assert.match(bsmmuInitial.textContent ?? '', /BDT\s+200/);

      // Locate search input
      const searchInput = container.querySelector<HTMLInputElement>('.medimap-search-input');
      assert.ok(searchInput, 'Search input must exist');

      // Step 1: User types "Lipid Profile"
      changeInputValue(searchInput, 'Lipid Profile');
      act(() => {
        jest.advanceTimersByTime(250);
      });

      // Step 2: AutoSuggest dropdown opens
      const listbox = container.querySelector<HTMLDivElement>('.medimap-dropdown-panel');
      assert.ok(listbox, 'AutoSuggest dropdown must open after debounced typing');

      const suggestionItems = Array.from(container.querySelectorAll<HTMLDivElement>('.medimap-dropdown-option'));
      assert.ok(suggestionItems.length > 0);
      const lipidOption = suggestionItems.find((opt) => opt.textContent?.includes('Lipid Profile'));
      assert.ok(lipidOption, 'Lipid Profile suggestion option must exist');

      // Step 3: User clicks "Lipid Profile" suggestion
      clickElement(lipidOption);

      // Verify onSearchChange spy recorded parameter update
      assert.ok(recordedParamChanges.length > 0);
      const lastChange = recordedParamChanges[recordedParamChanges.length - 1];
      assert.equal(lastChange.query, 'Lipid Profile');

      // Step 4: Verify UI updates to Lipid Profile
      assert.match(filterBar.textContent ?? '', /Lipid Profile/);

      // Step 5: Verify branch cards update to Lipid Profile base prices in BDT
      // Square: 2,600 BDT; Popular: 1,400 BDT; BSMMU: 500 BDT; DMCH: 400 BDT
      const updatedCards = Array.from(container.querySelectorAll('.medimap-branch-card'));
      assert.ok(updatedCards.length > 0);

      const bsmmuUpdated = updatedCards.find((c) => c.textContent?.includes('BSMMU'));
      assert.ok(bsmmuUpdated);
      assert.match(bsmmuUpdated.textContent ?? '', /BDT\s+500/);

      const popularUpdated = updatedCards.find((c) => c.textContent?.includes('Popular'));
      assert.ok(popularUpdated);
      assert.match(popularUpdated.textContent ?? '', /BDT\s+1,400/);

      const squareUpdated = updatedCards.find((c) => c.textContent?.includes('Square'));
      assert.ok(squareUpdated);
      assert.match(squareUpdated.textContent ?? '', /BDT\s+2,600/);

      // Step 6: Verify Invariant 8: Map pin count strictly equals list card count
      const pins = container.querySelectorAll('g[data-testid^="map-pin-"]');
      assert.equal(pins.length, updatedCards.length);
    });

    it('resolves Bengali diagnostic query "বুকের এক্স-রে" to Chest X-Ray and displays authentic BDT tariff', () => {
      const { container } = renderComponent(
        <DiscoveryTestHarness
          initialParams={{
            radius: 5,
          }}
        />
      );

      const searchInput = container.querySelector<HTMLInputElement>('.medimap-search-input')!;
      assert.ok(searchInput);

      changeInputValue(searchInput, 'বুকের এক্স-রে');
      act(() => {
        jest.advanceTimersByTime(250);
      });

      const suggestionItems = Array.from(container.querySelectorAll<HTMLDivElement>('.medimap-dropdown-option'));
      assert.ok(suggestionItems.length > 0, 'Suggestions must appear for Bengali query');
      const xrayOption = suggestionItems.find((opt) => opt.textContent?.includes('X-Ray Chest') || opt.textContent?.includes('বুকের এক্স-রে'));
      assert.ok(xrayOption, 'Bengali alias "বুকের এক্স-রে" must suggest Chest X-Ray');

      clickElement(xrayOption);

      const filterBar = container.querySelector('.medimap-active-filters-bar')!;
      assert.match(filterBar.textContent ?? '', /X-Ray Chest/);

      // Chest X-Ray verified BDT prices: DMCH 200 BDT, BSMMU 300 BDT, Square 1600 BDT
      const cards = Array.from(container.querySelectorAll('.medimap-branch-card'));
      const dmchCard = cards.find((c) => c.textContent?.includes('Dhaka Medical College'));
      assert.ok(dmchCard);
      assert.match(dmchCard.textContent ?? '', /BDT\s+200/);

      const bsmmuCard = cards.find((c) => c.textContent?.includes('BSMMU'));
      assert.ok(bsmmuCard);
      assert.match(bsmmuCard.textContent ?? '', /BDT\s+300/);
    });
  });

  describe('3. Clinical Ambiguity Resolution Flow in Discovery', () => {
    it('requires explicit patient selection when query is ambiguous ("CT") and applies selected service results', () => {
      const recordedParamChanges: Array<{ query?: string }> = [];

      const { container } = renderComponent(
        <DiscoveryTestHarness
          initialParams={{
            query: 'Complete Blood Count',
            radius: 5,
          }}
          onSearchChangeSpy={(p) => recordedParamChanges.push(p)}
        />
      );

      const searchInput = container.querySelector<HTMLInputElement>('.medimap-search-input')!;

      // Step 1: User types ambiguous query "CT"
      changeInputValue(searchInput, 'CT');
      act(() => {
        jest.advanceTimersByTime(250);
      });

      // Step 2: Ambiguity prompt must render, auto-suggest dropdown must NOT render
      const ambiguityPanel = container.querySelector('.medimap-ambiguity-panel');
      assert.ok(ambiguityPanel, 'Ambiguity prompt panel must be rendered for "CT"');
      assert.match(ambiguityPanel.textContent ?? '', /Specific test selection required/);
      assert.match(ambiguityPanel.textContent ?? '', /Multiple diagnostic tests match “CT”/);

      // Verify that no automatic resolution occurred
      assert.equal(
        recordedParamChanges.length,
        0,
        'Ambiguous query must never automatically dispatch search parameter updates'
      );

      // Step 3: Candidate cards render for "CT Scan Chest" and "CT Scan Brain"
      const ambiguityCards = Array.from(
        container.querySelectorAll<HTMLButtonElement>('.medimap-ambiguity-card')
      );
      assert.equal(ambiguityCards.length, 2);

      const chestCard = ambiguityCards.find((c) => c.textContent?.includes('CT Scan Chest'));
      const brainCard = ambiguityCards.find((c) => c.textContent?.includes('CT Scan Brain'));
      assert.ok(chestCard, 'CT Scan Chest candidate must be listed');
      assert.ok(brainCard, 'CT Scan Brain candidate must be listed');

      // Step 4: User explicitly selects "CT Scan Chest"
      clickElement(chestCard);

      // Ambiguity panel must close
      assert.equal(container.querySelector('.medimap-ambiguity-panel'), null);

      // onSearchChange receives CT Scan Chest
      assert.ok(recordedParamChanges.length > 0);
      assert.equal(recordedParamChanges[recordedParamChanges.length - 1].query, 'CT Scan Chest');

      // Active filters bar reflects CT Scan Chest
      const filterBar = container.querySelector('.medimap-active-filters-bar')!;
      assert.match(filterBar.textContent ?? '', /CT Scan Chest/);

      // Step 5: Branch results show CT Scan Chest BDT prices:
      // DMCH: 2,200 BDT; BSMMU: 2,800 BDT; Popular: 6,500 BDT; Square: 11,000 BDT
      const branchCards = Array.from(container.querySelectorAll('.medimap-branch-card'));
      assert.ok(branchCards.length > 0);

      const dmchCard = branchCards.find((c) => c.textContent?.includes('Dhaka Medical College'));
      assert.ok(dmchCard);
      assert.match(dmchCard.textContent ?? '', /BDT\s+2,200/);

      const squareCard = branchCards.find((c) => c.textContent?.includes('Square'));
      assert.ok(squareCard);
      assert.match(squareCard.textContent ?? '', /BDT\s+11,000/);

      // Step 6: Parity invariant maintained
      const pins = container.querySelectorAll('g[data-testid^="map-pin-"]');
      assert.equal(pins.length, branchCards.length);
    });

    it('allows patient to cancel ambiguity prompt and preserves input focus', () => {
      const { container } = renderComponent(
        <DiscoveryTestHarness
          initialParams={{
            query: 'Complete Blood Count',
          }}
        />
      );

      const searchInput = container.querySelector<HTMLInputElement>('.medimap-search-input')!;
      changeInputValue(searchInput, 'CT');
      act(() => {
        jest.advanceTimersByTime(250);
      });

      const cancelBtn = container.querySelector<HTMLButtonElement>('.medimap-ambiguity-cancel-btn');
      assert.ok(cancelBtn, 'Cancel button must exist on ambiguity panel');

      clickElement(cancelBtn);

      assert.equal(container.querySelector('.medimap-ambiguity-panel'), null);
      assert.equal(win.document.activeElement, searchInput);
    });
  });

  describe('4. Spatial Radius Filtering Flow & Parity Invariant (Invariant 8)', () => {
    it('narrows branches when switching from 3 km to 1 km and maintains strict 1:1 pin/card parity', () => {
      const recordedParamChanges: Array<{ radius?: number }> = [];

      const { container } = renderComponent(
        <DiscoveryTestHarness
          initialParams={{
            query: 'Complete Blood Count',
            lat: DHAKA_LANDMARKS.shahbagh.coordinates.latitude,
            lng: DHAKA_LANDMARKS.shahbagh.coordinates.longitude,
            radius: 3,
          }}
          onSearchChangeSpy={(p) => recordedParamChanges.push(p)}
        />
      );

      // Initial state at 3 km
      const initialCards = container.querySelectorAll('.medimap-branch-card');
      const initialPins = container.querySelectorAll('g[data-testid^="map-pin-"]');
      assert.ok(initialCards.length > 0);
      assert.equal(initialPins.length, initialCards.length, 'Invariant 8: 3 km pin count must equal card count');
      const countAt3km = initialCards.length;

      // Select 1 km radius pill
      const radiusPills = Array.from(container.querySelectorAll<HTMLLabelElement>('.medimap-radius-pill'));
      const pill1km = radiusPills.find((p) => p.textContent?.includes('1 km'));
      assert.ok(pill1km, '1 km preset pill must exist');

      const input1km = pill1km.querySelector<HTMLInputElement>('input')!;
      clickElement(input1km);

      // Verify onSearchChange received radius: 1
      assert.ok(recordedParamChanges.length > 0);
      assert.equal(recordedParamChanges[recordedParamChanges.length - 1].radius, 1);

      // Verify narrowed branch results
      const cardsAt1km = container.querySelectorAll('.medimap-branch-card');
      const pinsAt1km = container.querySelectorAll('g[data-testid^="map-pin-"]');
      assert.ok(cardsAt1km.length < countAt3km, '1 km radius must narrow eligible branches');
      assert.equal(pinsAt1km.length, cardsAt1km.length, 'Invariant 8: 1 km pin count must equal card count');

      // All remaining branches must have straight-line distance <= 1.0 km
      for (const card of Array.from(cardsAt1km)) {
        assert.match(card.textContent ?? '', /0\.[0-9]\s*km\s*\(straight-line\)|1\.0\s*km\s*\(straight-line\)/);
      }
    });

    it('expands branches when switching from 1 km to 5 km and maintains strict 1:1 pin/card parity', () => {
      const { container } = renderComponent(
        <DiscoveryTestHarness
          initialParams={{
            query: 'Complete Blood Count',
            lat: DHAKA_LANDMARKS.shahbagh.coordinates.latitude,
            lng: DHAKA_LANDMARKS.shahbagh.coordinates.longitude,
            radius: 1,
          }}
        />
      );

      const cardsAt1km = container.querySelectorAll('.medimap-branch-card');
      const countAt1km = cardsAt1km.length;

      // Click 5 km preset
      const radiusPills = Array.from(container.querySelectorAll<HTMLLabelElement>('.medimap-radius-pill'));
      const pill5km = radiusPills.find((p) => p.textContent?.includes('5 km'))!;
      assert.ok(pill5km);
      clickElement(pill5km.querySelector('input')!);

      const cardsAt5km = container.querySelectorAll('.medimap-branch-card');
      const pinsAt5km = container.querySelectorAll('g[data-testid^="map-pin-"]');
      assert.ok(cardsAt5km.length > countAt1km, '5 km radius must expand branch results');
      assert.equal(pinsAt5km.length, cardsAt5km.length, 'Invariant 8: 5 km pin count must equal card count');
    });

    it('supports custom radius entry and updates search radius and branch results', () => {
      const recordedParamChanges: Array<{ radius?: number }> = [];

      const { container } = renderComponent(
        <DiscoveryTestHarness
          initialParams={{
            query: 'Complete Blood Count',
            radius: 3,
          }}
          onSearchChangeSpy={(p) => recordedParamChanges.push(p)}
        />
      );

      // Select Custom preset
      const radiusPills = Array.from(container.querySelectorAll<HTMLLabelElement>('.medimap-radius-pill'));
      const customPill = radiusPills.find((p) => p.textContent?.includes('Custom'))!;
      assert.ok(customPill);
      clickElement(customPill.querySelector('input')!);

      const customInput = container.querySelector<HTMLInputElement>('.medimap-custom-radius-input');
      assert.ok(customInput, 'Custom radius number input must render');

      // Change custom radius to 7 km
      changeInputValue(customInput, '7');

      assert.ok(recordedParamChanges.length > 0);
      assert.equal(recordedParamChanges[recordedParamChanges.length - 1].radius, 7);

      const filterBar = container.querySelector('.medimap-active-filters-bar')!;
      assert.match(filterBar.textContent ?? '', /7 km/);

      const pins = container.querySelectorAll('g[data-testid^="map-pin-"]');
      const cards = container.querySelectorAll('.medimap-branch-card');
      assert.equal(pins.length, cards.length, 'Invariant 8: Custom radius pin count must equal card count');
    });

    it('renders clinical empty state when 0 branches qualify and recovers via "Expand radius" action', () => {
      const recordedParamChanges: Array<{ radius?: number }> = [];

      const { container } = renderComponent(
        <DiscoveryTestHarness
          initialParams={{
            query: 'Complete Blood Count',
            lat: 23.7000,
            lng: 90.3500,
            radius: 0.2,
          }}
          onSearchChangeSpy={(p) => recordedParamChanges.push(p)}
        />
      );

      // Empty state verification
      const emptyState = container.querySelector('.medimap-discovery-empty-state');
      assert.ok(emptyState, 'Empty state must render when 0 branches qualify');
      assert.match(emptyState.textContent ?? '', /No diagnostic branches within 0.2 km straight-line radius/);

      // Invariant 8: 0 branches -> 0 pins and 0 cards
      const pins = container.querySelectorAll('g[data-testid^="map-pin-"]');
      const cards = container.querySelectorAll('.medimap-branch-card');
      assert.equal(pins.length, 0);
      assert.equal(cards.length, 0);

      // Expand action button
      const expandBtn = emptyState.querySelector<HTMLButtonElement>('.medimap-empty-action-btn');
      assert.ok(expandBtn);
      assert.match(expandBtn.textContent ?? '', /Expand radius to 5 km/);

      clickElement(expandBtn);

      // Verify radius updated to 5
      assert.ok(recordedParamChanges.length > 0);
      assert.equal(recordedParamChanges[recordedParamChanges.length - 1].radius, 5);
    });
  });

  describe('5. Location Preset Switching Flow', () => {
    it('switches location from Shahbagh to Gulshan-2, updates coordinates, and re-ranks closest branches', () => {
      const recordedParamChanges: Array<{ lat?: number; lng?: number }> = [];

      const { container } = renderComponent(
        <DiscoveryTestHarness
          initialParams={{
            query: 'Complete Blood Count',
            lat: DHAKA_LANDMARKS.shahbagh.coordinates.latitude,
            lng: DHAKA_LANDMARKS.shahbagh.coordinates.longitude,
            radius: 3,
          }}
          onSearchChangeSpy={(p) => recordedParamChanges.push(p)}
        />
      );

      // Initial filter bar location
      const filterBar = container.querySelector('.medimap-active-filters-bar')!;
      assert.match(filterBar.textContent ?? '', /From:\s*Shahbagh/);

      // Initial top branch from Shahbagh is BSMMU or DMCH
      const initialCards = Array.from(container.querySelectorAll('.medimap-branch-card'));
      assert.match(initialCards[0].textContent ?? '', /BSMMU|Dhaka Medical College|BIRDEM/);

      // Locate Gulshan-2 preset button
      const presetButtons = Array.from(
        container.querySelectorAll<HTMLButtonElement>('.medimap-preset-btn')
      );
      const gulshanBtn = presetButtons.find((btn) => btn.textContent?.includes('Gulshan-2'));
      assert.ok(gulshanBtn, 'Gulshan-2 preset button must exist');

      // Click Gulshan-2
      clickElement(gulshanBtn);

      // Verify onSearchChange received Gulshan-2 coordinates
      assert.ok(recordedParamChanges.length > 0);
      const lastChange = recordedParamChanges[recordedParamChanges.length - 1];
      assert.ok(Math.abs((lastChange.lat ?? 0) - DHAKA_LANDMARKS.gulshan2.coordinates.latitude) < 0.001);
      assert.ok(Math.abs((lastChange.lng ?? 0) - DHAKA_LANDMARKS.gulshan2.coordinates.longitude) < 0.001);

      // Verify active preset styling and filter chip
      assert.ok(gulshanBtn.classList.contains('is-active'));
      assert.equal(gulshanBtn.getAttribute('aria-pressed'), 'true');
      assert.match(filterBar.textContent ?? '', /From:\s*Gulshan-2/);

      // At Gulshan-2 (3 km radius), United Hospital is the closest branch (~1.2 km)
      const updatedCards = Array.from(container.querySelectorAll('.medimap-branch-card'));
      assert.ok(updatedCards.length > 0);
      assert.match(updatedCards[0].textContent ?? '', /United Hospital/);
      assert.match(updatedCards[0].textContent ?? '', /[0-9.]+\s*km\s*\(straight-line\)/);

      // Branches in Old Dhaka / South Dhaka are excluded or ranked far below
      const branchTexts = updatedCards.map((c) => c.textContent);
      assert.ok(
        branchTexts.every((text) => !text?.includes('Dhaka Medical College')),
        'DMCH (>6 km away) must not be in 3 km Gulshan-2 results'
      );

      // Parity check
      const pins = container.querySelectorAll('g[data-testid^="map-pin-"]');
      assert.equal(pins.length, updatedCards.length);
    });

    it('switches location to Dhanmondi and verifies Popular and Ibn Sina Dhanmondi branches are top-ranked', () => {
      const { container } = renderComponent(
        <DiscoveryTestHarness
          initialParams={{
            query: 'Complete Blood Count',
            radius: 3,
          }}
        />
      );

      const presetButtons = Array.from(
        container.querySelectorAll<HTMLButtonElement>('.medimap-preset-btn')
      );
      const dhanmondiBtn = presetButtons.find((btn) => btn.textContent?.includes('Dhanmondi'))!;
      assert.ok(dhanmondiBtn);

      clickElement(dhanmondiBtn);

      const filterBar = container.querySelector('.medimap-active-filters-bar')!;
      assert.match(filterBar.textContent ?? '', /From:\s*Dhanmondi/);

      const cards = Array.from(container.querySelectorAll('.medimap-branch-card'));
      assert.ok(cards.length > 0);
      const topBranchText = cards[0].textContent ?? '';
      assert.ok(
        topBranchText.includes('Popular') || topBranchText.includes('Ibn Sina') || topBranchText.includes('Labaid'),
        'Top branch from Dhanmondi should be a Dhanmondi medical center'
      );
    });
  });

  describe('6. Bidirectional Map-List Interaction Flow', () => {
    it('clicking an SVG map pin highlights the pin and selects the corresponding branch card in the list', () => {
      const recordedParamChanges: Array<{ selectedBranchId?: string }> = [];

      const { container } = renderComponent(
        <DiscoveryTestHarness
          initialParams={{
            query: 'Complete Blood Count',
            radius: 5,
          }}
          onSearchChangeSpy={(p) => recordedParamChanges.push(p)}
        />
      );

      // Select map pin for Square Hospital
      const squarePin = container.querySelector<SVGGElement>('g[data-testid="map-pin-square-panthapath"]');
      assert.ok(squarePin, 'Square Hospital map pin must exist');

      clickElement(squarePin);

      // Verify onSearchChange recorded selectedBranchId: square-panthapath
      assert.ok(recordedParamChanges.length > 0);
      assert.equal(
        recordedParamChanges[recordedParamChanges.length - 1].selectedBranchId,
        'square-panthapath'
      );

      // Map pin visual and accessible selection state
      assert.ok(squarePin.classList.contains('is-selected'));
      assert.ok(squarePin.classList.contains('map-pin--selected'));
      assert.equal(squarePin.getAttribute('aria-pressed'), 'true');

      // List card visual and accessible selection state
      const squareCard = container.querySelector<HTMLDivElement>('#branch-card-square-panthapath');
      assert.ok(squareCard, 'Square Hospital branch card must exist');
      assert.ok(squareCard.classList.contains('is-selected'));
      assert.ok(squareCard.classList.contains('branch-card--selected'));
      assert.equal(squareCard.getAttribute('aria-selected'), 'true');

      // Screen-reader announcement in synchronized discovery live region
      const liveRegion = container.querySelector(
        '.medimap-discovery-view .medimap-sr-only[role="status"]'
      );
      assert.ok(liveRegion);
      assert.match(liveRegion.textContent ?? '', /Square Hospital/);
      assert.match(liveRegion.textContent ?? '', /Base price BDT/);
      assert.match(liveRegion.textContent ?? '', /straight-line distance/);
    });

    it('clicking a branch card in the list highlights the card and synchronizes the SVG map pin', () => {
      const recordedParamChanges: Array<{ selectedBranchId?: string }> = [];

      const { container } = renderComponent(
        <DiscoveryTestHarness
          initialParams={{
            query: 'Complete Blood Count',
            radius: 5,
          }}
          onSearchChangeSpy={(p) => recordedParamChanges.push(p)}
        />
      );

      const bsmmuCard = container.querySelector<HTMLDivElement>('#branch-card-bsmmu-shahbagh');
      assert.ok(bsmmuCard, 'BSMMU card must exist');

      const selectBtn = bsmmuCard.querySelector<HTMLButtonElement>('.medimap-card-select-btn');
      assert.ok(selectBtn, 'Select button on card must exist');

      clickElement(selectBtn);

      // Verify onSearchChange recorded bsmmu-shahbagh
      assert.ok(recordedParamChanges.length > 0);
      assert.equal(
        recordedParamChanges[recordedParamChanges.length - 1].selectedBranchId,
        'bsmmu-shahbagh'
      );

      // Card selected
      assert.ok(bsmmuCard.classList.contains('is-selected'));
      assert.equal(bsmmuCard.getAttribute('aria-selected'), 'true');

      // Map pin selected
      const bsmmuPin = container.querySelector<SVGGElement>('g[data-testid="map-pin-bsmmu-shahbagh"]');
      assert.ok(bsmmuPin);
      assert.ok(bsmmuPin.classList.contains('is-selected'));
      assert.equal(bsmmuPin.getAttribute('aria-pressed'), 'true');
    });

    it('pressing Enter on focused map pin triggers branch selection', () => {
      const recordedParamChanges: Array<{ selectedBranchId?: string }> = [];

      const { container } = renderComponent(
        <DiscoveryTestHarness
          initialParams={{
            query: 'Complete Blood Count',
            radius: 5,
          }}
          onSearchChangeSpy={(p) => recordedParamChanges.push(p)}
        />
      );

      const dmchPin = container.querySelector<SVGGElement>('g[data-testid="map-pin-dmch-bakshibazar"]')!;
      assert.ok(dmchPin);

      pressKey(dmchPin, 'Enter');

      assert.ok(recordedParamChanges.length > 0);
      assert.equal(
        recordedParamChanges[recordedParamChanges.length - 1].selectedBranchId,
        'dmch-bakshibazar'
      );

      assert.ok(dmchPin.classList.contains('is-selected'));
      const dmchCard = container.querySelector('#branch-card-dmch-bakshibazar')!;
      assert.ok(dmchCard.classList.contains('is-selected'));
    });
  });

  describe('7. Architecture Invariant 7: Routing Fault-Tolerance & Metric Separation', () => {
    it('preserves base price in BDT and straight-line distance when road routing is unavailable', () => {
      // Invariant 7 requires: "Keep core branch and price information available when routing fails.
      // Straight-line radius is used for branch eligibility. Road distance and estimated travel time are labeled separately."
      const { container } = renderComponent(
        <DiscoveryTestHarness
          initialParams={{
            query: 'Complete Blood Count',
            radius: 5,
          }}
        />
      );

      const cards = Array.from(container.querySelectorAll('.medimap-branch-card'));
      assert.ok(cards.length > 0);

      for (const card of cards) {
        // Base price is always present in BDT
        const priceLabel = card.querySelector('.medimap-branch-price-value');
        assert.ok(priceLabel);
        assert.match(priceLabel.textContent ?? '', /^BDT\s+[0-9,]+$/);

        // Straight-line distance is always present and explicitly labeled
        const straightLineBadge = card.querySelector('.medimap-metric-straight-line');
        assert.ok(straightLineBadge);
        assert.match(straightLineBadge.textContent ?? '', /[0-9.]+\s*km\s*\(straight-line\)/);

        // Verification badge is always present
        const verifyBadge = card.querySelector('.medimap-verification-badge');
        assert.ok(verifyBadge);
        assert.equal(verifyBadge.textContent, 'Sample price');
      }
    });

    it('renders "Road estimate unavailable" fallback without dropping branch base price or straight-line distance', () => {
      // Create a test branch item with simulated unavailable routing
      const simulatedUnavailableBranch: DiscoveryBranchItem = {
        id: 'test-offline-branch',
        providerId: 'offline-hospital',
        providerName: 'Offline Test Hospital',
        branchName: 'Dhanmondi Branch',
        address: 'Road 5, Dhanmondi',
        area: 'Dhanmondi',
        coordinates: { latitude: 23.7461, longitude: 90.3742 },
        basePriceBdt: 750,
        priceVerifiedAt: '2026-10-14',
        isVerified: true,
        straightLineDistanceKm: 1.8,
        route: {
          status: 'unavailable',
          reason: 'network_error',
          message: 'Network error to routing provider',
          origin: DHAKA_LANDMARKS.shahbagh.coordinates,
          destination: { latitude: 23.7461, longitude: 90.3742 },
        },
      };

      const { container } = renderComponent(
        <BranchResultCard branch={simulatedUnavailableBranch} />
      );

      // Branch card renders base price and straight-line separation
      const card = container.querySelector('.medimap-branch-card');
      assert.ok(card);
      assert.match(card.textContent ?? '', /BDT\s+750/);
      assert.match(card.textContent ?? '', /1\.8\s*km\s*\(straight-line\)/);

      // Road metric explicitly displays unavailable fallback
      const roadBadge = container.querySelector('.medimap-metric-road');
      assert.ok(roadBadge);
      assert.match(roadBadge.textContent ?? '', /Road estimate unavailable/);
    });
  });

  describe('8. Architecture Invariant 8: Strict Map-List Count Parity', () => {
    it('confirms SVG map pin count strictly equals list card count at every stage of discovery', () => {
      const { container } = renderComponent(
        <DiscoveryTestHarness
          initialParams={{
            query: 'Lipid Profile',
            radius: 3,
          }}
        />
      );

      // Check stage 1: 3 km
      let pins = container.querySelectorAll('g[data-testid^="map-pin-"]');
      let cards = container.querySelectorAll('.medimap-branch-card');
      assert.equal(pins.length, cards.length, 'Stage 1 parity');
      assert.ok(pins.length > 0);

      // Check stage 2: Expand to 5 km
      const pill5km = Array.from(container.querySelectorAll<HTMLLabelElement>('.medimap-radius-pill')).find(
        (p) => p.textContent?.includes('5 km')
      )!;
      clickElement(pill5km.querySelector('input')!);

      pins = container.querySelectorAll('g[data-testid^="map-pin-"]');
      cards = container.querySelectorAll('.medimap-branch-card');
      assert.equal(pins.length, cards.length, 'Stage 2 (5 km) parity');
      assert.ok(pins.length >= 5);

      // Check stage 3: Switch to Gulshan-2
      const gulshanBtn = Array.from(
        container.querySelectorAll<HTMLButtonElement>('.medimap-preset-btn')
      ).find((btn) => btn.textContent?.includes('Gulshan-2'))!;
      clickElement(gulshanBtn);

      pins = container.querySelectorAll('g[data-testid^="map-pin-"]');
      cards = container.querySelectorAll('.medimap-branch-card');
      assert.equal(pins.length, cards.length, 'Stage 3 (Gulshan-2) parity');

      // Check stage 4: Switch test query to Chest X-Ray
      const searchInput = container.querySelector<HTMLInputElement>('.medimap-search-input')!;
      changeInputValue(searchInput, 'Chest X-Ray');
      act(() => {
        jest.advanceTimersByTime(250);
      });

      const xrayOpt = Array.from(
        container.querySelectorAll<HTMLDivElement>('.medimap-dropdown-option')
      ).find((o) => o.textContent?.includes('Chest X-Ray') || o.textContent?.includes('X-Ray Chest'));
      assert.ok(xrayOpt, 'Chest X-Ray option must exist in stage 4');
      clickElement(xrayOpt);

      pins = container.querySelectorAll('g[data-testid^="map-pin-"]');
      cards = container.querySelectorAll('.medimap-branch-card');
      assert.equal(pins.length, cards.length, 'Stage 4 (Chest X-Ray) parity');
    });
  });
});
