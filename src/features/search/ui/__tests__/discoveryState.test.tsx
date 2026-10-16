import './setupDom';
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DiscoveryView, type DiscoveryViewProps } from '../DiscoveryView';
import { win } from './setupDom';

let root: Root | undefined;

function renderDiscovery(initial: DiscoveryViewProps = {}) {
  let latest = initial;
  function Harness() {
    const [params, setParams] = useState<DiscoveryViewProps>({
      query: 'Complete Blood Count', radius: 3, ...initial,
    });
    latest = params;
    return <DiscoveryView {...params} onSearchChange={(next) => setParams((previous) => ({ ...previous, ...next }))} />;
  }
  const container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(<Harness />));
  return { container, params: () => latest };
}

function inputQuery(container: HTMLDivElement, value: string) {
  const input = container.querySelector<HTMLInputElement>('[role="combobox"]');
  assert.ok(input);
  const setter = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, 'value')?.set;
  assert.ok(setter);
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new win.Event('input', { bubbles: true }) as unknown as Event);
  });
  return input;
}

function click(container: HTMLDivElement, selector: string) {
  const element = container.querySelector<HTMLElement>(selector);
  assert.ok(element, selector);
  act(() => element.click());
}

function assertNoResults(container: HTMLDivElement) {
  assert.equal(container.querySelectorAll('.medimap-branch-card').length, 0);
  assert.equal(container.querySelectorAll('[data-testid^="map-pin-"]').length, 0);
}

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  win.document.body.innerHTML = '';
});

describe('Discovery state transitions', () => {
  for (const query of ['CT', 'unknown service', 'lipidd', '']) {
    it(`removes previous results immediately when the query changes to ${JSON.stringify(query)}`, () => {
      const { container, params } = renderDiscovery({ selectedBranchId: 'bsmmu-shahbagh' });
      assert.ok(container.querySelector('.medimap-branch-card'));
      inputQuery(container, query);
      assert.equal(params().query, query);
      assert.equal(params().selectedBranchId, undefined);
      assertNoResults(container);
      assert.doesNotMatch(container.querySelector('.medimap-active-filters-bar')?.textContent ?? '', /Complete Blood Count/);
    });
  }

  for (const query of ['CT', 'unknown service', 'lipidd', '']) {
    it(`updates the radius without confirming service ${JSON.stringify(query)}`, () => {
      const { container, params } = renderDiscovery();
      inputQuery(container, query);
      click(container, 'input[type="radio"][value="5"]');
      assert.equal(params().query, query);
      assert.equal(params().radius, 5);
      assert.equal(container.querySelector<HTMLInputElement>('input[value="5"]')?.checked, true);
      assert.match(container.querySelector('.medimap-active-filters-bar')?.textContent ?? '', /Straight-line radius:\s*5 km/);
      assertNoResults(container);
    });
  }

  it('clears results when the clear button or Change test action is used', () => {
    const { container, params } = renderDiscovery();
    click(container, 'button[aria-label="Clear search input"]');
    assert.equal(params().query, '');
    assertNoResults(container);
    const input = inputQuery(container, 'CBC');
    act(() => input.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }) as unknown as KeyboardEvent));
    act(() => input.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }) as unknown as KeyboardEvent));
    assert.ok(container.querySelector('.medimap-selected-service-banner'));
    assert.ok(container.querySelector('.medimap-branch-card'));
    click(container, '.medimap-selected-change-btn');
    assert.equal(params().query, '');
    assertNoResults(container);
    assert.equal(win.document.activeElement, input);
  });

  it('keeps the chosen radius when an ambiguous service is explicitly selected', () => {
    const { container, params } = renderDiscovery({ query: 'CT' });
    click(container, 'input[value="5"]');
    const input = container.querySelector<HTMLInputElement>('[role="combobox"]');
    assert.ok(input);
    act(() => input.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }) as unknown as KeyboardEvent));
    const candidate = Array.from(container.querySelectorAll<HTMLButtonElement>('.medimap-ambiguity-card'))
      .find((button) => button.textContent?.includes('CT Scan Chest'));
    assert.ok(candidate);
    act(() => candidate.click());
    assert.equal(params().query, 'CT Scan Chest');
    assert.equal(params().radius, 5);
    const cards = Array.from(container.querySelectorAll('.medimap-branch-card')).map((card) => card.id.replace('branch-card-', '')).sort();
    const pins = Array.from(container.querySelectorAll('[data-testid^="map-pin-"]')).map((pin) => pin.getAttribute('data-testid')?.replace('map-pin-', '')).sort();
    assert.ok(cards.length > 0);
    assert.deepEqual(pins, cards);
  });
});
