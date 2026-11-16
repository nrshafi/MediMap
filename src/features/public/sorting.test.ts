import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortListings, sortChoices } from './sorting';
import type { BranchService } from '../catalog/contracts';
test('all public sorts retain unknown values last and stable ties', () => {
  const rows: BranchService[] = ['z', 'a'].map((id) => ({
    id,
    providerServiceName: 'CBC',
    service: { id: 'cbc', name: 'CBC', category: { id: 'hematology', name: 'Hematology' } },
    branch: {
      id,
      provider: { id: 'provider', name: 'Provider', phone: null, website: null },
      name: id,
      address: 'Address',
      phone: null,
      alternativePhone: null,
      website: null,
      openingHours: null,
      coordinates: null,
      contactSource: null,
    },
    price: null,
  }));
  for (const choice of sortChoices)
    assert.deepEqual(
      sortListings(rows, choice, { latitude: 23.8, longitude: 90.4 }, {}, { z: 2, a: null }).map(
        (r) => r.id,
      ),
      choice === 'travel-time' ? ['z', 'a'] : ['a', 'z'],
    );
  assert.equal(rows[0].id, 'z');
});
