import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProviderEdit, contactPhone, contactWebsite, providerQuery } from './contracts';

const input = {
  entity: 'branch',
  mode: 'create',
  id: 'new-branch',
  providerId: 'provider',
  name: 'Branch',
  address: 'Address in Dhaka',
  active: '0',
};
test('unknown contact fields remain null and Bangla telephone digits become dialable', () => {
  const edit = parseProviderEdit(input);
  assert.equal(edit.phone, null);
  if (edit.entity !== 'branch') throw new Error();
  assert.equal(edit.openingHours, null);
  assert.equal(edit.latitude, null);
  assert.equal(contactPhone('০১৭১২৩৪৫৬৭৮'), '01712345678');
  assert.equal(contactPhone('10606'), '10606');
  assert.equal(contactPhone('+880 (2) 1234-5678'), '+880 (2) 1234-5678');
  assert.equal(contactWebsite('https://example.test/path'), 'https://example.test/path');
});
test('coordinate pairs accept boundaries and zero, and reject partial or invalid values', () => {
  for (const coordinates of [
    { latitude: '0', longitude: '0' },
    { latitude: '-90', longitude: '180' },
  ]) {
    const edit = parseProviderEdit({ ...input, ...coordinates });
    assert.equal(edit.entity, 'branch');
  }
  for (const coordinates of [
    { latitude: '23' },
    { latitude: '91', longitude: '90' },
    { latitude: '23', longitude: '-181' },
    { latitude: 'NaN', longitude: '0' },
    { latitude: '0x10', longitude: '0' },
  ]) {
    assert.throws(() => parseProviderEdit({ ...input, ...coordinates }));
  }
});
test('unsafe websites, telephone values and unsupported publication are rejected', () => {
  for (const website of [
    'javascript:alert(1)',
    'data:text/html,test',
    'https://user:password@example.test',
    '//example.test',
    'https://example.test\\bad',
    'https://example.test\n',
  ])
    assert.throws(() => parseProviderEdit({ ...input, website }));
  for (const phone of ['abc', '12', '1234567890123456', '0171234<script>'])
    assert.throws(() => parseProviderEdit({ ...input, phone }));
  assert.throws(() => parseProviderEdit({ ...input, active: '1' }));
  assert.throws(() => parseProviderEdit({ ...input, active: '1', contactSourceId: 'source' }));
  assert.equal(
    parseProviderEdit({ ...input, active: '1', contactSourceId: 'source', confirmContact: 'yes' })
      .active,
    true,
  );
  assert.throws(() => parseProviderEdit({ ...input, active: 1 }));
  assert.throws(() => providerQuery({ provider: "' OR 1=1" }));
});
