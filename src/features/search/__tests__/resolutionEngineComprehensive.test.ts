import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  resolveDiagnosticQuery,
  checkTypoMatch,
  damerauLevenshteinDistance,
  type CanonicalService,
} from '../index';

describe('Exact Canonical Match', () => {
  it('matches canonical name regardless of case', () => {
    const lowercaseResult = resolveDiagnosticQuery('complete blood count');
    assert.equal(lowercaseResult.status, 'resolved');
    assert.equal(lowercaseResult.requiresExplicitSelection, false);
    assert.ok(lowercaseResult.primaryMatch);
    assert.equal(lowercaseResult.primaryMatch.matchType, 'exact_canonical');
    assert.equal(lowercaseResult.primaryMatch.canonicalService.id, 'complete-blood-count');
    assert.equal(lowercaseResult.primaryMatch.score, 100);

    const uppercaseResult = resolveDiagnosticQuery('COMPLETE BLOOD COUNT');
    assert.equal(uppercaseResult.status, 'resolved');
    assert.equal(uppercaseResult.requiresExplicitSelection, false);
    assert.ok(uppercaseResult.primaryMatch);
    assert.equal(uppercaseResult.primaryMatch.matchType, 'exact_canonical');
    assert.equal(uppercaseResult.primaryMatch.canonicalService.id, 'complete-blood-count');

    const mixedResult = resolveDiagnosticQuery('LiPiD PrOfILe');
    assert.equal(mixedResult.status, 'resolved');
    assert.ok(mixedResult.primaryMatch);
    assert.equal(mixedResult.primaryMatch.canonicalService.id, 'lipid-profile');
  });

  it('handles fullwidth Unicode variations with NFKC normalization', () => {
    // Fullwidth 'Lipid Profile'
    const fullwidthQuery = 'Ｌｉｐｉｄ　Ｐｒｏｆｉｌｅ';
    const result = resolveDiagnosticQuery(fullwidthQuery);
    assert.equal(result.status, 'resolved');
    assert.equal(result.requiresExplicitSelection, false);
    assert.ok(result.primaryMatch);
    assert.equal(result.primaryMatch.matchType, 'exact_canonical');
    assert.equal(result.primaryMatch.canonicalService.id, 'lipid-profile');
  });

  it('handles zero-width characters in query', () => {
    // Zero-width space \u200B, ZWNJ \u200C, ZWJ \u200D, word joiner \u2060, BOM \uFEFF
    const queryWithZeroWidth = 'Serum\u200B \u200CCreatinine\u200D\u2060\uFEFF';
    const result = resolveDiagnosticQuery(queryWithZeroWidth);
    assert.equal(result.status, 'resolved');
    assert.equal(result.requiresExplicitSelection, false);
    assert.ok(result.primaryMatch);
    assert.equal(result.primaryMatch.matchType, 'exact_canonical');
    assert.equal(result.primaryMatch.canonicalService.id, 'serum-creatinine');
  });

  it('matches canonical name when surrounding and multiple whitespaces exist', () => {
    const result = resolveDiagnosticQuery('   Serum    Creatinine   ');
    assert.equal(result.status, 'resolved');
    assert.ok(result.primaryMatch);
    assert.equal(result.primaryMatch.matchType, 'exact_canonical');
    assert.equal(result.primaryMatch.canonicalService.id, 'serum-creatinine');
  });
});

describe('Exact Alias Match', () => {
  it('matches English abbreviations and aliases', () => {
    const cbcResult = resolveDiagnosticQuery('CBC');
    assert.equal(cbcResult.status, 'resolved');
    assert.equal(cbcResult.requiresExplicitSelection, false);
    assert.ok(cbcResult.primaryMatch);
    assert.equal(cbcResult.primaryMatch.matchType, 'exact_alias');
    assert.equal(cbcResult.primaryMatch.canonicalService.id, 'complete-blood-count');
    assert.equal(cbcResult.primaryMatch.score, 90);

    const fbcResult = resolveDiagnosticQuery('FBC');
    assert.equal(fbcResult.status, 'resolved');
    assert.ok(fbcResult.primaryMatch);
    assert.equal(fbcResult.primaryMatch.matchType, 'exact_alias');
    assert.equal(fbcResult.primaryMatch.canonicalService.id, 'complete-blood-count');

    const fbsResult = resolveDiagnosticQuery('FBS');
    assert.equal(fbsResult.status, 'resolved');
    assert.ok(fbsResult.primaryMatch);
    assert.equal(fbsResult.primaryMatch.matchType, 'exact_alias');
    assert.equal(fbsResult.primaryMatch.canonicalService.id, 'fasting-blood-sugar');

    const cxrResult = resolveDiagnosticQuery('CXR');
    assert.equal(cxrResult.status, 'resolved');
    assert.ok(cxrResult.primaryMatch);
    assert.equal(cxrResult.primaryMatch.matchType, 'exact_alias');
    assert.equal(cxrResult.primaryMatch.canonicalService.id, 'xray-chest');
  });

  it('matches Bengali script aliases', () => {
    const cbcBengaliResult = resolveDiagnosticQuery('সিবিসি');
    assert.equal(cbcBengaliResult.status, 'resolved');
    assert.equal(cbcBengaliResult.requiresExplicitSelection, false);
    assert.ok(cbcBengaliResult.primaryMatch);
    assert.equal(cbcBengaliResult.primaryMatch.matchType, 'exact_alias');
    assert.equal(cbcBengaliResult.primaryMatch.canonicalService.id, 'complete-blood-count');

    const bloodTestResult = resolveDiagnosticQuery('রক্ত পরীক্ষা');
    assert.equal(bloodTestResult.status, 'resolved');
    assert.ok(bloodTestResult.primaryMatch);
    assert.equal(bloodTestResult.primaryMatch.matchType, 'exact_alias');
    assert.equal(bloodTestResult.primaryMatch.canonicalService.id, 'complete-blood-count');

    const lipidBengaliResult = resolveDiagnosticQuery('লিপিড প্রোফাইল');
    assert.equal(lipidBengaliResult.status, 'resolved');
    assert.ok(lipidBengaliResult.primaryMatch);
    assert.equal(lipidBengaliResult.primaryMatch.matchType, 'exact_alias');
    assert.equal(lipidBengaliResult.primaryMatch.canonicalService.id, 'lipid-profile');

    const urineBengaliResult = resolveDiagnosticQuery('ইউরিন আর/ই');
    assert.equal(urineBengaliResult.status, 'resolved');
    assert.ok(urineBengaliResult.primaryMatch);
    assert.equal(urineBengaliResult.primaryMatch.matchType, 'exact_alias');
    assert.equal(urineBengaliResult.primaryMatch.canonicalService.id, 'urine-routine');
  });

  it('handles Bengali script with embedded zero-width characters', () => {
    const queryWithZw = 'সি\u200Dবি\u200Cসি\uFEFF';
    const result = resolveDiagnosticQuery(queryWithZw);
    assert.equal(result.status, 'resolved');
    assert.ok(result.primaryMatch);
    assert.equal(result.primaryMatch.matchType, 'exact_alias');
    assert.equal(result.primaryMatch.canonicalService.id, 'complete-blood-count');
  });
});

describe('Prefix Matching', () => {
  it('matches canonical name prefixes', () => {
    const bloodPrefixResult = resolveDiagnosticQuery('Complete Blood');
    assert.equal(bloodPrefixResult.status, 'resolved');
    assert.equal(bloodPrefixResult.requiresExplicitSelection, false);
    assert.ok(bloodPrefixResult.primaryMatch);
    assert.equal(bloodPrefixResult.primaryMatch.matchType, 'prefix');
    assert.equal(bloodPrefixResult.primaryMatch.canonicalService.id, 'complete-blood-count');

    const lipidPrefixResult = resolveDiagnosticQuery('Lipid');
    // Note: 'Lipid' is an alias for lipid-profile, so it matches via exact_alias or prefix
    assert.equal(lipidPrefixResult.status, 'resolved');
    assert.ok(lipidPrefixResult.primaryMatch);
    assert.equal(lipidPrefixResult.primaryMatch.canonicalService.id, 'lipid-profile');
  });

  it('matches alias prefixes in English and Bengali', () => {
    const cholestPrefix = resolveDiagnosticQuery('Cholest');
    assert.equal(cholestPrefix.status, 'resolved');
    assert.ok(cholestPrefix.primaryMatch);
    assert.equal(cholestPrefix.primaryMatch.matchType, 'prefix');
    assert.equal(cholestPrefix.primaryMatch.canonicalService.id, 'lipid-profile');

    // Custom catalog to verify Bengali prefix cleanly without ambiguity
    const customCatalog: CanonicalService[] = [
      {
        id: 'cbc-test',
        name: 'CBC Service',
        category: 'Hematology',
        aliases: [{ alias: 'সিবিসি টেস্ট', language: 'bn' }],
      },
    ];
    const bengaliPrefixResult = resolveDiagnosticQuery('সিবি', customCatalog);
    assert.equal(bengaliPrefixResult.status, 'resolved');
    assert.ok(bengaliPrefixResult.primaryMatch);
    assert.equal(bengaliPrefixResult.primaryMatch.matchType, 'prefix');
    assert.equal(bengaliPrefixResult.primaryMatch.canonicalService.id, 'cbc-test');
  });
});

describe('Keyword Matching', () => {
  it('matches tokens in different orders', () => {
    const reorderedQuery = 'Count Blood Complete';
    const result = resolveDiagnosticQuery(reorderedQuery);
    assert.equal(result.status, 'resolved');
    assert.equal(result.requiresExplicitSelection, false);
    assert.ok(result.primaryMatch);
    assert.equal(result.primaryMatch.matchType, 'keyword');
    assert.equal(result.primaryMatch.canonicalService.id, 'complete-blood-count');

    const reversedLipid = 'profile lipid';
    const lipidResult = resolveDiagnosticQuery(reversedLipid);
    assert.equal(lipidResult.status, 'resolved');
    assert.ok(lipidResult.primaryMatch);
    assert.equal(lipidResult.primaryMatch.matchType, 'keyword');
    assert.equal(lipidResult.primaryMatch.canonicalService.id, 'lipid-profile');
  });

  it('matches partial token subsets uniquely', () => {
    const result = resolveDiagnosticQuery('brain scan ct');
    assert.equal(result.status, 'resolved');
    assert.equal(result.requiresExplicitSelection, false);
    assert.ok(result.primaryMatch);
    assert.equal(result.primaryMatch.matchType, 'keyword');
    assert.equal(result.primaryMatch.canonicalService.id, 'ct-brain');
  });
});

describe('Strict Precedence Order', () => {
  it('ranks canonical exact over alias exact', () => {
    // Construct test catalog where Service A has name "Test Alpha" and alias "Overlap",
    // while Service B has name "Overlap" and alias "Beta".
    const precedenceCatalog: CanonicalService[] = [
      {
        id: 'service-a',
        name: 'Test Alpha',
        category: 'General',
        aliases: [{ alias: 'Overlap', language: 'en' }],
      },
      {
        id: 'service-b',
        name: 'Overlap',
        category: 'General',
        aliases: [{ alias: 'Beta', language: 'en' }],
      },
    ];

    const result = resolveDiagnosticQuery('Overlap', precedenceCatalog);
    assert.equal(result.status, 'resolved');
    assert.ok(result.primaryMatch);
    assert.equal(result.primaryMatch.matchType, 'exact_canonical');
    assert.equal(result.primaryMatch.canonicalService.id, 'service-b');
    assert.equal(result.primaryMatch.score, 100);
  });

  it('ranks alias exact over prefix match', () => {
    // Construct test catalog where Service A has prefix "Echo" on name "Echocardiogram",
    // while Service B has alias "Echo".
    const precedenceCatalog: CanonicalService[] = [
      {
        id: 'service-prefix',
        name: 'Echo Location Scan',
        category: 'Radiology',
        aliases: [],
      },
      {
        id: 'service-alias',
        name: 'Ultrasound Examination',
        category: 'Radiology',
        aliases: [{ alias: 'Echo', language: 'en' }],
      },
    ];

    const result = resolveDiagnosticQuery('Echo', precedenceCatalog);
    assert.equal(result.status, 'resolved');
    assert.ok(result.primaryMatch);
    assert.equal(result.primaryMatch.matchType, 'exact_alias');
    assert.equal(result.primaryMatch.canonicalService.id, 'service-alias');
    assert.equal(result.primaryMatch.score, 90);
  });

  it('ranks prefix match over keyword match', () => {
    // Construct catalog where query "Blood" is a prefix for "Blood Culture"
    // and a non-prefix keyword in "Complete Blood Count".
    const precedenceCatalog: CanonicalService[] = [
      {
        id: 'blood-culture',
        name: 'Blood Culture',
        category: 'Microbiology',
        aliases: [],
      },
      {
        id: 'complete-blood-count',
        name: 'Complete Blood Count',
        category: 'Hematology',
        aliases: [],
      },
    ];

    const result = resolveDiagnosticQuery('Blood', precedenceCatalog);
    assert.equal(result.status, 'resolved');
    assert.ok(result.primaryMatch);
    assert.equal(result.primaryMatch.matchType, 'prefix');
    assert.equal(result.primaryMatch.canonicalService.id, 'blood-culture');
  });

  it('ranks keyword match over typo suggestion', () => {
    // Query "Count" is an exact keyword in "Complete Blood Count"
    // and a typo distance 1 from "Mount" (if catalog had it).
    const precedenceCatalog: CanonicalService[] = [
      {
        id: 'service-keyword',
        name: 'Blood Cell Count',
        category: 'Hematology',
        aliases: [],
      },
      {
        id: 'service-typo',
        name: 'Mount Specimen',
        category: 'Pathology',
        aliases: [{ alias: 'Mount', language: 'en' }],
      },
    ];

    const result = resolveDiagnosticQuery('Count', precedenceCatalog);
    assert.equal(result.status, 'resolved');
    assert.ok(result.primaryMatch);
    assert.equal(result.primaryMatch.matchType, 'keyword');
    assert.equal(result.primaryMatch.canonicalService.id, 'service-keyword');
  });
});

describe('Typo Suggestion Generation', () => {
  it('corrects adjacent transposition errors', () => {
    assert.equal(damerauLevenshteinDistance('liipd', 'lipid'), 1); // insertion
    assert.equal(damerauLevenshteinDistance('lpide', 'lipid'), 2);
    assert.equal(damerauLevenshteinDistance('lpiid', 'lipid'), 1); // transposition 'ip' -> 'pi'

    const transpositionResult = resolveDiagnosticQuery('lpiid');
    assert.equal(transpositionResult.status, 'resolved');
    assert.ok(transpositionResult.primaryMatch);
    assert.equal(transpositionResult.primaryMatch.matchType, 'typo_suggestion');
    assert.equal(transpositionResult.primaryMatch.canonicalService.id, 'lipid-profile');

    const creatanineResult = resolveDiagnosticQuery('creatanine');
    assert.equal(creatanineResult.status, 'resolved');
    assert.ok(creatanineResult.primaryMatch);
    assert.equal(creatanineResult.primaryMatch.matchType, 'typo_suggestion');
    assert.equal(creatanineResult.primaryMatch.canonicalService.id, 'serum-creatinine');
  });

  it('corrects single insertion, deletion, and substitution', () => {
    // Insertion: 'lipidd' -> 'lipid'
    const insertionResult = resolveDiagnosticQuery('lipidd');
    assert.equal(insertionResult.status, 'resolved');
    assert.ok(insertionResult.primaryMatch);
    assert.equal(insertionResult.primaryMatch.canonicalService.id, 'lipid-profile');

    // Deletion: 'urina' -> 'urine'
    const deletionMatch = checkTypoMatch('urina', 'urine');
    assert.equal(deletionMatch.isMatch, true);
    assert.equal(deletionMatch.distance, 1);

    // Substitution: 'chast' -> 'chest'
    const substitutionMatch = checkTypoMatch('chast', 'chest');
    assert.equal(substitutionMatch.isMatch, true);
    assert.equal(substitutionMatch.distance, 1);
  });

  it('enforces 4-6 character threshold: max distance 1, similarity >= 0.8', () => {
    // 5 chars vs 5 chars, distance 1: similarity 4/5 = 0.8 -> match
    const validMatch = checkTypoMatch('faste', 'fasts');
    assert.equal(validMatch.isMatch, true);
    assert.equal(validMatch.distance, 1);
    assert.ok(validMatch.similarity >= 0.8);

    // 5 chars vs 5 chars, distance 2: similarity 3/5 = 0.6 -> no match
    const invalidMatch = checkTypoMatch('lapad', 'lipid');
    assert.equal(invalidMatch.isMatch, false);
    assert.equal(invalidMatch.distance, 2);
  });

  it('enforces >= 7 character threshold: max distance 2, similarity >= 0.75', () => {
    // 10 chars vs 10 chars, distance 2: similarity 8/10 = 0.8 -> match
    const validMatch = checkTypoMatch('creatynene', 'creatinine');
    assert.equal(validMatch.isMatch, true);
    assert.equal(validMatch.distance, 2);
    assert.ok(validMatch.similarity >= 0.75);

    // 7 chars vs 7 chars, distance 3: no match
    const invalidMatch = checkTypoMatch('xxxxxxx', 'glucose');
    assert.equal(invalidMatch.isMatch, false);
  });

  it('protects short acronyms (<= 3 characters) from fuzzy typo matches', () => {
    // Query <= 3 characters must never match with fuzzy logic
    const shortQueries = ['CBD', 'CBA', 'MRA', 'USA', 'PT', 'XYZ'];
    for (const sq of shortQueries) {
      const match = checkTypoMatch(sq.toLowerCase(), 'cbc');
      assert.equal(match.isMatch, false);

      const resolution = resolveDiagnosticQuery(sq);
      // None should resolve to CBC via typo suggestion
      if (resolution.primaryMatch) {
        assert.notEqual(resolution.primaryMatch.matchType, 'typo_suggestion');
      }
    }

    // Verify CBD specifically does not match CBC
    const cbdResult = resolveDiagnosticQuery('CBD');
    assert.equal(cbdResult.status, 'not_found');
    assert.equal(cbdResult.requiresExplicitSelection, false);
    assert.equal(cbdResult.matches.length, 0);
  });
});

describe('Ambiguity Detection', () => {
  it('detects ambiguous queries matching multiple distinct tests for CT scan', () => {
    const result = resolveDiagnosticQuery('CT');
    assert.equal(result.status, 'ambiguous');
    assert.equal(result.requiresExplicitSelection, true);
    assert.equal(result.primaryMatch, undefined);
    assert.ok(result.matches.length >= 2);

    const ids = result.matches.map((m) => m.canonicalService.id);
    assert.ok(ids.includes('ct-chest'));
    assert.ok(ids.includes('ct-brain'));
  });

  it('detects ambiguous queries matching multiple distinct tests for USG', () => {
    const result = resolveDiagnosticQuery('USG');
    assert.equal(result.status, 'ambiguous');
    assert.equal(result.requiresExplicitSelection, true);
    assert.equal(result.primaryMatch, undefined);
    assert.ok(result.matches.length >= 2);

    const ids = result.matches.map((m) => m.canonicalService.id);
    assert.ok(ids.includes('usg-whole-abdomen'));
    assert.ok(ids.includes('usg-pelvis'));
  });

  it('detects ambiguous queries matching multiple distinct tests for Dengue', () => {
    const result = resolveDiagnosticQuery('Dengue');
    assert.equal(result.status, 'ambiguous');
    assert.equal(result.requiresExplicitSelection, true);
    assert.equal(result.primaryMatch, undefined);
    assert.ok(result.matches.length >= 2);

    const ids = result.matches.map((m) => m.canonicalService.id);
    assert.ok(ids.includes('dengue-ns1-antigen'));
    assert.ok(ids.includes('dengue-antibody'));
  });

  it('never auto-resolves ambiguous queries to a single test', () => {
    const ambiguousInputs = ['CT', 'USG', 'Dengue', 'scan', 'denguee'];
    for (const input of ambiguousInputs) {
      const result = resolveDiagnosticQuery(input);
      assert.equal(result.status, 'ambiguous');
      assert.equal(result.requiresExplicitSelection, true);
      assert.equal(result.primaryMatch, undefined);
      assert.ok(result.matches.length > 1);
    }
  });
});

describe('Unmatched and Empty Queries', () => {
  it('returns not_found with empty matches for empty string', () => {
    const result = resolveDiagnosticQuery('');
    assert.equal(result.status, 'not_found');
    assert.equal(result.requiresExplicitSelection, false);
    assert.equal(result.primaryMatch, undefined);
    assert.equal(result.matches.length, 0);
  });

  it('returns not_found with empty matches for whitespace-only query', () => {
    const result = resolveDiagnosticQuery('    \t  \n  ');
    assert.equal(result.status, 'not_found');
    assert.equal(result.requiresExplicitSelection, false);
    assert.equal(result.primaryMatch, undefined);
    assert.equal(result.matches.length, 0);
  });

  it('returns not_found with empty matches for completely unrecognized words', () => {
    const result = resolveDiagnosticQuery('qwertyuiopasdfghjkl');
    assert.equal(result.status, 'not_found');
    assert.equal(result.requiresExplicitSelection, false);
    assert.equal(result.primaryMatch, undefined);
    assert.equal(result.matches.length, 0);
  });
});

describe('Edge Cases and Boundary Conditions', () => {
  it('covers damerauLevenshteinDistance when source or target is empty', () => {
    assert.equal(damerauLevenshteinDistance('', 'lipid'), 5);
    assert.equal(damerauLevenshteinDistance('lipid', ''), 5);
    assert.equal(damerauLevenshteinDistance('', ''), 0);
  });

  it('covers checkTypoMatch boundary when reference length is between thresholds or distant', () => {
    // 7 characters vs 7 characters with distance 3 (similarity 4/7 = 0.57 < 0.75)
    const match = checkTypoMatch('abcdefg', 'abxyzwg');
    assert.equal(match.isMatch, false);
  });

  it('selects alias over canonical name in keyword matching when alias score is higher', () => {
    // Construct service where alias has fewer tokens than name, producing higher ratio score
    const customCatalog: CanonicalService[] = [
      {
        id: 'svc-keyword-score',
        name: 'Very Long Diagnostic Examination Service Blood Test',
        category: 'Hematology',
        aliases: [
          { alias: 'Blood Test', language: 'en' },
        ],
      },
    ];

    const result = resolveDiagnosticQuery('Blood Test', customCatalog);
    assert.equal(result.status, 'resolved');
    // "Blood Test" matches exact_alias first
    assert.equal(result.primaryMatch?.matchType, 'exact_alias');

    // Query "Test Blood": tokens match both name and alias in keyword tier,
    // but alias has 2/2 = 1.0 ratio (score 65) vs name 2/6 = 0.33 ratio (score 55).
    const keywordResult = resolveDiagnosticQuery('Test Blood', customCatalog);
    assert.equal(keywordResult.status, 'resolved');
    assert.equal(keywordResult.primaryMatch?.matchType, 'keyword');
    assert.equal(keywordResult.primaryMatch?.matchedText, 'Blood Test');
  });
});

