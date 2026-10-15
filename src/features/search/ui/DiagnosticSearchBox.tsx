import {
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { DEFAULT_DIAGNOSTIC_CATALOG } from '../diagnosticCatalog';
import { resolveDiagnosticQuery } from '../resolutionEngine';
import type {
  CanonicalService,
  QueryMatch,
  ResolutionResult,
} from '../types';
import { AmbiguityPrompt } from './AmbiguityPrompt';
import { AutoSuggestDropdown } from './AutoSuggestDropdown';
import { RadiusSelector } from './RadiusSelector';
import { SearchInput } from './SearchInput';
import type {
  DiagnosticSearchBoxProps,
  SearchSelection,
  SuggestionItem,
} from './types';

/**
 * Diagnostic search box integrating debounced search, auto-suggestions,
 * explicit clinical ambiguity resolution, and straight-line radius configuration.
 */
export function DiagnosticSearchBox({
  onSelectService,
  initialQuery = '',
  initialRadiusKm = 3,
  debounceMs = 250,
  catalog = DEFAULT_DIAGNOSTIC_CATALOG,
  id,
  className = '',
  autoFocus = false,
}: DiagnosticSearchBoxProps) {
  const generatedId = useId();
  const boxId = id ?? `medimap-search-box-${generatedId}`;
  const listboxId = `${boxId}-listbox`;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = useState(initialQuery);
  const [radiusKm, setRadiusKm] = useState(initialRadiusKm);
  const [selectedService, setSelectedService] = useState<CanonicalService | null>(
    null
  );
  const [resolutionResult, setResolutionResult] =
    useState<ResolutionResult | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [announcement, setAnnouncement] = useState('');

  // Close dropdown on outside click
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, []);

  // Compute suggestion items from current resolution result
  const suggestionItems: readonly SuggestionItem[] = (() => {
    if (!resolutionResult) {
      return [];
    }

    const items: SuggestionItem[] = [];

    // Add match results
    if (resolutionResult.status === 'resolved' && resolutionResult.matches) {
      for (let i = 0; i < resolutionResult.matches.length; i++) {
        const match = resolutionResult.matches[i];
        const service = match.canonicalService;
        const matchedAlias =
          match.matchedText.toLowerCase() !== service.name.toLowerCase()
            ? match.matchedText
            : undefined;

        // Find language of matched alias if available
        let matchedLanguage: 'en' | 'bn' | undefined;
        if (matchedAlias) {
          const aliasObj = service.aliases.find(
            (a) => a.alias.toLowerCase() === matchedAlias.toLowerCase()
          );
          if (aliasObj) {
            matchedLanguage = aliasObj.language;
          }
        }

        items.push({
          id: `${service.id}-match-${i}`,
          kind: 'service_match',
          canonicalService: service,
          label: service.name,
          category: service.category,
          matchedText: match.matchedText,
          matchedAlias,
          matchedLanguage,
          matchType: match.matchType,
        });
      }
    }

    // Add typo suggestions
    if (resolutionResult.typoSuggestions) {
      for (let i = 0; i < resolutionResult.typoSuggestions.length; i++) {
        const typo = resolutionResult.typoSuggestions[i];
        items.push({
          id: `${typo.canonicalService.id}-typo-${i}`,
          kind: 'typo_suggestion',
          canonicalService: typo.canonicalService,
          label: typo.canonicalService.name,
          category: typo.canonicalService.category,
          matchedText: typo.matchedAliasOrName,
          matchType: 'typo_suggestion',
          typoDistance: typo.distance,
          typoSimilarity: typo.similarity,
        });
      }
    }

    return items;
  })();

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    if (selectedService) {
      setSelectedService(null);
    }

    if (newQuery.trim() === '') {
      setResolutionResult(null);
      setIsDropdownOpen(false);
      setActiveIndex(-1);
      setAnnouncement('Search cleared.');
    }
  };

  const handleDebouncedResolve = (textToResolve: string) => {
    const trimmed = textToResolve.trim();
    if (trimmed === '') {
      return;
    }

    const result = resolveDiagnosticQuery(trimmed, catalog);
    setResolutionResult(result);
    setActiveIndex(-1);

    if (result.status === 'ambiguous') {
      setIsDropdownOpen(false);
      setAnnouncement(
        `Multiple diagnostic tests match "${trimmed}". Explicit selection is required.`
      );
    } else if (result.status === 'resolved') {
      setIsDropdownOpen(true);
      setAnnouncement(
        `Found ${result.matches.length} matching test${
          result.matches.length === 1 ? '' : 's'
        }.`
      );
    } else {
      // not_found
      setIsDropdownOpen(true);
      if (result.typoSuggestions && result.typoSuggestions.length > 0) {
        setAnnouncement(
          `No exact match found. Displaying ${result.typoSuggestions.length} typo suggestions.`
        );
      } else {
        setAnnouncement(`No diagnostic tests found for "${trimmed}".`);
      }
    }
  };

  const handleSuggestionSelect = (item: SuggestionItem) => {
    const service = item.canonicalService;
    setSelectedService(service);
    setQuery(service.name);
    setIsDropdownOpen(false);
    setActiveIndex(-1);
    setResolutionResult(null);

    const selection: SearchSelection = {
      canonicalService: service,
      query: service.name,
      selectionType:
        item.kind === 'typo_suggestion' ? 'typo_correction' : 'suggestion',
      radiusKm,
    };

    setAnnouncement(`Selected ${service.name}.`);
    if (onSelectService) {
      onSelectService(selection);
    }
  };

  const handleAmbiguitySelect = (match: QueryMatch) => {
    const service = match.canonicalService;
    setSelectedService(service);
    setQuery(service.name);
    setResolutionResult(null);
    setIsDropdownOpen(false);
    setActiveIndex(-1);

    const selection: SearchSelection = {
      canonicalService: service,
      query: service.name,
      selectionType: 'ambiguity_resolution',
      radiusKm,
    };

    setAnnouncement(`Resolved and selected ${service.name}.`);
    if (onSelectService) {
      onSelectService(selection);
    }
  };

  const handleAmbiguityCancel = () => {
    setResolutionResult(null);
    inputRef.current?.focus();
  };

  const handleRadiusChange = (newRadiusKm: number) => {
    setRadiusKm(newRadiusKm);
    if (selectedService && onSelectService) {
      onSelectService({
        canonicalService: selectedService,
        query: selectedService.name,
        selectionType: 'direct',
        radiusKm: newRadiusKm,
      });
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || suggestionItems.length === 0) {
      if (event.key === 'ArrowDown' && query.trim() !== '') {
        event.preventDefault();
        if (!resolutionResult) {
          const result = resolveDiagnosticQuery(query.trim(), catalog);
          setResolutionResult(result);
          if (result.status === 'resolved' && result.matches.length > 0) {
            setIsDropdownOpen(true);
            setActiveIndex(0);
            setAnnouncement(
              `Found ${result.matches.length} matching test${
                result.matches.length === 1 ? '' : 's'
              }.`
            );
          } else if (result.status === 'ambiguous') {
            setIsDropdownOpen(false);
          } else {
            setIsDropdownOpen(true);
            setActiveIndex(-1);
          }
        } else {
          setIsDropdownOpen(true);
          if (suggestionItems.length > 0) {
            setActiveIndex(0);
          }
        }
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % suggestionItems.length);
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        setActiveIndex((prev) =>
          prev <= 0 ? suggestionItems.length - 1 : prev - 1
        );
        break;
      }
      case 'Enter': {
        event.preventDefault();
        if (activeIndex >= 0 && activeIndex < suggestionItems.length) {
          handleSuggestionSelect(suggestionItems[activeIndex]);
        } else if (suggestionItems.length === 1) {
          handleSuggestionSelect(suggestionItems[0]);
        }
        break;
      }
      case 'Escape': {
        event.preventDefault();
        setIsDropdownOpen(false);
        setActiveIndex(-1);
        break;
      }
    }
  };

  const activeOptionId =
    isDropdownOpen && activeIndex >= 0 && activeIndex < suggestionItems.length
      ? `${listboxId}-opt-${activeIndex}`
      : undefined;

  const isAmbiguous =
    resolutionResult?.status === 'ambiguous' &&
    resolutionResult.matches.length > 0;

  return (
    <div
      ref={containerRef}
      id={boxId}
      className={`medimap-search-card ${className}`.trim()}
    >
      <div className="medimap-search-card-header">
        <h2 className="medimap-search-card-title">
          Search Diagnostic Services
        </h2>
        <p className="medimap-search-card-subtitle">
          Find accredited diagnostic tests, compare verified branch prices, and
          locate nearby centers.
        </p>
      </div>

      <div className="medimap-search-field-container">
        <SearchInput
          id={`${boxId}-input`}
          inputRef={inputRef}
          value={query}
          onChange={handleQueryChange}
          onDebouncedChange={handleDebouncedResolve}
          debounceMs={debounceMs}
          onKeyDown={handleKeyDown}
          isExpanded={isDropdownOpen}
          ariaControls={listboxId}
          ariaActiveDescendant={activeOptionId}
          announcement={announcement}
          autoFocus={autoFocus}
        />

        <AutoSuggestDropdown
          id={listboxId}
          isOpen={isDropdownOpen}
          items={suggestionItems}
          activeIndex={activeIndex}
          onSelect={handleSuggestionSelect}
          query={query}
        />
      </div>

      {/* Clinical ambiguity resolution prompt */}
      {isAmbiguous && resolutionResult ? (
        <AmbiguityPrompt
          id={`${boxId}-ambiguity`}
          query={resolutionResult.query}
          matches={resolutionResult.matches}
          onSelect={handleAmbiguitySelect}
          onCancel={handleAmbiguityCancel}
        />
      ) : null}

      {/* Selected service confirmation card */}
      {selectedService ? (
        <div
          className="medimap-selected-service-banner"
          role="status"
          aria-label={`Selected service: ${selectedService.name}`}
        >
          <div className="medimap-selected-service-info">
            <span className="medimap-selected-badge">Selected test</span>
            <span className="medimap-selected-name">
              {selectedService.name}
            </span>
            <span className="medimap-selected-category">
              {selectedService.category}
            </span>
          </div>
          <button
            type="button"
            className="medimap-selected-change-btn"
            onClick={() => {
              setSelectedService(null);
              setQuery('');
              inputRef.current?.focus();
            }}
          >
            Change test
          </button>
        </div>
      ) : null}

      {/* Radius selector */}
      <div className="medimap-search-radius-wrapper">
        <RadiusSelector
          id={`${boxId}-radius`}
          value={radiusKm}
          onChange={handleRadiusChange}
        />
      </div>
    </div>
  );
}
