import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  checkTypoMatch,
  damerauLevenshteinDistance,
  DEFAULT_DIAGNOSTIC_CATALOG,
  normalizeText,
  resolveDiagnosticQuery,
  stripZeroWidth,
  tokenize,
} from '../index';

describe('normalizer', () => {
  it('strips zero-width characters', () => {
    // Zero-width space \u200B, ZWNJ \u200C, ZWJ \u200D, BOM \uFEFF
    const input = 'সি\u200Dবি\u200Cসি\u200B\uFEFF';
    const output = stripZeroWidth(input);
    assert.equal(output, 'সিবিসি');
  });

  it('normalizes Unicode NFKC, lowercases, and collapses whitespace', () => {
    const input = '  ＣＢＣ   Test \u200D  ';
    const output = normalizeText(input);
    assert.equal(output, 'cbc test');
  });

  it('handles empty and whitespace-only inputs', () => {
    assert.equal(normalizeText(''), '');
    assert.equal(normalizeText('    '), '');
  });

  it('tokenizes English and Bengali script words correctly', () => {
    const tokens = tokenize('Complete Blood Count (সিবিসি) - 100');
    assert.deepEqual(tokens, ['complete', 'blood', 'count', 'সিবিসি', '100']);
  });

  it('tokenizes multi-word Bengali queries', () => {
    const tokens = tokenize('লিপিড প্রোফাইল পরীক্ষা');
    assert.deepEqual(tokens, ['লিপিড', 'প্রোফাইল', 'পরীক্ষা']);
  });
});

describe('typoMatcher', () => {
  it('does not equate broad test categories or different variants with a specific test', () => {
    for (const query of ['KFT', 'Thyroid Profile', 'HRCT Chest', 'রক্ত পরীক্ষা', 'হার্ট পরীক্ষা']) {
      const result = resolveDiagnosticQuery(query);
      assert.ok(
        result.status !== 'resolved' || result.primaryMatch?.matchType === 'typo_suggestion',
        query,
      );
    }
  });

  it('rejects oversized queries before fuzzy matching', () => {
    const result = resolveDiagnosticQuery('blood '.repeat(1000));
    assert.equal(result.status, 'not_found');
    assert.deepEqual(result.matches, []);
  });
  it('calculates Damerau-Levenshtein distance with adjacent transposition', () => {
    // Adjacent transposition of 'a' and 'b'
    assert.equal(damerauLevenshteinDistance('ab', 'ba'), 1);
    // Adjacent transposition of 'e' and 'h'
    assert.equal(damerauLevenshteinDistance('tehs', 'tesh'), 1);
    // Insertion
    assert.equal(damerauLevenshteinDistance('lipid', 'lipidd'), 1);
    // Deletion
    assert.equal(damerauLevenshteinDistance('dengue', 'dengu'), 1);
    // Substitution
    assert.equal(damerauLevenshteinDistance('chest', 'chast'), 1);
  });

  it('guards against fuzzy matching short acronyms (<= 3 chars)', () => {
    // 3-char queries must never fuzzy match
    assert.equal(checkTypoMatch('cbc', 'cba').isMatch, false);
    assert.equal(checkTypoMatch('cba', 'cbc').isMatch, false);
    assert.equal(checkTypoMatch('ct', 'pt').isMatch, false);
    assert.equal(checkTypoMatch('mri', 'mra').isMatch, false);
    assert.equal(checkTypoMatch('usg', 'usa').isMatch, false);
  });

  it('applies 4-6 char threshold (max distance 1, similarity >= 0.8)', () => {
    // "lipid" (5) vs "lipidd" (6): distance 1, similarity 5/6 = 0.833 -> match
    const match1 = checkTypoMatch('lipidd', 'lipid');
    assert.equal(match1.isMatch, true);
    assert.equal(match1.distance, 1);
    assert.ok(match1.similarity >= 0.8);

    // "dengue" (6) vs "dengu" (5): distance 1, similarity 5/6 = 0.833 -> match
    const match2 = checkTypoMatch('dengu', 'dengue');
    assert.equal(match2.isMatch, true);
    assert.equal(match2.distance, 1);

    // Distance 2 on 5-character string must NOT match
    const match3 = checkTypoMatch('lapad', 'lipid');
    assert.equal(match3.isMatch, false);
  });

  it('applies >= 7 char threshold (max distance 2, similarity >= 0.75)', () => {
    // "creatinine" (10) vs "creatinin" (9): distance 1 -> match
    const match1 = checkTypoMatch('creatinin', 'creatinine');
    assert.equal(match1.isMatch, true);
    assert.equal(match1.distance, 1);
    assert.ok(match1.similarity >= 0.75);

    // "cholesterol" (11) vs "cholestrol" (10): distance 1 -> match
    const match2 = checkTypoMatch('cholestrol', 'cholesterol');
    assert.equal(match2.isMatch, true);
    assert.equal(match2.distance, 1);
  });
});

describe('resolutionEngine', () => {
  it('flags ambiguous prefix match for "usg" across multiple clinical services', () => {
    // "usg" prefix matches "USG of Whole Abdomen" and "USG of Pelvis"
    const result = resolveDiagnosticQuery('usg');
    assert.equal(result.status, 'ambiguous');
    assert.equal(result.requiresExplicitSelection, true);
    assert.equal(result.primaryMatch, undefined);
    assert.ok(result.matches.length >= 2);
  });

  it('flags ambiguous prefix match for "dengue"', () => {
    // "dengue" prefix matches "Dengue NS1 Antigen" and "Dengue Antibody IgG/IgM"
    const result = resolveDiagnosticQuery('dengue');
    assert.equal(result.status, 'ambiguous');
    assert.equal(result.requiresExplicitSelection, true);
    assert.equal(result.primaryMatch, undefined);
  });

  it('resolves unambiguous keyword match (Tier 4)', () => {
    // "count blood" contains tokens "count" and "blood" in reverse order
    const result = resolveDiagnosticQuery('count blood');
    assert.equal(result.status, 'resolved');
    assert.equal(result.requiresExplicitSelection, false);
    assert.ok(result.primaryMatch);
    assert.equal(result.primaryMatch.canonicalService.id, 'complete-blood-count');
    assert.equal(result.primaryMatch.matchType, 'keyword');
  });

  it('provides typo suggestion for single service (Tier 5)', () => {
    const result = resolveDiagnosticQuery('lipidd');
    assert.equal(result.status, 'resolved');
    assert.equal(result.requiresExplicitSelection, false);
    assert.ok(result.primaryMatch);
    assert.equal(result.primaryMatch.matchType, 'typo_suggestion');
    assert.equal(result.primaryMatch.canonicalService.id, 'lipid-profile');
    assert.ok(result.typoSuggestions && result.typoSuggestions.length > 0);
  });

  it('flags ambiguous typo suggestions across distinct services', () => {
    // "denguee" is a typo matching both Dengue NS1 Antigen and Dengue Antibody
    const result = resolveDiagnosticQuery('denguee');
    assert.equal(result.status, 'ambiguous');
    assert.equal(result.requiresExplicitSelection, true);
    assert.equal(result.primaryMatch, undefined);
    assert.ok(result.matches.length >= 2);
    assert.ok(result.typoSuggestions && result.typoSuggestions.length >= 2);
  });

  it('allows custom catalog injection', () => {
    const customCatalog = [DEFAULT_DIAGNOSTIC_CATALOG[0]];
    const result = resolveDiagnosticQuery('CBC', customCatalog);
    assert.equal(result.status, 'resolved');
    assert.equal(result.primaryMatch?.canonicalService.id, 'complete-blood-count');
  });
});
