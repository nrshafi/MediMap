import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToString } from 'react-dom/server';
import { DEFAULT_DIAGNOSTIC_CATALOG } from '../../diagnosticCatalog';
import type { QueryMatch } from '../../types';
import {
  AmbiguityPrompt,
  AutoSuggestDropdown,
  DiagnosticSearchBox,
  RadiusSelector,
  SearchInput,
} from '../index';
import type { SuggestionItem } from '../types';

describe('Search Discovery UI Components', () => {
  describe('SearchInput', () => {
    it('renders with WAI-ARIA 1.2 Combobox attributes', () => {
      const html = renderToString(
        <SearchInput
          id="test-input"
          value="CBC"
          onChange={() => {}}
          isExpanded={true}
          ariaControls="test-listbox"
          ariaActiveDescendant="test-listbox-opt-0"
          announcement="1 suggestion available"
        />
      );

      assert.match(html, /role="combobox"/);
      assert.match(html, /aria-expanded="true"/);
      assert.match(html, /aria-haspopup="listbox"/);
      assert.match(html, /aria-controls="test-listbox"/);
      assert.match(html, /aria-autocomplete="list"/);
      assert.match(html, /aria-activedescendant="test-listbox-opt-0"/);
      assert.match(html, /aria-live="polite"/);
      assert.match(html, /1 suggestion available/);
    });

    it('renders clear button when value is present and hides when value is empty', () => {
      const htmlWithVal = renderToString(
        <SearchInput value="Lipid" onChange={() => {}} />
      );
      assert.match(htmlWithVal, /aria-label="Clear search input"/);

      const htmlEmpty = renderToString(
        <SearchInput value="" onChange={() => {}} />
      );
      assert.doesNotMatch(htmlEmpty, /aria-label="Clear search input"/);
    });

    it('renders search spinner when isLoading is true', () => {
      const html = renderToString(
        <SearchInput value="USG" isLoading={true} onChange={() => {}} />
      );
      assert.match(html, /medimap-search-spinner/);
      assert.match(html, /aria-busy="true"/);
    });
  });

  describe('AutoSuggestDropdown', () => {
    const cbcService = DEFAULT_DIAGNOSTIC_CATALOG.find(
      (s) => s.id === 'complete-blood-count'
    )!;

    const testItems: SuggestionItem[] = [
      {
        id: 'cbc-item-0',
        kind: 'service_match',
        canonicalService: cbcService,
        label: cbcService.name,
        category: cbcService.category,
        matchedText: 'সিবিসি',
        matchedAlias: 'সিবিসি',
        matchedLanguage: 'bn',
        matchType: 'exact_alias',
      },
      {
        id: 'typo-item-1',
        kind: 'typo_suggestion',
        canonicalService: cbcService,
        label: cbcService.name,
        category: cbcService.category,
        matchedText: 'Complete Blood Count',
        matchType: 'typo_suggestion',
        typoDistance: 1,
        typoSimilarity: 0.9,
      },
    ];

    it('returns empty output when isOpen is false', () => {
      const html = renderToString(
        <AutoSuggestDropdown
          id="test-dropdown"
          isOpen={false}
          items={testItems}
          activeIndex={-1}
          onSelect={() => {}}
          query="CBC"
        />
      );
      assert.equal(html, '');
    });

    it('renders listbox with accessible options, alias badges, and typo suggestions', () => {
      const html = renderToString(
        <AutoSuggestDropdown
          id="test-dropdown"
          isOpen={true}
          items={testItems}
          activeIndex={0}
          onSelect={() => {}}
          query="CBC"
        />
      );

      assert.match(html, /role="listbox"/);
      assert.match(html, /role="option"/);
      assert.match(html, /aria-selected="true"/);
      assert.match(html, /Complete Blood Count/);
      assert.match(html, /Hematology/);
      // Bengali alias badge
      assert.match(html, /BN/);
      assert.match(html, /সিবিসি/);
      // Typo suggestion
      assert.match(html, /Did you mean:/);
      assert.match(html, /Typo correction/);
    });

    it('renders clean empty state when no items match', () => {
      const html = renderToString(
        <AutoSuggestDropdown
          id="test-dropdown"
          isOpen={true}
          items={[]}
          activeIndex={-1}
          onSelect={() => {}}
          query="Unrecognized Test"
        />
      );

      assert.match(html, /No diagnostic tests found for/);
      assert.match(html, /Unrecognized Test/);
    });
  });

  describe('AmbiguityPrompt', () => {
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

    it('returns empty output when matches array is empty', () => {
      const html = renderToString(
        <AmbiguityPrompt
          query="CT"
          matches={[]}
          onSelect={() => {}}
        />
      );
      assert.equal(html, '');
    });

    it('renders explicit selection prompt and distinct candidate cards', () => {
      const html = renderToString(
        <AmbiguityPrompt
          query="CT Scan"
          matches={matches}
          onSelect={() => {}}
          onCancel={() => {}}
        />
      );

      assert.match(html, /Specific test selection required/);
      assert.match(html, /Multiple diagnostic tests match/);
      assert.match(html, /CT Scan Brain/);
      assert.match(html, /CT Scan Chest/);
      assert.match(html, /Radiology/);
      assert.match(html, /Cancel and edit query/);
    });
  });

  describe('RadiusSelector', () => {
    it('renders straight-line radius label in accordance with architecture invariant', () => {
      const html = renderToString(
        <RadiusSelector value={3} onChange={() => {}} />
      );

      assert.match(html, /Straight-line radius/);
      assert.match(html, /Radial distance filter/);
      assert.match(html, /1.*km/);
      assert.match(html, /3.*km/);
      assert.match(html, /5.*km/);
      assert.match(html, /Custom/);
    });

    it('renders custom input when value is not a standard preset', () => {
      const html = renderToString(
        <RadiusSelector value={12} onChange={() => {}} />
      );

      assert.match(html, /Custom straight-line distance \(km\):/);
      assert.match(html, /value="12"/);
      assert.match(html, /min="0.1"/);
      assert.match(html, /max="100"/);
      assert.match(html, /step="any"/);
    });
  });

  describe('DiagnosticSearchBox', () => {
    it('renders integrated search discovery card', () => {
      const html = renderToString(
        <DiagnosticSearchBox
          initialQuery="Lipid"
          initialRadiusKm={5}
        />
      );

      assert.match(html, /Search Diagnostic Services/);
      assert.match(html, /role="combobox"/);
      assert.match(html, /Straight-line radius/);
      assert.match(html, /value="Lipid"/);
    });
  });
});
