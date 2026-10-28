import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { AuthStore } from '../../src/features/authentication/server/store.server';
import { tokenHash } from '../../src/features/authentication/server/crypto.server';
import { writeProviders, readProviders } from '../../src/features/providers/operations.server';
import { ProviderRepository } from '../../src/features/providers/repository.server';
import { CatalogRepository } from '../../src/features/catalog/server/repository.server';
import { catalogRead } from '../../src/features/catalog/server/reads.server';
import { openingStatus } from '../../src/features/providers/hours';

const origin = 'http://localhost:3000';
const providerInput = {
  entity: 'provider',
  mode: 'create',
  id: 'test-provider',
  name: 'Test provider',
  active: '1',
  website: 'https://provider.example.test/',
  phone: '+880 1712-345678',
};
const branchInput = {
  entity: 'branch',
  mode: 'create',
  id: 'test-branch',
  providerId: 'test-provider',
  name: 'Test branch',
  address: 'Test address',
  active: '0',
};
function request(
  token?: string,
  input: Record<string, string> = providerInput,
  requestOrigin = origin,
) {
  return new Request(`${origin}/admin/providers/write`, {
    method: 'POST',
    headers: {
      origin: requestOrigin,
      ...(token ? { cookie: `medimap_session=${token}; role=administrator` } : {}),
    },
    body: new URLSearchParams(input),
  });
}
function code(response: Response) {
  return new URL(response.headers.get('location') ?? '/', origin).searchParams.get('code');
}

test('provider administration against actual local D1', async (t) => {
  const mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test");}}',
    compatibilityDate: '2026-07-30',
    d1Databases: { DB: 'providers-integration' },
  });
  try {
    const db = await mf.getD1Database('DB');
    const migrations = (await readdir('migrations')).filter((name) => name.endsWith('.sql')).sort();
    const apply = async (name: string) => {
      const statements = (await readFile(`migrations/${name}`, 'utf8')).match(
        /\s*CREATE TRIGGER[\s\S]*?END;|[^;]+;/g,
      );
      assert.ok(statements);
      await db.batch(statements.map((sql) => db.prepare(sql)));
    };
    for (const name of migrations.filter((name) => name < '0005')) await apply(name);
    await db
      .prepare("INSERT INTO providers(id, name) VALUES ('legacy-provider', 'Legacy Provider')")
      .run();
    await db
      .prepare(
        "INSERT INTO branches(id, provider_id, name, address) VALUES ('legacy-branch', 'legacy-provider', 'Legacy Branch', 'Legacy address')",
      )
      .run();
    for (const name of migrations.filter((name) => name >= '0005')) await apply(name);
    const seed = (await readFile('seeds/catalog.sql', 'utf8'))
      .replace(/^--.*$/gm, '')
      .split(';')
      .map((sql) => sql.trim())
      .filter(Boolean);
    await db.batch(seed.map((sql) => db.prepare(sql)));
    const store = new AuthStore(db);
    const identity = { subject: 'provider-admin', email: 'admin@example.test' };
    const initial = await store.signIn(identity, null);
    const account = await store.session(initial.token);
    if (account.status !== 'authenticated') throw new Error('Fixture failed');
    await db
      .prepare(
        'INSERT INTO administrator_grants(account_id, granted_at, granted_by) VALUES (?, ?, ?)',
      )
      .bind(account.user.id, Date.now(), 'integration-test')
      .run();
    const admin = await store.signIn(identity, null);
    const member = await store.signIn(
      { subject: 'provider-member', email: 'member@example.test' },
      null,
    );
    const expired = await store.signIn(
      { subject: 'provider-expired', email: 'expired@example.test' },
      null,
    );
    await db
      .prepare('UPDATE auth_sessions SET created_at = ?, expires_at = ? WHERE token_hash = ?')
      .bind(Date.now() - 10000, Date.now() - 1000, await tokenHash(expired.token))
      .run();
    const repository = new ProviderRepository(db);
    const publicRepository = new CatalogRepository(db);
    const write = (input: Record<string, string>) =>
      writeProviders(request(admin.token, input), db, {});

    await t.test(
      'upgrade preserves existing identities, unknown fields and reviewed listing evidence',
      async () => {
        const legacy = await repository.read({
          provider: 'legacy-provider',
          branch: 'legacy-branch',
        });
        assert.equal(legacy.branch?.address, 'Legacy address');
        assert.equal(legacy.branch?.revision, 1);
        assert.equal(legacy.branch?.openingHours, null);
        assert.equal(legacy.provider?.website, null);
        assert.equal(
          (await publicRepository.getBranchService('addin-moghbazar-complete-blood-count'))?.price
            ?.amountMinor,
          40000,
        );
      },
    );
    await t.test(
      'anonymous, ordinary, expired and forged roles cannot read or write providers',
      async () => {
        for (const token of [undefined, member.token, expired.token, 'x'.repeat(43)]) {
          assert.equal(
            (await writeProviders(request(token), db, {})).status,
            token === member.token ? 403 : 401,
          );
          assert.equal(
            (await writeProviders(request(token, branchInput), db, {})).status,
            token === member.token ? 403 : 401,
          );
          assert.equal((await readProviders(request(token), db, {})).ok, false);
        }
        assert.equal(
          await db.prepare("SELECT id FROM providers WHERE id = 'test-provider'").first(),
          null,
        );
      },
    );
    await t.test('same-origin POST and bounded, unambiguous form input are required', async () => {
      assert.equal(
        (await writeProviders(request(admin.token, providerInput, 'https://attacker.test'), db, {}))
          .status,
        400,
      );
      const noOrigin = new Request(`${origin}/admin/providers/write`, {
        method: 'POST',
        headers: { cookie: `medimap_session=${admin.token}` },
        body: new URLSearchParams(providerInput),
      });
      assert.equal((await writeProviders(noOrigin, db, {})).status, 400);
      assert.equal(
        code(await write({ ...providerInput, name: 'x'.repeat(17000) })),
        'invalid_request',
      );
      const duplicate = new Request(`${origin}/admin/providers/write`, {
        method: 'POST',
        headers: {
          origin,
          cookie: `medimap_session=${admin.token}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: 'entity=provider&entity=branch',
      });
      assert.equal(code(await writeProviders(duplicate, db, {})), 'invalid_request');
    });
    await t.test(
      'provider and draft branch creation preserve unknown contacts and hours',
      async () => {
        assert.equal(code(await write(providerInput)), 'saved');
        assert.equal(code(await write(branchInput)), 'saved');
        const data = await repository.read({ provider: 'test-provider', branch: 'test-branch' });
        assert.equal(data.provider?.website, providerInput.website);
        assert.equal(data.branch?.phone, null);
        assert.equal(data.branch?.openingHours, null);
        assert.equal(data.branch?.latitude, null);
        assert.equal(await publicRepository.getBranch('test-branch'), null);
        assert.equal(
          code(
            await write({
              ...branchInput,
              id: 'unsupported',
              name: 'Unsupported branch',
              active: '1',
            }),
          ),
          'invalid_request',
        );
      },
    );
    await db
      .prepare(
        "INSERT INTO sources(id, provider_id, url, kind, retrieved_at, sha256) VALUES ('test-contact', 'test-provider', 'https://provider.example.test/contact', 'official_contact', '2026-10-28T00:00:00Z', ?)",
      )
      .bind('a'.repeat(64))
      .run();
    const activeBranch = {
      ...branchInput,
      mode: 'update',
      revision: '1',
      active: '1',
      contactSourceId: 'test-contact',
      confirmContact: 'yes',
      phone: '01712345678',
      alternativePhone: '10606',
      website: 'https://branch.example.test/',
      latitude: '23.75',
      longitude: '90.4',
      hours_saturday: '22:00-02:00',
      hours_sunday: '08:00-12:00, 14:00-18:00',
      hours_monday: '00:00-24:00',
      hours_tuesday: 'closed',
      hours_wednesday: 'closed',
      hours_thursday: 'closed',
      hours_friday: 'closed',
    };
    await t.test('verified branch edits appear in validated public detail reads', async () => {
      assert.equal(code(await write(activeBranch)), 'saved');
      const branch = await publicRepository.getBranch('test-branch');
      assert.equal(branch?.phone, '01712345678');
      assert.equal(branch?.alternativePhone, '10606');
      assert.equal(branch?.provider.website, providerInput.website);
      assert.equal(branch?.website, activeBranch.website);
      assert.deepEqual(branch?.coordinates, { latitude: 23.75, longitude: 90.4 });
      assert.equal(branch?.contactSource?.id, 'test-contact');
      assert.equal(branch?.openingHours?.timeZone, 'Asia/Dhaka');
      assert.equal(
        openingStatus(branch?.openingHours ?? null, new Date('2026-10-31T19:00:00Z')),
        'open',
      );
      const response = await catalogRead(db, { kind: 'branch', id: 'test-branch' });
      assert.equal(response.ok, true);
      if (response.ok && response.kind === 'branch') assert.deepEqual(response.data, branch);
    });
    await t.test(
      'invalid coordinates, websites, schedules, parent references and evidence are rejected',
      async () => {
        for (const changes of [
          { latitude: '91' },
          { longitude: '' },
          { website: 'javascript:alert(1)' },
          { phone: 'bad' },
          { hours_sunday: '08:00-08:00' },
          { hours_sunday: '01:00-04:00' },
          { contactSourceId: 'addin-contact-20261027' },
          { contactSourceId: 'addin-hematology-20261027' },
        ]) {
          assert.equal(
            code(await write({ ...activeBranch, revision: '2', ...changes })),
            'invalid_request',
          );
        }
        assert.equal(
          code(await write({ ...branchInput, id: 'missing-parent', providerId: 'missing' })),
          'invalid_request',
        );
        assert.equal(
          (await publicRepository.getBranch('test-branch'))?.coordinates?.latitude,
          23.75,
        );
      },
    );
    await t.test('duplicates are normalized within provider and branch scopes', async () => {
      assert.equal(
        code(await write({ ...providerInput, id: 'provider-copy', name: ' ＴＥＳＴ   provider ' })),
        'duplicate',
      );
      assert.equal(
        code(await write({ ...branchInput, id: 'branch-copy', name: ' TEST  branch ' })),
        'duplicate',
      );
      assert.equal(
        code(await write({ ...providerInput, id: 'other-provider', name: 'Other provider' })),
        'saved',
      );
      assert.equal(
        code(await write({ ...branchInput, id: 'other-branch', providerId: 'other-provider' })),
        'saved',
      );
    });
    await t.test(
      'stale and competing edits do not overwrite accepted changes or branch ownership',
      async () => {
        const edit = { ...activeBranch, revision: '2', address: 'Corrected address' };
        const results = await Promise.all([
          write(edit),
          write({ ...edit, address: 'Another correction' }),
        ]);
        assert.deepEqual(results.map(code).sort(), ['conflict', 'saved']);
        assert.equal(
          code(await write({ ...edit, revision: '3', providerId: 'other-provider' })),
          'conflict',
        );
        await assert.rejects(
          db
            .prepare("UPDATE branches SET provider_id = 'other-provider' WHERE id = 'test-branch'")
            .run(),
        );
        await assert.rejects(
          db.prepare("UPDATE providers SET id = 'changed' WHERE id = 'test-provider'").run(),
        );
      },
    );
    await t.test(
      'deactivation retains listings and price/source history while hiding public reads',
      async () => {
        const provider = { ...providerInput, mode: 'update', revision: '1', active: '0' };
        assert.equal(code(await write(provider)), 'saved');
        assert.equal(await publicRepository.getBranch('test-branch'), null);
        assert.equal(code(await write({ ...provider, revision: '2', active: '1' })), 'saved');
        const edit = { ...activeBranch, revision: '3', active: '0' };
        assert.equal(code(await write(edit)), 'saved');
        assert.equal(await publicRepository.getBranch('test-branch'), null);
        assert.equal(
          (await repository.read({ branch: 'test-branch' })).branch?.contactSourceId,
          'test-contact',
        );
        assert.equal(code(await write({ ...edit, revision: '4', active: '1' })), 'saved');
        const seeded = {
          ...providerInput,
          id: 'addin-medical-college-hospital',
          name: 'Ad-din Medical College Hospital',
          mode: 'update',
          revision: '1',
          active: '0',
          phone: '',
          website: '',
        };
        assert.equal(code(await write(seeded)), 'saved');
        assert.equal(
          await publicRepository.getBranchService('addin-moghbazar-complete-blood-count'),
          null,
        );
        assert.equal(code(await write({ ...seeded, revision: '2', active: '1' })), 'saved');
        assert.equal(
          (await publicRepository.getBranchService('addin-moghbazar-complete-blood-count'))?.price
            ?.id,
          'addin-moghbazar-cbc-20261027',
        );
      },
    );
    await t.test('pagination and invalid selectors do not substitute fixtures', async () => {
      const data = await repository.read({
        providerAfter: 'legacy-provider',
        provider: 'test-provider',
      });
      assert.equal(data.providers.items[0].id, 'other-provider');
      assert.equal(
        data.branches.items.every((branch) => branch.providerId === 'test-provider'),
        true,
      );
      assert.equal(
        (await readProviders(request(admin.token), db, { provider: "' OR 1=1" })).ok,
        false,
      );
      assert.equal(
        (
          await readProviders(request(admin.token), db, {
            provider: 'other-provider',
            branch: 'test-branch',
          })
        ).ok,
        false,
      );
    });
    await t.test(
      'malformed stored hours fail explicitly and never become an assumed schedule',
      async () => {
        await db
          .prepare(
            'UPDATE branches SET opening_hours = \'{"timeZone":"Asia/Dhaka","days":{}}\' WHERE id = \'test-branch\'',
          )
          .run();
        const result = await catalogRead(db, { kind: 'branch', id: 'test-branch' });
        assert.equal(result.ok, false);
        if (!result.ok) assert.equal(result.code, 'unavailable');
        await assert.rejects(
          db
            .prepare("UPDATE branches SET opening_hours = 'not json' WHERE id = 'test-branch'")
            .run(),
        );
        await db.prepare("UPDATE branches SET opening_hours = NULL WHERE id = 'test-branch'").run();
      },
    );
    await t.test(
      'revoked grants stop writes and database failures return fixed feedback',
      async () => {
        await db
          .prepare('DELETE FROM administrator_grants WHERE account_id = ?')
          .bind(account.user.id)
          .run();
        assert.equal((await write(providerInput)).status, 401);
        await db
          .prepare(
            'INSERT INTO administrator_grants(account_id, granted_at, granted_by) VALUES (?, ?, ?)',
          )
          .bind(account.user.id, Date.now(), 'test')
          .run();
        const next = await store.signIn(identity, null);
        await db.prepare('ALTER TABLE branches RENAME TO unavailable_branches').run();
        const failure = await readProviders(request(next.token), db, {});
        assert.equal(failure.ok, false);
        if (!failure.ok) assert.equal(failure.code, 'unavailable');
        assert.equal(
          code(await writeProviders(request(next.token, branchInput), db, {})),
          'unavailable',
        );
      },
    );
  } finally {
    await mf.dispose();
  }
});
