import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { AuthStore } from '../../src/features/authentication/server/store.server';
import { tokenHash } from '../../src/features/authentication/server/crypto.server';
import {
  writeManagement,
  readManagement,
} from '../../src/features/catalog/administration/operations.server';
import { CatalogAdministrationRepository } from '../../src/features/catalog/administration/repository.server';
import { CatalogRepository } from '../../src/features/catalog/server/repository.server';
import { parseEdit } from '../../src/features/catalog/administration/contracts';
import { resolveDiagnosticQuery } from '../../src/features/search/resolutionEngine';
import { normalizeText } from '../../src/features/search/normalizer';

const origin = 'http://localhost:3000';
const categoryInput = {
  entity: 'category',
  mode: 'create',
  id: 'imaging',
  name: 'Imaging',
  active: '1',
};
const serviceInput = {
  entity: 'service',
  mode: 'create',
  id: 'ct-brain',
  name: 'CT Brain',
  categoryId: 'imaging',
  active: '1',
};
const aliasInput = {
  entity: 'alias',
  mode: 'create',
  id: 'ct-brain-en',
  name: 'Brain CT',
  serviceId: 'ct-brain',
  language: 'en',
  active: '1',
};
function request(
  token: string | undefined,
  input: Record<string, string> = categoryInput,
  requestOrigin = origin,
) {
  return new Request(`${origin}/admin/catalog/write`, {
    method: 'POST',
    headers: {
      origin: requestOrigin,
      ...(token ? { cookie: `medimap_session=${token}; role=admin` } : {}),
    },
    body: new URLSearchParams(input),
  });
}
function code(response: Response) {
  return new URL(response.headers.get('location') ?? '/', origin).searchParams.get('code');
}

test('catalog administration against actual local D1', async (t) => {
  const mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test");}}',
    compatibilityDate: '2026-07-30',
    d1Databases: { DB: 'catalog-administration' },
  });
  try {
    const db = await mf.getD1Database('DB');
    const names = (await readdir('migrations')).filter((name) => name.endsWith('.sql')).sort();
    // Rehearse the upgrade with the previous schema and existing reviewed data.
    for (const name of names.filter((name) => !name.startsWith('0004'))) {
      const sql = await readFile(`migrations/${name}`, 'utf8');
      const statements = sql.match(/\s*CREATE TRIGGER[\s\S]*?END;|[^;]+;/g);
      assert.ok(statements);
      await db.batch(statements.map((statement) => db.prepare(statement)));
    }
    await db.prepare("INSERT INTO categories(id, name) VALUES ('hematology', 'Hematology')").run();
    await db
      .prepare(
        "INSERT INTO services(id, category_id, name) VALUES ('complete-blood-count', 'hematology', 'Complete Blood Count')",
      )
      .run();
    await db
      .prepare(
        "INSERT INTO service_aliases(id, service_id, alias, language) VALUES ('complete-blood-count-cbc-en', 'complete-blood-count', 'CBC', 'en')",
      )
      .run();
    const sql = await readFile('migrations/0004_catalog_administration.sql', 'utf8');
    const statements = sql.match(/\s*CREATE TRIGGER[\s\S]*?END;|[^;]+;/g);
    assert.ok(statements);
    await db.batch(statements.map((statement) => db.prepare(statement)));
    const seed = (await readFile('seeds/catalog.sql', 'utf8'))
      .replace(/^--.*$/gm, '')
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean);
    await db.batch(seed.map((statement) => db.prepare(statement)));
    const store = new AuthStore(db);
    const identity = { subject: 'administrator-catalog', email: 'admin@example.test' };
    const initial = await store.signIn(identity, null);
    const account = await store.session(initial.token);
    assert.equal(account.status, 'authenticated');
    if (account.status !== 'authenticated') throw new Error('Fixture failed');
    await db
      .prepare(
        'INSERT INTO administrator_grants(account_id, granted_at, granted_by) VALUES (?, ?, ?)',
      )
      .bind(account.user.id, Date.now(), 'integration-test')
      .run();
    const admin = await store.signIn(identity, null);
    const member = await store.signIn(
      { subject: 'member-catalog', email: 'member@example.test' },
      null,
    );
    const expired = await store.signIn(
      { subject: 'expired-catalog', email: 'expired@example.test' },
      null,
    );
    await db
      .prepare('UPDATE auth_sessions SET created_at = ?, expires_at = ? WHERE token_hash = ?')
      .bind(Date.now() - 20000, Date.now() - 1000, await tokenHash(expired.token))
      .run();
    const repository = new CatalogAdministrationRepository(db);
    const publicRepository = new CatalogRepository(db);
    const write = (input: Record<string, string>) =>
      writeManagement(request(admin.token, input), db, {});

    await t.test('upgrade retains reviewed listing, IDs, source and normalized keys', async () => {
      const service = await publicRepository.getService('complete-blood-count');
      assert.equal(service?.aliases[0].name, 'CBC');
      assert.equal(
        (await publicRepository.getBranchService('addin-moghbazar-complete-blood-count'))?.price
          ?.amountMinor,
        40000,
      );
      const row = await db
        .prepare("SELECT search_key FROM services WHERE id = 'complete-blood-count'")
        .first();
      assert.equal(row?.search_key, 'complete blood count');
    });
    await t.test(
      'anonymous, ordinary, expired and forged roles cannot read or write administration',
      async () => {
        for (const token of [undefined, member.token, expired.token, 'x'.repeat(43)]) {
          for (const input of [categoryInput, serviceInput, aliasInput]) {
            const response = await writeManagement(request(token, input), db, {});
            assert.equal(response.status, token === member.token ? 403 : 401);
          }
          assert.equal((await readManagement(request(token), db, {})).ok, false);
        }
        assert.equal(
          await db.prepare("SELECT id FROM categories WHERE id = 'imaging'").first(),
          null,
        );
      },
    );
    await t.test(
      'same-origin POST, bounded bodies and unique form fields are required',
      async () => {
        assert.equal(
          (
            await writeManagement(
              request(admin.token, categoryInput, 'https://attacker.test'),
              db,
              {},
            )
          ).status,
          400,
        );
        const get = new Request(`${origin}/admin/catalog/write`, {
          headers: { cookie: `medimap_session=${admin.token}`, origin },
        });
        assert.equal((await writeManagement(get, db, {})).status, 400);
        const oversized = request(admin.token, { ...categoryInput, name: 'x'.repeat(17000) });
        assert.equal(code(await writeManagement(oversized, db, {})), 'invalid_request');
        const duplicate = new Request(`${origin}/admin/catalog/write`, {
          method: 'POST',
          headers: {
            origin,
            cookie: `medimap_session=${admin.token}`,
            'content-type': 'application/x-www-form-urlencoded',
          },
          body: 'entity=category&entity=service',
        });
        assert.equal(code(await writeManagement(duplicate, db, {})), 'invalid_request');
      },
    );
    await t.test(
      'administrator creates categories, distinct variants and English/Bangla aliases',
      async () => {
        for (const input of [
          categoryInput,
          serviceInput,
          { ...serviceInput, id: 'ct-brain-contrast', name: 'CT Brain with contrast' },
          aliasInput,
          { ...aliasInput, id: 'ct-brain-bn', name: 'সিটি ব্রেইন', language: 'bn' },
        ]) {
          const response = await write(input);
          assert.equal(response.status, 303);
          assert.equal(code(response), 'saved');
        }
        const catalog = await publicRepository.listCatalog();
        const domain = catalog.items.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category.name,
          aliases: item.aliases.map((alias) => ({ alias: alias.name, language: alias.language })),
        }));
        for (const query of ['Brain CT', 'সিটি ব্রেইন']) {
          const resolution = resolveDiagnosticQuery(query, domain);
          assert.equal(resolution.primaryMatch?.canonicalService.id, 'ct-brain');
        }
        const ambiguous = resolveDiagnosticQuery('CT Brain', domain);
        assert.equal(ambiguous.primaryMatch?.canonicalService.id, 'ct-brain');
        assert.equal(resolveDiagnosticQuery('CT', domain).requiresExplicitSelection, true);
        assert.equal((await repository.read({ service: 'ct-brain' })).aliases.items.length, 2);
      },
    );
    await t.test(
      'duplicates, cross-service aliases and canonical/alias collisions are rejected',
      async () => {
        for (const input of [
          { ...categoryInput, id: 'imaging-copy', name: ' ＩＭＡＧＩＮＧ ' },
          { ...serviceInput, id: 'ct-copy', name: 'ct   brain' },
          { ...aliasInput, id: 'alias-copy', name: ' Ｂｒａｉｎ  ＣＴ ' },
          { ...aliasInput, id: 'contrast-alias', serviceId: 'ct-brain-contrast' },
          { ...aliasInput, id: 'bangla-copy', language: 'bn', name: 'সিটি ব্রেইন' },
        ])
          assert.equal(code(await write(input)), 'duplicate');
        assert.equal(
          code(
            await write({
              ...aliasInput,
              id: 'canonical-conflict',
              name: 'CT Brain with contrast',
            }),
          ),
          'collision',
        );
        assert.equal(
          code(await write({ ...serviceInput, id: 'alias-conflict', name: 'Brain CT' })),
          'collision',
        );
        assert.equal(
          code(
            await write({
              ...serviceInput,
              id: 'missing-parent',
              name: 'Missing parent service',
              categoryId: 'missing',
            }),
          ),
          'invalid_request',
        );
      },
    );
    await t.test('corrections preserve stable references and reject outdated forms', async () => {
      const edit = {
        ...serviceInput,
        mode: 'update',
        revision: '1',
        confirm: 'yes',
        name: 'CT Brain without contrast',
      };
      const results = await Promise.all([
        write(edit),
        write({ ...edit, name: 'CT Brain noncontrast' }),
      ]);
      assert.deepEqual(results.map(code).sort(), ['conflict', 'saved']);
      assert.equal((await publicRepository.getService('ct-brain'))?.id, 'ct-brain');
      assert.equal((await repository.read({ service: 'ct-brain' })).service?.revision, 2);
      assert.equal(
        code(
          await write({
            ...aliasInput,
            mode: 'update',
            revision: '1',
            confirm: 'yes',
            serviceId: 'ct-brain-contrast',
          }),
        ),
        'conflict',
      );
      assert.equal(
        code(await write({ ...serviceInput, mode: 'update', revision: '2' })),
        'invalid_request',
      );
    });
    await t.test(
      'inactive aliases disappear, remain reserved and can be corrected and restored',
      async () => {
        const edit = { ...aliasInput, mode: 'update', revision: '1', confirm: 'yes', active: '0' };
        assert.equal(code(await write(edit)), 'saved');
        assert.equal(
          (await publicRepository.getService('ct-brain'))?.aliases.some(
            (alias) => alias.name === 'Brain CT',
          ),
          false,
        );
        assert.equal(
          (await repository.read({ service: 'ct-brain' })).aliases.items.some(
            (alias) => !alias.active,
          ),
          true,
        );
        assert.equal(
          code(
            await write({ ...aliasInput, id: 'reused-inactive', serviceId: 'ct-brain-contrast' }),
          ),
          'duplicate',
        );
        assert.equal(
          code(await write({ ...edit, revision: '2', name: 'Noncontrast brain CT', active: '1' })),
          'saved',
        );
        assert.equal(
          (await publicRepository.getService('ct-brain'))?.aliases.some(
            (alias) => alias.name === 'Noncontrast brain CT',
          ),
          true,
        );
      },
    );
    await t.test(
      'category/service deactivation preserves source-backed listing and price relationships',
      async () => {
        const listing = 'addin-moghbazar-complete-blood-count';
        assert.equal(
          code(
            await write({
              entity: 'category',
              mode: 'update',
              id: 'hematology',
              name: 'Haematology',
              active: '0',
              revision: '1',
            }),
          ),
          'saved',
        );
        assert.equal(await publicRepository.getService('complete-blood-count'), null);
        assert.equal(await publicRepository.getBranchService(listing), null);
        assert.equal(
          code(
            await write({
              entity: 'category',
              mode: 'update',
              id: 'hematology',
              name: 'Haematology',
              active: '1',
              revision: '2',
            }),
          ),
          'saved',
        );
        assert.equal(
          (await publicRepository.getBranchService(listing))?.service.category.name,
          'Haematology',
        );
        const edit = {
          entity: 'service',
          mode: 'update',
          id: 'complete-blood-count',
          categoryId: 'hematology',
          name: 'Complete blood count',
          active: '0',
          revision: '1',
          confirm: 'yes',
        };
        assert.equal(code(await write(edit)), 'saved');
        assert.equal(await publicRepository.getBranchService(listing), null);
        assert.equal(code(await write({ ...edit, active: '1', revision: '2' })), 'saved');
        const restored = await publicRepository.getBranchService(listing);
        assert.equal(restored?.price?.id, 'addin-moghbazar-cbc-20261027');
        assert.equal(restored?.providerServiceName, 'CBC');
      },
    );
    await t.test('database constraints reject competing terms and ownership changes', async () => {
      const key = normalizeText('Concurrent alias');
      const edits = [
        parseEdit({ ...aliasInput, id: 'concurrent-a', name: 'Concurrent alias' }),
        parseEdit({ ...serviceInput, id: 'concurrent-b', name: 'Concurrent alias' }),
      ];
      const outcomes = await Promise.allSettled(edits.map((edit) => repository.save(edit)));
      assert.equal(outcomes.filter((result) => result.status === 'fulfilled').length, 1);
      assert.equal(
        await db
          .prepare(
            'SELECT COUNT(*) AS count FROM (SELECT id FROM services WHERE search_key = ? UNION ALL SELECT id FROM service_aliases WHERE search_key = ?)',
          )
          .bind(key, key)
          .first('count'),
        1,
      );
      await assert.rejects(
        db
          .prepare(
            "UPDATE service_aliases SET service_id = 'ct-brain-contrast' WHERE id = 'ct-brain-en'",
          )
          .run(),
      );
      await assert.rejects(
        db.prepare("UPDATE services SET id = 'changed-id' WHERE id = 'ct-brain'").run(),
      );
      await assert.rejects(
        db.prepare("INSERT INTO categories(id, name) VALUES ('no-key', 'No key')").run(),
      );
    });
    await t.test(
      'bound input is literal, pagination retains inactive rows and invalid IDs fail safely',
      async () => {
        assert.equal(
          code(await write({ ...categoryInput, id: 'quoted', name: "A ' ; DROP TABLE services" })),
          'saved',
        );
        const data = await repository.read({ categoryAfter: 'imaging', service: 'ct-brain' });
        assert.equal(data.categories.items[0].id, 'quoted');
        assert.equal(
          (await readManagement(request(admin.token), db, { service: "' OR 1=1" })).ok,
          false,
        );
      },
    );
    await t.test(
      'management pagination reaches later records and includes off-page selections',
      async () => {
        await db.batch(
          Array.from({ length: 51 }, (_, index) => {
            const id = `paged-${String(index).padStart(3, '0')}`;
            return db
              .prepare('INSERT INTO categories(id, name, search_key) VALUES (?, ?, ?)')
              .bind(id, `Paged ${index}`, `paged ${index}`);
          }),
        );
        const first = await repository.read({ category: 'paged-050' });
        assert.equal(first.categories.items.length, 50);
        assert.ok(first.categories.nextCursor);
        assert.equal(first.category?.id, 'paged-050');
        assert.equal(
          first.categories.items.some((item) => item.id === 'paged-050'),
          false,
        );
        const second = await repository.read({ categoryAfter: first.categories.nextCursor });
        assert.ok(second.categories.items.some((item) => item.id === 'paged-050'));
        assert.equal(second.categories.nextCursor, null);
      },
    );
    await t.test('revoked administrator sessions cannot write', async () => {
      await db
        .prepare('DELETE FROM administrator_grants WHERE account_id = ?')
        .bind(account.user.id)
        .run();
      assert.equal((await write(categoryInput)).status, 401);
    });
    await t.test(
      'database failure is explicit without exposing SQL or substituting fixtures',
      async () => {
        await db.prepare('DROP TABLE service_aliases').run();
        const next = await store.signIn(identity, null);
        await db
          .prepare(
            'INSERT INTO administrator_grants(account_id, granted_at, granted_by) VALUES (?, ?, ?)',
          )
          .bind(account.user.id, Date.now(), 'test')
          .run();
        const last = await store.signIn(identity, next.token);
        const failure = await readManagement(request(last.token), db, {});
        assert.equal(failure.ok, false);
        assert.equal(
          code(await writeManagement(request(last.token, aliasInput), db, {})),
          'unavailable',
        );
      },
    );
  } finally {
    await mf.dispose();
  }
});
