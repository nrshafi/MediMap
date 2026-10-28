import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { AuthStore } from '../../src/features/authentication/server/store.server';
import { tokenHash } from '../../src/features/authentication/server/crypto.server';
import { readPricing, writePricing } from '../../src/features/pricing/operations.server';
import { PricingRepository } from '../../src/features/pricing/repository.server';
import { CatalogRepository } from '../../src/features/catalog/server/repository.server';

const origin = 'http://localhost:3000';
const listingId = 'addin-moghbazar-complete-blood-count';
const sourceInput = {
  entity: 'source',
  id: 'revised-tariff',
  providerId: 'addin-medical-college-hospital',
  url: 'https://awmch.addinhospital.org/test-tariff',
  kind: 'official_tariff',
  retrievedAt: '2026-10-27T12:00:00Z',
  sha256: 'a'.repeat(64),
  collector: 'Isolated integration fixture',
  confirmSource: 'yes',
  currencyEvidence: 'explicit_taka_header',
  notes: 'Synthetic test evidence only',
};
const priceInput = {
  entity: 'price',
  action: 'set',
  id: listingId,
  revision: '1',
  amount: '450.05',
  status: 'verified',
  sourceId: 'revised-tariff',
  sourceRow: '1',
  confirmReview: 'yes',
  standardPrice: 'yes',
  notes: 'Fixture correction',
};
function request(
  token?: string,
  input: Record<string, string> = sourceInput,
  requestOrigin = origin,
) {
  return new Request(`${origin}/admin/prices/write`, {
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

test('price and source administration against actual local D1', async (t) => {
  const mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test");}}',
    compatibilityDate: '2026-07-30',
    d1Databases: { DB: 'pricing-integration' },
  });
  try {
    const db = await mf.getD1Database('DB');
    const names = (await readdir('migrations')).filter((name) => name.endsWith('.sql')).sort();
    const apply = async (name: string) => {
      const statements = (await readFile(`migrations/${name}`, 'utf8')).match(
        /\s*CREATE TRIGGER[\s\S]*?END;|[^;]+;/g,
      );
      assert.ok(statements);
      await db.batch(statements.map((sql) => db.prepare(sql)));
    };
    for (const name of names.filter((name) => name < '0006')) await apply(name);
    const seed = (await readFile('seeds/catalog.sql', 'utf8'))
      .replace(/^--.*$/gm, '')
      .split(';')
      .map((sql) => sql.trim())
      .filter(Boolean);
    await db.batch(seed.map((sql) => db.prepare(sql)));
    for (const name of names.filter((name) => name >= '0006')) await apply(name);
    const store = new AuthStore(db);
    const identity = { subject: 'pricing-admin', email: 'administrator@example.test' };
    const first = await store.signIn(identity, null);
    const account = await store.session(first.token);
    if (account.status !== 'authenticated') throw new Error('Fixture failed');
    await db
      .prepare(
        'INSERT INTO administrator_grants(account_id, granted_at, granted_by) VALUES (?, ?, ?)',
      )
      .bind(account.user.id, Date.now(), 'integration-test')
      .run();
    const admin = await store.signIn(identity, null);
    const member = await store.signIn(
      { subject: 'pricing-member', email: 'member@example.test' },
      null,
    );
    const expired = await store.signIn(
      { subject: 'pricing-expired', email: 'expired@example.test' },
      null,
    );
    await db
      .prepare('UPDATE auth_sessions SET created_at = ?, expires_at = ? WHERE token_hash = ?')
      .bind(Date.now() - 10000, Date.now() - 1000, await tokenHash(expired.token))
      .run();
    const repository = new PricingRepository(db);
    const publicRepository = new CatalogRepository(db);
    const write = (input: Record<string, string>) =>
      writePricing(request(admin.token, input), db, {});
    const count = (table: 'prices' | 'listing_changes') =>
      db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).first<number>('count');
    let currentReview = '';

    await t.test(
      'migration preserves reviewed prices and unknown historical collector metadata',
      async () => {
        const data = await repository.read({ listing: listingId });
        assert.equal(data.selected?.price?.amountMinor, 40000);
        assert.equal(data.selected?.revision, 1);
        assert.equal(
          data.sources.items.find((source) => source.kind === 'official_tariff')?.collector,
          null,
        );
        assert.equal(data.history.items.length, 1);
      },
    );
    await t.test(
      'guests, ordinary members, expired sessions and forged roles cannot read or write pricing',
      async () => {
        for (const token of [undefined, member.token, expired.token, 'x'.repeat(43)]) {
          assert.equal(
            (await writePricing(request(token), db, {})).status,
            token === member.token ? 403 : 401,
          );
          assert.equal(
            (await writePricing(request(token, priceInput), db, {})).status,
            token === member.token ? 403 : 401,
          );
          assert.equal((await readPricing(request(token), db, {})).ok, false);
        }
      },
    );
    await t.test('same-origin POST and bounded forms are required', async () => {
      assert.equal(
        (await writePricing(request(admin.token, sourceInput, 'https://attacker.test'), db, {}))
          .status,
        400,
      );
      assert.equal(
        code(await write({ ...sourceInput, notes: 'x'.repeat(17000) })),
        'invalid_request',
      );
      const duplicate = new Request(`${origin}/admin/prices/write`, {
        method: 'POST',
        headers: {
          origin,
          cookie: `medimap_session=${admin.token}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: 'entity=source&entity=price',
      });
      assert.equal(code(await writePricing(duplicate, db, {})), 'invalid_request');
    });
    await t.test(
      'source snapshots retain collection metadata and cannot be overwritten or removed',
      async () => {
        assert.equal(code(await write(sourceInput)), 'saved');
        const source = (await repository.read({ listing: listingId })).sources.items.find(
          (item) => item.id === 'revised-tariff',
        );
        assert.equal(source?.collector, sourceInput.collector);
        assert.equal(source?.recordedBy, account.user.id);
        assert.equal(source?.retrievedAt, sourceInput.retrievedAt);
        assert.notEqual(source?.recordedAt, sourceInput.retrievedAt);
        assert.equal(code(await write(sourceInput)), 'duplicate');
        assert.equal(code(await write({ ...sourceInput, id: 'duplicate-snapshot' })), 'duplicate');
        await assert.rejects(
          db
            .prepare(
              "UPDATE sources SET url = 'https://example.test/changed' WHERE id = 'revised-tariff'",
            )
            .run(),
        );
        await assert.rejects(db.prepare("DELETE FROM sources WHERE id = 'revised-tariff'").run());
      },
    );
    await t.test(
      'a verified price adds a revision and updates public reads without losing its predecessor',
      async () => {
        assert.equal(code(await write(priceInput)), 'saved');
        const current = (await publicRepository.getBranchService(listingId))?.price;
        assert.equal(current?.amountMinor, 45005);
        assert.equal(current?.source?.id, 'revised-tariff');
        assert.equal(current?.sourceRow, 1);
        assert.equal(current?.status, 'verified');
        assert.ok(current?.verifiedAt);
        currentReview = current.verifiedAt;
        assert.equal((await repository.read({ listing: listingId })).history.items.length, 2);
        assert.equal(
          await db
            .prepare("SELECT amount_minor FROM prices WHERE id = 'addin-moghbazar-cbc-20261027'")
            .first('amount_minor'),
          40000,
        );
      },
    );
    await t.test(
      'missing evidence, bad relationships, unsupported currency and promotional input roll back completely',
      async () => {
        const beforePrices = await count('prices');
        const beforeChanges = await count('listing_changes');
        for (const changes of [
          { amount: '0' },
          { amount: '-1' },
          { amount: '1.001' },
          { sourceId: '' },
          { sourceRow: '' },
          { confirmReview: '' },
          { standardPrice: '' },
          { sourceId: 'addin-contact-20261027' },
        ]) {
          assert.equal(
            code(await write({ ...priceInput, revision: '2', ...changes })),
            'invalid_request',
          );
        }
        assert.equal(
          code(
            await write({
              ...sourceInput,
              id: 'unknown-currency',
              url: 'https://awmch.addinhospital.org/unknown-currency',
              currencyEvidence: '',
            }),
          ),
          'saved',
        );
        assert.equal(
          code(await write({ ...priceInput, revision: '2', sourceId: 'unknown-currency' })),
          'invalid_request',
        );
        await db
          .prepare(
            "INSERT INTO providers(id, name, search_key) VALUES ('other-provider', 'Other provider', 'other provider')",
          )
          .run();
        assert.equal(
          code(
            await write({
              ...sourceInput,
              id: 'other-source',
              providerId: 'other-provider',
              url: 'https://other.example.test/tariff',
            }),
          ),
          'saved',
        );
        assert.equal(
          code(await write({ ...priceInput, revision: '2', sourceId: 'other-source' })),
          'invalid_request',
        );
        assert.equal(await count('prices'), beforePrices);
        assert.equal(await count('listing_changes'), beforeChanges);
        assert.equal((await repository.read({ listing: listingId })).selected?.revision, 2);
      },
    );
    await t.test(
      'disputed status keeps the actual prior review and evidence without age-based expiry',
      async () => {
        assert.equal(
          code(
            await write({ ...priceInput, revision: '2', status: 'disputed', confirmReview: '' }),
          ),
          'saved',
        );
        const current = (await publicRepository.getBranchService(listingId))?.price;
        assert.equal(current?.status, 'disputed');
        assert.equal(current?.verifiedAt, currentReview);
        assert.equal(current?.source?.id, 'revised-tariff');
        assert.equal(current?.amountMinor, 45005);
        assert.equal((await repository.read({ listing: listingId })).history.items.length, 3);
      },
    );
    await t.test(
      'competing edits select exactly one new price without an orphan or partial audit row',
      async () => {
        const beforePrices = await count('prices');
        const beforeChanges = await count('listing_changes');
        const results = await Promise.all([
          write({ ...priceInput, revision: '3', amount: '460' }),
          write({ ...priceInput, revision: '3', amount: '470' }),
        ]);
        assert.deepEqual(results.map(code).sort(), ['conflict', 'saved']);
        assert.equal(await count('prices'), Number(beforePrices) + 1);
        assert.equal(await count('listing_changes'), Number(beforeChanges) + 1);
        assert.equal((await repository.read({ listing: listingId })).selected?.revision, 4);
        assert.equal(code(await write({ ...priceInput, revision: '1' })), 'conflict');
      },
    );
    await t.test(
      'explicit unknown prices clear all current evidence and retain complete history',
      async () => {
        const before = await count('prices');
        const clear = {
          entity: 'price',
          action: 'clear',
          id: listingId,
          revision: '4',
          confirmClear: 'yes',
        };
        assert.equal(code(await write(clear)), 'saved');
        assert.equal((await publicRepository.getBranchService(listingId))?.price, null);
        assert.equal(await count('prices'), before);
        assert.equal((await repository.read({ listing: listingId })).history.items.length, 4);
        assert.equal(code(await write(clear)), 'conflict');
      },
    );
    await t.test(
      'availability corrections retain canonical ownership, original labels and unknown prices',
      async () => {
        const edit = {
          entity: 'listing',
          mode: 'update',
          id: listingId,
          revision: '5',
          providerServiceName: 'CBC original tariff label',
          active: '0',
          confirmMapping: 'yes',
        };
        assert.equal(code(await write(edit)), 'saved');
        assert.equal(await publicRepository.getBranchService(listingId), null);
        assert.equal(code(await write({ ...edit, revision: '6', active: '1' })), 'saved');
        const current = await publicRepository.getBranchService(listingId);
        assert.equal(current?.providerServiceName, edit.providerServiceName);
        assert.equal(current?.price, null);
        await assert.rejects(
          db
            .prepare("UPDATE branch_services SET service_id = 'different-service' WHERE id = ?")
            .bind(listingId)
            .run(),
        );
        const audit = await db
          .prepare(
            'SELECT previous_label, actor_id FROM listing_changes WHERE listing_id = ? AND previous_revision = 5',
          )
          .bind(listingId)
          .first();
        assert.equal(audit?.previous_label, 'CBC');
        assert.equal(audit?.actor_id, account.user.id);
      },
    );
    await t.test(
      'new mappings reject duplicates and missing relationships, while preserving literal provider labels',
      async () => {
        const create = {
          entity: 'listing',
          mode: 'create',
          id: 'duplicate-listing',
          branchId: 'addin-moghbazar',
          serviceId: 'complete-blood-count',
          providerServiceName: "CBC ' ; literal",
          active: '0',
          confirmMapping: 'yes',
        };
        assert.equal(code(await write(create)), 'duplicate');
        assert.equal(code(await write({ ...create, branchId: 'missing' })), 'invalid_request');
        assert.equal(code(await write({ ...create, serviceId: 'missing' })), 'invalid_request');
        assert.equal(code(await write({ ...create, confirmMapping: '' })), 'invalid_request');
      },
    );
    await t.test(
      'an old verified current price does not expire because of elapsed time',
      async () => {
        await db
          .prepare(
            "INSERT INTO services(id, category_id, name, search_key) VALUES ('historic-count', 'hematology', 'Historic count', 'historic count')",
          )
          .run();
        await db
          .prepare(
            "INSERT INTO branch_services(id, branch_id, service_id, provider_service_name) VALUES ('historic-listing', 'addin-moghbazar', 'historic-count', 'Historical fixture')",
          )
          .run();
        assert.equal(
          code(
            await write({
              ...sourceInput,
              id: 'historical-source',
              url: 'https://awmch.addinhospital.org/historical-fixture',
              retrievedAt: '2000-01-01T00:00:00Z',
            }),
          ),
          'saved',
        );
        await db
          .prepare(
            "INSERT INTO prices(id, listing_id, amount_minor, status, source_id, source_row, verified_at, verification_method, created_at) VALUES ('historical-price', 'historic-listing', 12345, 'verified', 'historical-source', 1, '2000-01-01T01:00:00Z', 'official_website_review', '2000-01-01T01:00:00Z')",
          )
          .run();
        await db
          .prepare(
            "UPDATE branch_services SET current_price_id = 'historical-price' WHERE id = 'historic-listing'",
          )
          .run();
        const price = (await publicRepository.getBranchService('historic-listing'))?.price;
        assert.equal(price?.status, 'verified');
        assert.equal(price?.verifiedAt, '2000-01-01T01:00:00Z');
        assert.equal(price?.amountMinor, 12345);
      },
    );
    await t.test(
      'revoked sessions cannot write and unavailable storage never falls back to fixtures',
      async () => {
        await db
          .prepare('DELETE FROM administrator_grants WHERE account_id = ?')
          .bind(account.user.id)
          .run();
        assert.equal((await write(sourceInput)).status, 401);
        await db
          .prepare(
            'INSERT INTO administrator_grants(account_id, granted_at, granted_by) VALUES (?, ?, ?)',
          )
          .bind(account.user.id, Date.now(), 'test')
          .run();
        const next = await store.signIn(identity, null);
        await db.prepare('ALTER TABLE listing_changes RENAME TO unavailable_changes').run();
        assert.equal(
          code(await writePricing(request(next.token, { ...priceInput, revision: '7' }), db, {})),
          'unavailable',
        );
        assert.equal(await count('prices'), 5);
        await db.prepare('ALTER TABLE branch_services RENAME TO unavailable_listings').run();
        const result = await readPricing(request(next.token), db, {});
        assert.equal(result.ok, false);
        if (!result.ok) assert.equal(result.code, 'unavailable');
      },
    );
  } finally {
    await mf.dispose();
  }
});
