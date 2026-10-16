import { DEFAULT_DIAGNOSTIC_CATALOG } from './diagnosticCatalog';
import { normalizeText, tokenize } from './normalizer';
import { checkTypoMatch } from './typoMatcher';
import type {
  CanonicalService,
  QueryMatch,
  ResolutionResult,
  TypoSuggestion,
} from './types';

interface ScoredCandidate {
  readonly text: string;
  readonly score: number;
}

export const MAX_SEARCH_QUERY_LENGTH = 256;

interface TypoCandidate {
  readonly service: CanonicalService;
  readonly matchedText: string;
  readonly distance: number;
  readonly similarity: number;
}

/**
 * Evaluate tier matches and identify ambiguities.
 *
 * If the highest match tier maps to multiple distinct canonical services,
 * the query is ambiguous and requires explicit user selection.
 */
function evaluateTierMatches(
  query: string,
  normalizedQuery: string,
  matches: readonly QueryMatch[],
  typoSuggestions?: readonly TypoSuggestion[]
): ResolutionResult {
  if (matches.length === 0) {
    return {
      query,
      normalizedQuery,
      status: 'not_found',
      requiresExplicitSelection: false,
      matches: [],
      ...(typoSuggestions ? { typoSuggestions } : {}),
    };
  }

  // Sort matches by score in descending order
  const sortedMatches = [...matches].sort((a, b) => b.score - a.score);

  // Group matches by unique canonical service ID
  const distinctServiceMap = new Map<string, QueryMatch>();
  for (const match of sortedMatches) {
    if (!distinctServiceMap.has(match.canonicalService.id)) {
      distinctServiceMap.set(match.canonicalService.id, match);
    }
  }

  const distinctMatches = Array.from(distinctServiceMap.values());

  // Exactly one distinct service matches: query is resolved
  if (distinctMatches.length === 1) {
    return {
      query,
      normalizedQuery,
      status: 'resolved',
      requiresExplicitSelection: false,
      primaryMatch: distinctMatches[0],
      matches: distinctMatches,
      ...(typoSuggestions ? { typoSuggestions } : {}),
    };
  }

  // Multiple distinct services match: query is ambiguous
  return {
    query,
    normalizedQuery,
    status: 'ambiguous',
    requiresExplicitSelection: true,
    primaryMatch: undefined,
    matches: distinctMatches,
    ...(typoSuggestions ? { typoSuggestions } : {}),
  };
}

/**
 * Resolve a diagnostic search query against the canonical service catalog.
 *
 * Precedence order:
 * 1. Exact canonical name match
 * 2. Exact alias match (English or Bengali)
 * 3. Prefix match (canonical or alias)
 * 4. Keyword match (word-level containment in canonical or alias)
 * 5. Typo suggestions (Damerau-Levenshtein distance)
 *
 * Enforces ambiguity detection:
 * If the highest tier matches multiple clinically distinct services,
 * the function marks status as 'ambiguous' and sets requiresExplicitSelection to true.
 */
export function resolveDiagnosticQuery(
  query: string,
  catalog: readonly CanonicalService[] = DEFAULT_DIAGNOSTIC_CATALOG
): ResolutionResult {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery || normalizedQuery.length > MAX_SEARCH_QUERY_LENGTH) {
    return {
      query,
      normalizedQuery: '',
      status: 'not_found',
      requiresExplicitSelection: false,
      matches: [],
    };
  }

  // Tier 1: Exact canonical name match
  const exactCanonicalMatches: QueryMatch[] = [];
  for (const service of catalog) {
    if (normalizeText(service.name) === normalizedQuery) {
      exactCanonicalMatches.push({
        canonicalService: service,
        matchType: 'exact_canonical',
        matchedText: service.name,
        score: 100,
      });
    }
  }

  if (exactCanonicalMatches.length > 0) {
    return evaluateTierMatches(query, normalizedQuery, exactCanonicalMatches);
  }

  // Tier 2: Exact alias match (English or Bengali)
  const exactAliasMatches: QueryMatch[] = [];
  for (const service of catalog) {
    for (const alias of service.aliases) {
      if (normalizeText(alias.alias) === normalizedQuery) {
        exactAliasMatches.push({
          canonicalService: service,
          matchType: 'exact_alias',
          matchedText: alias.alias,
          score: 90,
        });
        break;
      }
    }
  }

  if (exactAliasMatches.length > 0) {
    return evaluateTierMatches(query, normalizedQuery, exactAliasMatches);
  }

  // Tier 3: Prefix match (canonical name or alias)
  const prefixMatches: QueryMatch[] = [];
  for (const service of catalog) {
    let bestMatch: ScoredCandidate | null = null;

    const normalizedName = normalizeText(service.name);
    if (normalizedName.startsWith(normalizedQuery)) {
      const ratio = normalizedQuery.length / normalizedName.length;
      const score = 70 + Math.round(ratio * 15);
      bestMatch = { text: service.name, score };
    }

    for (const alias of service.aliases) {
      const normalizedAlias = normalizeText(alias.alias);
      if (normalizedAlias.startsWith(normalizedQuery)) {
        const ratio = normalizedQuery.length / normalizedAlias.length;
        const score = 70 + Math.round(ratio * 15);
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { text: alias.alias, score };
        }
      }
    }

    if (bestMatch) {
      prefixMatches.push({
        canonicalService: service,
        matchType: 'prefix',
        matchedText: bestMatch.text,
        score: bestMatch.score,
      });
    }
  }

  if (prefixMatches.length > 0) {
    return evaluateTierMatches(query, normalizedQuery, prefixMatches);
  }

  // Tier 4: Keyword match (word-level containment)
  const queryTokens = tokenize(normalizedQuery);
  const keywordMatches: QueryMatch[] = [];

  if (queryTokens.length > 0) {
    for (const service of catalog) {
      let bestMatch: ScoredCandidate | null = null;

      // Check canonical name tokens
      const nameTokens = tokenize(service.name);
      const nameMatchesAll = queryTokens.every((token) => nameTokens.includes(token));
      if (nameMatchesAll) {
        const ratio = queryTokens.length / Math.max(nameTokens.length, 1);
        const score = 50 + Math.round(ratio * 15);
        bestMatch = { text: service.name, score };
      }

      // Check alias tokens
      for (const alias of service.aliases) {
        const aliasTokens = tokenize(alias.alias);
        const aliasMatchesAll = queryTokens.every((token) => aliasTokens.includes(token));
        if (aliasMatchesAll) {
          const ratio = queryTokens.length / Math.max(aliasTokens.length, 1);
          const score = 50 + Math.round(ratio * 15);
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { text: alias.alias, score };
          }
        }
      }

      if (bestMatch) {
        keywordMatches.push({
          canonicalService: service,
          matchType: 'keyword',
          matchedText: bestMatch.text,
          score: bestMatch.score,
        });
      }
    }
  }

  if (keywordMatches.length > 0) {
    return evaluateTierMatches(query, normalizedQuery, keywordMatches);
  }

  // Tier 5: Typo suggestions
  const typoCandidates: TypoCandidate[] = [];

  for (const service of catalog) {
    let bestCandidate: TypoCandidate | null = null;

    const considerTarget = (targetText: string, displayText: string) => {
      const normalizedTarget = normalizeText(targetText);
      const result = checkTypoMatch(normalizedQuery, normalizedTarget);

      if (result.isMatch) {
        const isBetter =
          !bestCandidate ||
          result.similarity > bestCandidate.similarity ||
          (result.similarity === bestCandidate.similarity &&
            result.distance < bestCandidate.distance);

        if (isBetter) {
          bestCandidate = {
            service,
            matchedText: displayText,
            distance: result.distance,
            similarity: result.similarity,
          };
        }
      }
    };

    // Check canonical name
    considerTarget(service.name, service.name);

    // Check aliases
    for (const alias of service.aliases) {
      considerTarget(alias.alias, alias.alias);
    }

    // When query is a single word, check tokens of length >= 4
    if (queryTokens.length === 1) {
      const nameTokens = tokenize(service.name);
      for (const token of nameTokens) {
        if (token.length >= 4) {
          considerTarget(token, service.name);
        }
      }

      for (const alias of service.aliases) {
        const aliasTokens = tokenize(alias.alias);
        for (const token of aliasTokens) {
          if (token.length >= 4) {
            considerTarget(token, alias.alias);
          }
        }
      }
    }

    if (bestCandidate) {
      typoCandidates.push(bestCandidate);
    }
  }

  if (typoCandidates.length > 0) {
    typoCandidates.sort((a, b) => {
      if (b.similarity !== a.similarity) {
        return b.similarity - a.similarity;
      }
      return a.distance - b.distance;
    });

    const typoSuggestions: TypoSuggestion[] = typoCandidates.map((candidate) => ({
      suggestedQuery: candidate.matchedText,
      canonicalService: candidate.service,
      distance: candidate.distance,
      similarity: candidate.similarity,
      matchedAliasOrName: candidate.matchedText,
    }));

    const typoMatches: QueryMatch[] = typoCandidates.map((candidate) => ({
      canonicalService: candidate.service,
      matchType: 'typo_suggestion',
      matchedText: candidate.matchedText,
      score: Math.round(candidate.similarity * 40),
    }));

    return evaluateTierMatches(
      query,
      normalizedQuery,
      typoMatches,
      typoSuggestions
    );
  }

  // No matches in any tier
  return {
    query,
    normalizedQuery,
    status: 'not_found',
    requiresExplicitSelection: false,
    matches: [],
    typoSuggestions: [],
  };
}

