import type { ReactNode } from 'react';
import type { CanonicalService, MatchType, QueryMatch, ResolutionResult } from '../types';

/**
 * Origin type for a completed search selection.
 */
export type SearchSelectionType =
  'suggestion' | 'ambiguity_resolution' | 'typo_correction' | 'direct';

/**
 * Result payload emitted when a diagnostic service is selected.
 */
export interface SearchSelection {
  readonly canonicalService: CanonicalService;
  readonly query: string;
  readonly selectionType: SearchSelectionType;
  readonly radiusKm: number;
}

/**
 * Classification of an auto-suggest item.
 */
export type SuggestionItemKind = 'service_match' | 'typo_suggestion';

/**
 * Individual item presented within the suggestions listbox.
 */
export interface SuggestionItem {
  readonly id: string;
  readonly kind: SuggestionItemKind;
  readonly canonicalService: CanonicalService;
  readonly label: string;
  readonly category: string;
  readonly matchedText?: string;
  readonly matchedAlias?: string;
  readonly matchedLanguage?: 'en' | 'bn';
  readonly matchType: MatchType;
  readonly typoDistance?: number;
  readonly typoSimilarity?: number;
}

/**
 * Ambiguous diagnostic match requiring explicit patient disambiguation.
 */
export interface AmbiguityItem {
  readonly canonicalService: CanonicalService;
  readonly matchType: MatchType;
  readonly matchedText: string;
}

/**
 * Radius presets supported by the segmented selector.
 */
export type RadiusPreset = 1 | 3 | 5 | 'custom';

/**
 * Props for the RadiusSelector component.
 */
export interface RadiusSelectorProps {
  readonly value: number;
  readonly onChange: (radiusKm: number) => void;
  readonly disabled?: boolean;
  readonly id?: string;
  readonly className?: string;
}

/**
 * Props for the SearchInput component.
 */
export interface SearchInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onDebouncedChange?: (value: string) => void;
  readonly debounceMs?: number;
  readonly onClear?: () => void;
  readonly onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  readonly placeholder?: string;
  readonly isLoading?: boolean;
  readonly isExpanded?: boolean;
  readonly ariaControls?: string;
  readonly ariaActiveDescendant?: string;
  readonly ariaLabel?: string;
  readonly inputRef?: React.RefObject<HTMLInputElement | null>;
  readonly id?: string;
  readonly announcement?: string;
  readonly disabled?: boolean;
  readonly autoFocus?: boolean;
  readonly endAdornment?: ReactNode;
}

/**
 * Props for the AutoSuggestDropdown component.
 */
export interface AutoSuggestDropdownProps {
  readonly id: string;
  readonly isOpen: boolean;
  readonly items: readonly SuggestionItem[];
  readonly activeIndex: number;
  readonly onSelect: (item: SuggestionItem) => void;
  readonly query: string;
  readonly isLoading?: boolean;
  readonly emptyMessage?: string;
}

/**
 * Props for the AmbiguityPrompt component.
 */
export interface AmbiguityPromptProps {
  readonly query: string;
  readonly matches: readonly QueryMatch[];
  readonly onSelect: (match: QueryMatch) => void;
  readonly onCancel?: () => void;
  readonly id?: string;
}

/**
 * Props for the primary DiagnosticSearchBox component.
 */
export interface DiagnosticSearchBoxProps {
  readonly onSelectService?: (selection: SearchSelection) => void;
  readonly onQueryChange?: (query: string) => void;
  readonly onRadiusChange?: (radiusKm: number) => void;
  readonly initialQuery?: string;
  readonly initialRadiusKm?: number;
  readonly debounceMs?: number;
  readonly catalog?: readonly CanonicalService[];
  readonly id?: string;
  readonly className?: string;
  readonly autoFocus?: boolean;
}

export type { ResolutionResult };
