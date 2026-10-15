/**
 * Diagnostic alias resolution engine exports.
 */

export type {
  CanonicalService,
  MatchType,
  QueryMatch,
  ResolutionResult,
  ServiceAlias,
  TypoSuggestion,
} from './types';

export {
  normalizeText,
  stripZeroWidth,
  tokenize,
} from './normalizer';

export type { TypoMatchResult } from './typoMatcher';
export {
  calculateSimilarity,
  checkTypoMatch,
  damerauLevenshteinDistance,
} from './typoMatcher';

export { DEFAULT_DIAGNOSTIC_CATALOG } from './diagnosticCatalog';

export { resolveDiagnosticQuery } from './resolutionEngine';

export {
  AmbiguityPrompt,
  AutoSuggestDropdown,
  DiagnosticSearchBox,
  RadiusSelector,
  SearchInput,
} from './ui';

export type {
  AmbiguityItem,
  AmbiguityPromptProps,
  AutoSuggestDropdownProps,
  DiagnosticSearchBoxProps,
  RadiusPreset,
  RadiusSelectorProps,
  SearchInputProps,
  SearchSelection,
  SearchSelectionType,
  SuggestionItem,
  SuggestionItemKind,
} from './ui';

