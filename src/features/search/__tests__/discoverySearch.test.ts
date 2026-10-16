import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateDiscoverySearch } from '../discoverySearch';

describe('Discovery URL validation', () => {
  it('accepts query aliases, complete numeric strings, and trimmed branch identifiers', () => {
    assert.deepEqual(validateDiscoverySearch({ q: 'CBC', lat: '23.7388', lng: '90.3957', radius: '5', selectedBranchId: '  bsmmu-shahbagh  ' }), {
      q: 'CBC', query: 'CBC', lat: 23.7388, lng: 90.3957, radius: 5, selectedBranchId: 'bsmmu-shahbagh',
    });
    assert.equal(validateDiscoverySearch({ query: 'Lipid Profile' }).q, 'Lipid Profile');
    assert.equal(validateDiscoverySearch({ q: '', query: 'CBC' }).query, '');
    assert.equal(validateDiscoverySearch({ q: 'CBC', query: 'CT' }).query, 'CBC');
    assert.equal(validateDiscoverySearch({ selectedBranchId: '   ' }).selectedBranchId, undefined);
  });

  it('rejects incomplete coordinate pairs and malformed or out-of-range numbers', () => {
    for (const radius of ['3garbage', '', Infinity, NaN, -1, 0.01, 101]) {
      assert.equal(validateDiscoverySearch({ radius }).radius, 3);
    }
    for (const search of [{ lat: 91, lng: 90 }, { lat: 23, lng: 181 }, { lat: 23 }, { lat: '23junk', lng: 90 }]) {
      const parsed = validateDiscoverySearch(search);
      assert.equal(parsed.lat, undefined);
      assert.equal(parsed.lng, undefined);
    }
    assert.equal(validateDiscoverySearch({ radius: '0.1' }).radius, 0.1);
    assert.equal(validateDiscoverySearch({ radius: '100' }).radius, 100);
  });
});
