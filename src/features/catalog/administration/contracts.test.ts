import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEdit, CatalogEditError, catalogName, managementQuery } from './contracts';

const input = {
  entity: 'service',
  mode: 'create',
  id: 'ct-brain',
  name: 'CT Brain',
  active: '1',
  categoryId: 'imaging',
};
describe('catalog administration validation', () => {
  test('uses the shared Unicode normalization without merging variant names', () => {
    assert.equal(
      parseEdit({ ...input, entity: 'alias', serviceId: 'ct-brain', language: 'en', name: 'K' })
        .name,
      'K',
    );
    assert.equal(parseEdit({ ...input, name: '  ＣＴ   Brain  ' }).searchKey, 'ct brain');
    assert.notEqual(
      parseEdit({ ...input, name: 'CT Brain with contrast' }).searchKey,
      parseEdit(input).searchKey,
    );
    assert.equal(
      parseEdit({
        ...input,
        entity: 'alias',
        serviceId: 'ct-brain',
        language: 'bn',
        name: 'সিটি ব্রেইন',
      }).name,
      'সিটি ব্রেইন',
    );
  });
  test('rejects unsafe IDs, empty labels, controls, unsupported language and missing confirmation', () => {
    for (const change of [
      { id: '../bad' },
      { id: "' OR 1=1" },
      { name: '  ' },
      { name: '<script>bad</script>' },
      { name: '\u200B\u200D' },
      { name: 'bad\nname' },
      { name: 'x'.repeat(181) },
      { active: true },
      { mode: 'update', revision: '1' },
      { mode: 'update', revision: 'NaN', confirm: 'yes' },
      { mode: 'update', revision: '0', confirm: 'yes' },
      { entity: 'alias', language: 'fr', serviceId: 'ct-brain' },
      { entity: 'alias', language: 'bn', serviceId: 'ct-brain', name: 'English only' },
    ])
      assert.throws(() => parseEdit({ ...input, ...change }), CatalogEditError);
    assert.throws(() => catalogName(null));
  });
  test('accepts safe correction and preserves the stable ID', () => {
    const edit = parseEdit({
      ...input,
      mode: 'update',
      revision: '2',
      confirm: 'yes',
      active: '0',
    });
    assert.equal(edit.id, 'ct-brain');
    assert.equal(edit.revision, 2);
    assert.equal(edit.active, false);
  });
  test('validates pagination and selection IDs', () => {
    assert.equal(
      managementQuery({ service: '', categoryAfter: 'hematology' }).serviceId,
      undefined,
    );
    assert.throws(() => managementQuery({ after: 'bad/value' }));
  });
});
