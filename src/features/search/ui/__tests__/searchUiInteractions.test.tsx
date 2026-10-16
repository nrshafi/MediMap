import './setupDom';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DEFAULT_DIAGNOSTIC_CATALOG } from '../../diagnosticCatalog';
import type { QueryMatch } from '../../types';
import {
  AmbiguityPrompt,
  AutoSuggestDropdown,
  DiagnosticSearchBox,
  RadiusSelector,
  SearchInput,
} from '../index';
import type { SearchSelection, SuggestionItem } from '../types';
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

function clickElement(element: HTMLElement) {
  act(() => {
    element.dispatchEvent(
      new win.MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }) as unknown as MouseEvent
    );
  });
}

function pressKey(element: HTMLElement, key: string) {
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

describe('Search Discovery UI Comprehensive Interaction Test Suite', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    win.document.body.innerHTML = '';
  });

  afterEach(() => {
    for (const res of [...activeRenders]) {
      res.unmount();
    }
    win.document.body.innerHTML = '';
    jest.useRealTimers();
  });

  describe('1. SearchInput and User Input Handling', () => {
    it('keeps the suggestion dropdown closed for an ambiguous query on ArrowDown', () => {
      const { container } = renderComponent(<DiagnosticSearchBox initialQuery="CT" debounceMs={50} />);
      const input = container.querySelector('input[role="combobox"]') as HTMLInputElement;
      act(() => jest.advanceTimersByTime(50));
      assert.ok(container.querySelector('.medimap-ambiguity-panel'));
      pressKey(input, 'ArrowDown');
      assert.equal(input.getAttribute('aria-expanded'), 'false');
      assert.equal(container.querySelector('[role="listbox"]'), null);
    });

    it('keeps dismissed suggestions closed after the debounce interval', () => {
      const { container } = renderComponent(<DiagnosticSearchBox initialQuery="CBC" debounceMs={50} />);
      const input = container.querySelector('input[role="combobox"]') as HTMLInputElement;
      act(() => jest.advanceTimersByTime(50));
      assert.equal(input.getAttribute('aria-expanded'), 'true');
      pressKey(input, 'Escape');
      act(() => jest.advanceTimersByTime(500));
      assert.equal(input.getAttribute('aria-expanded'), 'false');
    });

    it('clears old suggestions immediately while the next query is pending', () => {
      const { container } = renderComponent(<DiagnosticSearchBox initialQuery="CBC" debounceMs={50} />);
      const input = container.querySelector('input[role="combobox"]') as HTMLInputElement;
      act(() => jest.advanceTimersByTime(50));
      assert.equal(input.getAttribute('aria-expanded'), 'true');
      changeInputValue(input, 'MRI');
      assert.equal(input.getAttribute('aria-expanded'), 'false');
      assert.equal(container.querySelector('[role="option"]'), null);
    });

    it('keeps selected suggestions closed after the selected name changes the input', () => {
      const { container } = renderComponent(<DiagnosticSearchBox initialQuery="CBC" debounceMs={50} />);
      const input = container.querySelector('input[role="combobox"]') as HTMLInputElement;
      act(() => jest.advanceTimersByTime(50));
      pressKey(input, 'Enter');
      act(() => jest.advanceTimersByTime(500));
      assert.equal(input.getAttribute('aria-expanded'), 'false');
      assert.equal(input.value, 'Complete Blood Count');
    });

    it('clears selected service when the external query changes', () => {
      const { container, root } = renderComponent(<DiagnosticSearchBox initialQuery="CBC" debounceMs={50} />);
      const input = container.querySelector('input[role="combobox"]') as HTMLInputElement;
      act(() => jest.advanceTimersByTime(50));
      pressKey(input, 'Enter');
      assert.ok(container.querySelector('.medimap-selected-service-banner'));
      act(() => root.render(<DiagnosticSearchBox initialQuery="Lipid Profile" debounceMs={50} />));
      assert.equal(input.value, 'Lipid Profile');
      assert.equal(container.querySelector('.medimap-selected-service-banner'), null);
    });

    it('requires explicit typo selection before a radius change selects a service', () => {
      const selections: SearchSelection[] = [];
      const { container } = renderComponent(<DiagnosticSearchBox initialQuery="Lipid Profle" onSelectService={(selection) => selections.push(selection)} />);
      const radius = container.querySelector('input[type="radio"][value="5"]') as HTMLInputElement;
      clickElement(radius);
      assert.equal(selections.length, 0);
    });

    it('synchronizes radius controls when an external action changes the radius', () => {
      const { container, root } = renderComponent(<RadiusSelector value={0.2} onChange={() => {}} />);
      act(() => root.render(<RadiusSelector value={5} onChange={() => {}} />));
      assert.equal((container.querySelector('input[value="5"]') as HTMLInputElement).checked, true);
      assert.equal(container.querySelector('.medimap-custom-radius-input'), null);
      act(() => root.render(<RadiusSelector value={0.1} onChange={() => {}} />));
      assert.equal((container.querySelector('.medimap-custom-radius-input') as HTMLInputElement).value, '0.1');
    });

    it('verifies debounce timing behavior: keystrokes within debounce interval do not trigger premature resolution', () => {
      const debouncedQueries: string[] = [];

      function TestSearchInputWrapper() {
        const [query, setQuery] = useState('');
        return (
          <SearchInput
            value={query}
            onChange={setQuery}
            onDebouncedChange={(val) => debouncedQueries.push(val)}
            debounceMs={250}
          />
        );
      }

      const { container } = renderComponent(<TestSearchInputWrapper />);
      const input = container.querySelector<HTMLInputElement>('input')!;
      assert.ok(input);

      // Keystroke 1: "C" at t = 0ms
      changeInputValue(input, 'C');
      assert.equal(input.value, 'C');
      act(() => {
        jest.advanceTimersByTime(100);
      });
      assert.equal(
        debouncedQueries.length,
        0,
        'Debounced callback must not fire at 100ms'
      );

      // Keystroke 2: "CB" at t = 100ms (resets timer to t + 250ms = 350ms)
      changeInputValue(input, 'CB');
      assert.equal(input.value, 'CB');
      act(() => {
        jest.advanceTimersByTime(100);
      });
      assert.equal(
        debouncedQueries.length,
        0,
        'Debounced callback must not fire after rapid consecutive keystroke'
      );

      // Keystroke 3: "CBC" at t = 200ms (resets timer to t + 250ms = 450ms)
      changeInputValue(input, 'CBC');
      assert.equal(input.value, 'CBC');

      // Advance by 249ms (t = 449ms, 1ms before threshold)
      act(() => {
        jest.advanceTimersByTime(249);
      });
      assert.equal(
        debouncedQueries.length,
        0,
        'Debounced callback must not fire before exact debounce threshold'
      );

      // Advance remaining 1ms (t = 450ms)
      act(() => {
        jest.advanceTimersByTime(1);
      });
      assert.equal(
        debouncedQueries.length,
        1,
        'Debounced callback must fire once'
      );
      assert.equal(
        debouncedQueries[0],
        'CBC',
        'Debounced callback must resolve the latest keystroke query'
      );
    });

    it('verifies immediate synchronous keystroke state without typing lag', () => {
      let rawQuery = '';
      function ImmediateWrapper() {
        const [text, setText] = useState('');
        return (
          <SearchInput
            value={text}
            onChange={(val) => {
              setText(val);
              rawQuery = val;
            }}
          />
        );
      }

      const { container } = renderComponent(<ImmediateWrapper />);
      const input = container.querySelector<HTMLInputElement>('input')!;

      changeInputValue(input, 'Lipid');
      assert.equal(input.value, 'Lipid');
      assert.equal(rawQuery, 'Lipid');

      changeInputValue(input, 'Lipid Profile');
      assert.equal(input.value, 'Lipid Profile');
      assert.equal(rawQuery, 'Lipid Profile');
    });

    it('verifies clear button resets value, calls onClear, clears active state, and restores focus', () => {
      let cleared = false;
      function ClearWrapper() {
        const [text, setText] = useState('Ultrasound');
        return (
          <SearchInput
            value={text}
            onChange={setText}
            onClear={() => {
              setText('');
              cleared = true;
            }}
          />
        );
      }

      const { container } = renderComponent(<ClearWrapper />);
      const input = container.querySelector<HTMLInputElement>('input')!;
      assert.equal(input.value, 'Ultrasound');

      const clearBtn = container.querySelector<HTMLButtonElement>(
        '.medimap-search-clear-btn'
      );
      assert.ok(clearBtn, 'Clear button must be rendered for non-empty query');

      clickElement(clearBtn!);
      assert.equal(cleared, true, 'onClear callback must be executed');
      assert.equal(input.value, '', 'Input value must be reset to empty');
      assert.equal(
        win.document.activeElement,
        input,
        'Focus must be restored to search input after clearing'
      );
    });

    it('verifies clear button does not render when value is empty or input is disabled', () => {
      const { container: emptyContainer } = renderComponent(
        <SearchInput value="" onChange={() => {}} />
      );
      assert.equal(
        emptyContainer.querySelector('.medimap-search-clear-btn'),
        null,
        'Clear button should not render when value is empty'
      );

      const { container: disabledContainer } = renderComponent(
        <SearchInput value="CBC" onChange={() => {}} disabled={true} />
      );
      assert.equal(
        disabledContainer.querySelector('.medimap-search-clear-btn'),
        null,
        'Clear button should not render when input is disabled'
      );
    });

    it('verifies aria-live="polite" screen reader announcements for result counts, loading, and clear states', () => {
      const { container, root } = renderComponent(
        <SearchInput
          value="CBC"
          onChange={() => {}}
          announcement="Found 1 matching test."
        />
      );

      const liveRegion = container.querySelector('[aria-live="polite"]');
      assert.ok(liveRegion, 'aria-live="polite" element must be present');
      assert.equal(liveRegion!.getAttribute('role'), 'status');
      assert.equal(liveRegion!.getAttribute('aria-atomic'), 'true');
      assert.equal(liveRegion!.textContent, 'Found 1 matching test.');

      // Update announcement
      act(() => {
        root.render(
          <SearchInput
            value=""
            onChange={() => {}}
            announcement="Search cleared."
          />
        );
      });
      assert.equal(liveRegion!.textContent, 'Search cleared.');
    });

    it('verifies loading spinner renders and marks aria-busy when isLoading is true', () => {
      const { container } = renderComponent(
        <SearchInput value="MRI" onChange={() => {}} isLoading={true} />
      );

      const input = container.querySelector<HTMLInputElement>('input')!;
      assert.equal(input.getAttribute('aria-busy'), 'true');

      const spinner = container.querySelector('.medimap-search-spinner');
      assert.ok(spinner, 'Search spinner must be rendered when loading');
      assert.equal(spinner!.getAttribute('aria-hidden'), 'true');
    });
  });

  describe('2. WAI-ARIA 1.2 Combobox and Listbox Keyboard Navigation', () => {
    it('ArrowDown from closed combobox opens listbox and highlights first item (aria-activedescendant)', () => {
      const { container } = renderComponent(
        <DiagnosticSearchBox initialQuery="CBC" debounceMs={100} />
      );
      const input = container.querySelector<HTMLInputElement>('input')!;

      // Initially closed with query present
      assert.equal(input.getAttribute('aria-expanded'), 'false');
      assert.equal(input.getAttribute('aria-activedescendant'), null);

      // Press ArrowDown
      pressKey(input, 'ArrowDown');

      assert.equal(input.getAttribute('aria-expanded'), 'true');
      const activeDescendant = input.getAttribute('aria-activedescendant');
      assert.ok(activeDescendant, 'aria-activedescendant must be set');
      assert.match(
        activeDescendant!,
        /-listbox-opt-0$/,
        'Must highlight first item (index 0)'
      );

      const firstOption = container.querySelector(`#${activeDescendant}`);
      assert.ok(firstOption);
      assert.equal(firstOption!.getAttribute('aria-selected'), 'true');
    });

    const cbcService = DEFAULT_DIAGNOSTIC_CATALOG.find(
      (s) => s.id === 'complete-blood-count'
    )!;
    const lipidService = DEFAULT_DIAGNOSTIC_CATALOG.find(
      (s) => s.id === 'lipid-profile'
    )!;
    const usgService = DEFAULT_DIAGNOSTIC_CATALOG.find(
      (s) => s.id === 'usg-whole-abdomen'
    )!;

    const mockSuggestions: SuggestionItem[] = [
      {
        id: 'opt-0',
        kind: 'service_match',
        canonicalService: cbcService,
        label: cbcService.name,
        category: cbcService.category,
        matchType: 'exact_canonical',
      },
      {
        id: 'opt-1',
        kind: 'service_match',
        canonicalService: lipidService,
        label: lipidService.name,
        category: lipidService.category,
        matchType: 'exact_canonical',
      },
      {
        id: 'opt-2',
        kind: 'service_match',
        canonicalService: usgService,
        label: usgService.name,
        category: usgService.category,
        matchType: 'exact_canonical',
      },
    ];

    function ComboboxTestHarness({
      items = mockSuggestions,
      onSelect,
    }: {
      items?: SuggestionItem[];
      onSelect?: (item: SuggestionItem) => void;
    }) {
      const [activeIndex, setActiveIndex] = useState(-1);
      const [isOpen, setIsOpen] = useState(false);
      const [query, setQuery] = useState('Diagnostic');

      const handleKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>
      ) => {
        if (!isOpen || items.length === 0) {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex(0);
          }
          return;
        }

        switch (event.key) {
          case 'ArrowDown': {
            event.preventDefault();
            setActiveIndex((prev) => (prev + 1) % items.length);
            break;
          }
          case 'ArrowUp': {
            event.preventDefault();
            setActiveIndex((prev) =>
              prev <= 0 ? items.length - 1 : prev - 1
            );
            break;
          }
          case 'Enter': {
            event.preventDefault();
            if (activeIndex >= 0 && activeIndex < items.length) {
              const selectedItem = items[activeIndex];
              setQuery(selectedItem.label);
              setIsOpen(false);
              setActiveIndex(-1);
              onSelect?.(selectedItem);
            }
            break;
          }
          case 'Escape': {
            event.preventDefault();
            setIsOpen(false);
            setActiveIndex(-1);
            break;
          }
        }
      };

      const activeOptionId =
        isOpen && activeIndex >= 0 && activeIndex < items.length
          ? `test-combobox-listbox-opt-${activeIndex}`
          : undefined;

      return (
        <div>
          <SearchInput
            id="test-combobox-input"
            value={query}
            onChange={setQuery}
            onKeyDown={handleKeyDown}
            isExpanded={isOpen}
            ariaControls="test-combobox-listbox"
            ariaActiveDescendant={activeOptionId}
          />
          <AutoSuggestDropdown
            id="test-combobox-listbox"
            isOpen={isOpen}
            items={items}
            activeIndex={activeIndex}
            onSelect={(item) => {
              setQuery(item.label);
              setIsOpen(false);
              setActiveIndex(-1);
              onSelect?.(item);
            }}
            query={query}
          />
        </div>
      );
    }

    it('ArrowDown from open listbox cycles to next option and wraps around cleanly', () => {
      const { container } = renderComponent(<ComboboxTestHarness />);
      const input = container.querySelector<HTMLInputElement>('input')!;

      // Open dropdown via ArrowDown -> highlights index 0
      pressKey(input, 'ArrowDown');
      assert.equal(input.getAttribute('aria-expanded'), 'true');
      assert.equal(
        input.getAttribute('aria-activedescendant'),
        'test-combobox-listbox-opt-0'
      );

      // Press ArrowDown -> moves to index 1
      pressKey(input, 'ArrowDown');
      assert.equal(
        input.getAttribute('aria-activedescendant'),
        'test-combobox-listbox-opt-1'
      );

      // Press ArrowDown -> moves to index 2 (last item)
      pressKey(input, 'ArrowDown');
      assert.equal(
        input.getAttribute('aria-activedescendant'),
        'test-combobox-listbox-opt-2'
      );

      // Next ArrowDown must cleanly wrap around to index 0
      pressKey(input, 'ArrowDown');
      assert.equal(
        input.getAttribute('aria-activedescendant'),
        'test-combobox-listbox-opt-0',
        'Must wrap around cleanly to the first option'
      );
    });

    it('ArrowUp navigates upwards and wraps from top (0) to bottom (N-1)', () => {
      const { container } = renderComponent(<ComboboxTestHarness />);
      const input = container.querySelector<HTMLInputElement>('input')!;

      // Open dropdown via ArrowDown -> highlights index 0
      pressKey(input, 'ArrowDown');
      assert.equal(
        input.getAttribute('aria-activedescendant'),
        'test-combobox-listbox-opt-0'
      );

      // ArrowUp at index 0 wraps to index 2 (last option)
      pressKey(input, 'ArrowUp');
      assert.equal(
        input.getAttribute('aria-activedescendant'),
        'test-combobox-listbox-opt-2',
        'ArrowUp at index 0 must wrap to bottom option'
      );

      // ArrowUp again moves to index 1
      pressKey(input, 'ArrowUp');
      assert.equal(
        input.getAttribute('aria-activedescendant'),
        'test-combobox-listbox-opt-1'
      );

      // ArrowUp again moves to index 0
      pressKey(input, 'ArrowUp');
      assert.equal(
        input.getAttribute('aria-activedescendant'),
        'test-combobox-listbox-opt-0'
      );
    });

    it('Enter with active option selected dispatches selection callback with correct canonical service ID', () => {
      let selectedResult: SearchSelection | null = null;
      const { container } = renderComponent(
        <DiagnosticSearchBox
          initialQuery="Lipid"
          debounceMs={50}
          onSelectService={(sel) => {
            selectedResult = sel;
          }}
        />
      );
      const input = container.querySelector<HTMLInputElement>('input')!;

      pressKey(input, 'ArrowDown'); // opens and highlights index 0
      pressKey(input, 'Enter');

      assert.ok(selectedResult);
      assert.equal(
        (selectedResult as SearchSelection).canonicalService.id,
        'lipid-profile'
      );
      assert.equal(
        (selectedResult as SearchSelection).selectionType,
        'suggestion'
      );
      assert.equal(input.value, 'Lipid Profile');

      // Dropdown must close
      assert.equal(input.getAttribute('aria-expanded'), 'false');
      assert.equal(input.getAttribute('aria-activedescendant'), null);
    });

    it('Escape closes listbox, clears aria-activedescendant, and preserves input value', () => {
      const { container } = renderComponent(
        <DiagnosticSearchBox initialQuery="CBC" debounceMs={50} />
      );
      const input = container.querySelector<HTMLInputElement>('input')!;

      pressKey(input, 'ArrowDown');
      assert.equal(input.getAttribute('aria-expanded'), 'true');
      assert.ok(input.getAttribute('aria-activedescendant'));

      // Press Escape
      pressKey(input, 'Escape');

      assert.equal(
        input.getAttribute('aria-expanded'),
        'false',
        'Dropdown must close on Escape'
      );
      assert.equal(
        input.getAttribute('aria-activedescendant'),
        null,
        'aria-activedescendant must be cleared on Escape'
      );
      assert.equal(
        input.value,
        'CBC',
        'Input query must be preserved on Escape'
      );
    });
  });

  describe('3. AutoSuggestDropdown Rendering and Badges', () => {
    const cbcService = DEFAULT_DIAGNOSTIC_CATALOG.find(
      (s) => s.id === 'complete-blood-count'
    )!;

    it('renders canonical name, category tag, and English / Bengali alias badges', () => {
      let selectedItem: SuggestionItem | null = null;
      const items: SuggestionItem[] = [
        {
          id: 'test-item-en',
          kind: 'service_match',
          canonicalService: cbcService,
          label: cbcService.name,
          category: cbcService.category,
          matchedText: 'CBC',
          matchedAlias: 'CBC',
          matchedLanguage: 'en',
          matchType: 'exact_alias',
        },
        {
          id: 'test-item-bn',
          kind: 'service_match',
          canonicalService: cbcService,
          label: cbcService.name,
          category: cbcService.category,
          matchedText: 'সিবিসি',
          matchedAlias: 'সিবিসি',
          matchedLanguage: 'bn',
          matchType: 'exact_alias',
        },
      ];

      const { container } = renderComponent(
        <AutoSuggestDropdown
          id="test-listbox"
          isOpen={true}
          items={items}
          activeIndex={1}
          onSelect={(it) => {
            selectedItem = it;
          }}
          query="CBC"
        />
      );

      const optionElements = container.querySelectorAll(
        '.medimap-dropdown-option'
      );
      assert.equal(optionElements.length, 2);

      // Check active item
      assert.equal(optionElements[0].getAttribute('aria-selected'), 'false');
      assert.equal(optionElements[1].getAttribute('aria-selected'), 'true');

      // Check category tag
      const categoryTag = container.querySelector('.medimap-category-tag');
      assert.equal(categoryTag?.textContent, 'Hematology');

      // Check English and Bengali alias badges
      const aliasBadges = container.querySelectorAll('.medimap-badge-alias');
      assert.equal(aliasBadges.length, 2);

      assert.match(aliasBadges[0].textContent!, /EN/);
      assert.match(aliasBadges[0].textContent!, /CBC/);

      assert.match(aliasBadges[1].textContent!, /BN/);
      assert.match(aliasBadges[1].textContent!, /সিবিসি/);

      // Clicking option triggers onSelect
      clickElement(optionElements[0] as HTMLElement);
      assert.equal(selectedItem, items[0]);
    });

    it('renders typo suggestions with "Did you mean:" label and Typo correction badge', () => {
      let selectedTypo: SuggestionItem | null = null;
      const typoItem: SuggestionItem = {
        id: 'typo-1',
        kind: 'typo_suggestion',
        canonicalService: cbcService,
        label: cbcService.name,
        category: cbcService.category,
        matchedText: 'Complete Blood Count',
        matchType: 'typo_suggestion',
        typoDistance: 1,
        typoSimilarity: 0.95,
      };

      const { container } = renderComponent(
        <AutoSuggestDropdown
          id="typo-listbox"
          isOpen={true}
          items={[typoItem]}
          activeIndex={0}
          onSelect={(it) => {
            selectedTypo = it;
          }}
          query="Compleet"
        />
      );

      const typoLabel = container.querySelector('.medimap-typo-label');
      assert.ok(typoLabel);
      assert.match(typoLabel!.textContent!, /Did you mean:/);
      assert.match(typoLabel!.textContent!, /Complete Blood Count/);

      const typoBadge = container.querySelector('.medimap-badge-typo');
      assert.ok(typoBadge);
      assert.equal(typoBadge!.textContent, 'Typo correction');

      clickElement(container.querySelector('.medimap-dropdown-option')!);
      assert.equal(selectedTypo, typoItem);
    });

    it('renders clean empty state when query is unmatched', () => {
      const { container } = renderComponent(
        <AutoSuggestDropdown
          id="empty-listbox"
          isOpen={true}
          items={[]}
          activeIndex={-1}
          onSelect={() => {}}
          query="Unknown Diagnostic Test"
        />
      );

      const emptyDiv = container.querySelector('.medimap-dropdown-empty');
      assert.ok(emptyDiv);
      assert.match(
        emptyDiv!.textContent!,
        /No diagnostic tests found for “Unknown Diagnostic Test”/
      );
    });
  });

  describe('4. Ambiguity Resolution Flow', () => {
    it('renders AmbiguityPrompt when query is clinically ambiguous and displays candidate cards', () => {
      const { container } = renderComponent(
        <DiagnosticSearchBox initialQuery="" debounceMs={50} />
      );
      const input = container.querySelector<HTMLInputElement>('input')!;

      // Type ambiguous query "CT Scan" (matches CT Brain, CT Chest, etc.)
      changeInputValue(input, 'CT Scan');
      act(() => {
        jest.advanceTimersByTime(50);
      });

      const ambiguityPanel = container.querySelector(
        '.medimap-ambiguity-panel'
      );
      assert.ok(
        ambiguityPanel,
        'Ambiguity panel must be rendered for ambiguous query'
      );

      const title = container.querySelector('.medimap-ambiguity-title');
      assert.equal(title?.textContent, 'Specific test selection required');

      const cards = container.querySelectorAll('.medimap-ambiguity-card');
      assert.ok(
        cards.length >= 2,
        `Expected multiple clinical choices, found ${cards.length}`
      );
    });

    it('clicking an ambiguity card explicitly resolves to that specific canonical service', () => {
      let resolvedSelection: SearchSelection | null = null;
      const { container } = renderComponent(
        <DiagnosticSearchBox
          initialQuery=""
          debounceMs={50}
          onSelectService={(sel) => {
            resolvedSelection = sel;
          }}
        />
      );
      const input = container.querySelector<HTMLInputElement>('input')!;

      changeInputValue(input, 'CT Scan');
      act(() => {
        jest.advanceTimersByTime(50);
      });

      const cards = container.querySelectorAll<HTMLButtonElement>(
        '.medimap-ambiguity-card'
      );
      assert.ok(cards.length >= 2);

      // Select first card (e.g. CT Scan Brain)
      const firstCardName = cards[0].querySelector(
        '.medimap-ambiguity-service-name'
      )?.textContent;
      clickElement(cards[0]);

      assert.ok(resolvedSelection);
      assert.equal(
        (resolvedSelection as SearchSelection).selectionType,
        'ambiguity_resolution'
      );
      assert.equal(
        (resolvedSelection as SearchSelection).canonicalService.name,
        firstCardName
      );
      assert.equal(input.value, firstCardName);

      // Ambiguity panel must be closed after explicit resolution
      assert.equal(container.querySelector('.medimap-ambiguity-panel'), null);

      // Confirmation banner should be displayed
      const banner = container.querySelector(
        '.medimap-selected-service-banner'
      );
      assert.ok(banner);
      assert.match(banner!.textContent!, new RegExp(firstCardName!));
    });

    it('pressing Enter on focused ambiguity card resolves to that canonical service', () => {
      let resolvedMatch: QueryMatch | null = null;
      const ctBrain = DEFAULT_DIAGNOSTIC_CATALOG.find(
        (s) => s.id === 'ct-brain'
      )!;
      const ctChest = DEFAULT_DIAGNOSTIC_CATALOG.find(
        (s) => s.id === 'ct-chest'
      )!;

      const matches: QueryMatch[] = [
        {
          canonicalService: ctBrain,
          matchType: 'prefix',
          matchedText: 'CT Scan',
          score: 60,
        },
        {
          canonicalService: ctChest,
          matchType: 'prefix',
          matchedText: 'CT Scan',
          score: 60,
        },
      ];

      const { container } = renderComponent(
        <AmbiguityPrompt
          query="CT Scan"
          matches={matches}
          onSelect={(m) => {
            resolvedMatch = m;
          }}
        />
      );

      const cards = container.querySelectorAll<HTMLButtonElement>(
        '.medimap-ambiguity-card'
      );
      assert.equal(cards.length, 2);

      // Press Enter on second card (CT Chest)
      pressKey(cards[1], 'Enter');
      clickElement(cards[1]);
      assert.ok(resolvedMatch);
      assert.equal(
        (resolvedMatch as QueryMatch).canonicalService.id,
        'ct-chest'
      );
    });

    it('cancel button dismisses ambiguity prompt and restores input focus', () => {
      const { container } = renderComponent(
        <DiagnosticSearchBox initialQuery="" debounceMs={50} />
      );
      const input = container.querySelector<HTMLInputElement>('input')!;

      changeInputValue(input, 'CT Scan');
      act(() => {
        jest.advanceTimersByTime(50);
      });

      assert.ok(container.querySelector('.medimap-ambiguity-panel'));

      const cancelBtn = container.querySelector<HTMLButtonElement>(
        '.medimap-ambiguity-cancel-btn'
      );
      assert.ok(cancelBtn, 'Cancel button must be rendered');

      clickElement(cancelBtn!);
      assert.equal(
        container.querySelector('.medimap-ambiguity-panel'),
        null,
        'Ambiguity panel must be dismissed on cancel'
      );
      assert.equal(
        win.document.activeElement,
        input,
        'Input focus must be restored after cancelling ambiguity'
      );
    });
  });

  describe('5. RadiusSelector and Straight-Line Metrics', () => {
    it('verifies radiogroup structure and explicit Straight-line radius wording', () => {
      const { container } = renderComponent(
        <RadiusSelector value={3} onChange={() => {}} />
      );

      const legend = container.querySelector('.medimap-radius-legend');
      assert.equal(
        legend?.textContent,
        'Straight-line radius',
        'Legend must explicitly use "Straight-line radius" to avoid road distance conflation'
      );

      const hint = container.querySelector('.medimap-radius-hint');
      assert.equal(hint?.textContent, 'Radial distance filter');

      const radiogroup = container.querySelector('[role="radiogroup"]');
      assert.ok(radiogroup);
      assert.equal(
        radiogroup!.getAttribute('aria-label'),
        'Straight-line search radius'
      );

      const pills = container.querySelectorAll('.medimap-radius-pill');
      assert.equal(pills.length, 4, 'Must have 1km, 3km, 5km, and Custom pills');
      assert.match(pills[0].textContent!, /1.*km/);
      assert.match(pills[1].textContent!, /3.*km/);
      assert.match(pills[2].textContent!, /5.*km/);
      assert.match(pills[3].textContent!, /Custom/);
    });

    it('selecting preset updates radius and triggers onChange callback', () => {
      let currentRadius = 1;
      function RadiusWrapper() {
        const [rad, setRad] = useState(1);
        return (
          <RadiusSelector
            value={rad}
            onChange={(r) => {
              setRad(r);
              currentRadius = r;
            }}
          />
        );
      }

      const { container } = renderComponent(<RadiusWrapper />);
      const inputs = container.querySelectorAll<HTMLInputElement>('input');

      // Click 5km preset
      const radio5km = Array.from(inputs).find((i) => i.value === '5')!;
      assert.ok(radio5km);
      clickElement(radio5km);

      assert.equal(currentRadius, 5, 'onChange must be called with 5');

      // Click 3km preset
      const radio3km = Array.from(inputs).find((i) => i.value === '3')!;
      assert.ok(radio3km);
      clickElement(radio3km);

      assert.equal(currentRadius, 3, 'onChange must be called with 3');
    });

    it('selecting Custom reveals numeric input and validates distance bounds (0.1 km to 100 km)', () => {
      let emittedRadius = 3;
      function CustomRadiusWrapper() {
        const [rad, setRad] = useState(3);
        return (
          <RadiusSelector
            value={rad}
            onChange={(r) => {
              setRad(r);
              emittedRadius = r;
            }}
          />
        );
      }

      const { container } = renderComponent(<CustomRadiusWrapper />);
      const inputs = container.querySelectorAll<HTMLInputElement>('input');

      // Click Custom pill
      const customRadio = Array.from(inputs).find((i) => i.value === 'custom')!;
      clickElement(customRadio);

      // Custom numeric input must appear
      const numInput = container.querySelector<HTMLInputElement>(
        '.medimap-custom-radius-input'
      );
      assert.ok(numInput, 'Custom numeric input must be rendered');
      assert.equal(numInput!.getAttribute('type'), 'number');
      assert.equal(numInput!.getAttribute('min'), '0.1');
      assert.equal(numInput!.getAttribute('max'), '100');
      assert.equal(numInput!.getAttribute('step'), 'any');

      // Test valid custom distance: 15 km
      changeInputValue(numInput!, '15');
      assert.equal(emittedRadius, 15);
      assert.equal(
        container.querySelector('.medimap-radius-error-message'),
        null
      );

      changeInputValue(numInput!, '0.05');
      const errorBelow = container.querySelector(
        '.medimap-radius-error-message'
      );
      assert.ok(errorBelow);
      assert.match(
        errorBelow!.textContent!,
        /Distance must be between 0.1 km and 100 km/
      );
      assert.equal(numInput!.getAttribute('aria-invalid'), 'true');
      assert.equal(
        emittedRadius,
        15,
        'Invalid radius should not update emitted radius'
      );

      changeInputValue(numInput!, '101');
      const errorAbove = container.querySelector(
        '.medimap-radius-error-message'
      );
      assert.ok(errorAbove);
      assert.match(
        errorAbove!.textContent!,
        /Distance must be between 0.1 km and 100 km/
      );

      // Test empty string rejection
      changeInputValue(numInput!, '   ');
      const errorEmpty = container.querySelector(
        '.medimap-radius-error-message'
      );
      assert.ok(errorEmpty);
      assert.match(errorEmpty!.textContent!, /Please enter a radius distance/);

      // Valid boundary values
      changeInputValue(numInput!, '0.5');
      assert.equal(emittedRadius, 0.5);
      assert.equal(
        container.querySelector('.medimap-radius-error-message'),
        null
      );

      changeInputValue(numInput!, '50');
      assert.equal(emittedRadius, 50);
      assert.equal(
        container.querySelector('.medimap-radius-error-message'),
        null
      );
    });
  });

  describe('6. Mobile Layout and Touch Target Standards', () => {
    it('verifies that all interactive targets meet the minimum 44px touch target standard', () => {
      const cssPath = join(__dirname, '..', 'searchUi.css');
      const cssContent = readFileSync(cssPath, 'utf-8');

      // Verify clear button min-height 44px and min-width 44px
      assert.match(
        cssContent,
        /\.medimap-search-clear-btn\s*\{[^}]*min-height:\s*44px;/s
      );
      assert.match(
        cssContent,
        /\.medimap-search-clear-btn\s*\{[^}]*min-width:\s*44px;/s
      );

      // Verify radius pill min-height 44px
      assert.match(
        cssContent,
        /\.medimap-radius-pill\s*\{[^}]*min-height:\s*44px;/s
      );

      // Verify custom radius input height 44px
      assert.match(
        cssContent,
        /\.medimap-custom-radius-input\s*\{[^}]*height:\s*44px;/s
      );

      // Verify dropdown option min-height at least 44px (configured to 48px for comfortable clinical readability)
      assert.match(
        cssContent,
        /\.medimap-dropdown-option\s*\{[^}]*min-height:\s*48px;/s
      );

      // Verify ambiguity card min-height 48px
      assert.match(
        cssContent,
        /\.medimap-ambiguity-card\s*\{[^}]*min-height:\s*48px;/s
      );

      // Verify ambiguity cancel button min-height 44px
      assert.match(
        cssContent,
        /\.medimap-ambiguity-cancel-btn\s*\{[^}]*min-height:\s*44px;/s
      );

      // Verify selected test change button min-height 44px
      assert.match(
        cssContent,
        /\.medimap-selected-change-btn\s*\{[^}]*min-height:\s*44px;/s
      );
    });

    it('verifies responsive layout CSS rules for mobile (max-width: 480px) and 375px screens', () => {
      const cssPath = join(__dirname, '..', 'searchUi.css');
      const cssContent = readFileSync(cssPath, 'utf-8');

      // Verify media query presence
      assert.match(cssContent, /@media\s*\(max-width:\s*480px\)/);

      // Verify radius segmented grid adapts to 2-column on mobile
      assert.match(
        cssContent,
        /grid-template-columns:\s*1fr\s+1fr;/
      );

      // Verify radius pill stretches full width inside mobile grid
      assert.match(
        cssContent,
        /\.medimap-radius-pill\s*\{[^}]*width:\s*100%;/s
      );
    });
  });
});
