/**
 * Diagnostic search domain types.
 */

export interface ServiceAlias {
  readonly alias: string;
  readonly language: 'en' | 'bn';
  readonly isAcronym?: boolean;
}

export interface CanonicalService {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly description?: string;
  readonly aliases: readonly ServiceAlias[];
}

export type MatchType =
  | 'exact_canonical'
  | 'exact_alias'
  | 'prefix'
  | 'keyword'
  | 'typo_suggestion';

export interface QueryMatch {
  readonly canonicalService: CanonicalService;
  readonly matchType: MatchType;
  readonly matchedText: string;
  readonly score: number;
}

export interface TypoSuggestion {
  readonly suggestedQuery: string;
  readonly canonicalService: CanonicalService;
  readonly distance: number;
  readonly similarity: number;
  readonly matchedAliasOrName: string;
}

export interface ResolutionResult {
  readonly query: string;
  readonly normalizedQuery: string;
  readonly status: 'resolved' | 'ambiguous' | 'not_found';
  readonly requiresExplicitSelection: boolean;
  readonly primaryMatch?: QueryMatch;
  readonly matches: readonly QueryMatch[];
  readonly typoSuggestions?: readonly TypoSuggestion[];
}

