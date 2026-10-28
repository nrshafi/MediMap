import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { CatalogRepository } from '../../src/features/catalog/server/repository.server';
import { catalogRead } from '../../src/features/catalog/server/reads.server';

test('catalog foundation against real local D1', async (t) => {
  const mf = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("test"); } };',
    compatibilityDate: '2026-07-30',
    d1Databases: { DB: 'catalog-integration' },
  });
  try {
    const db = await mf.getD1Database('DB');
    const migration = (
      await Promise.all(
        (await readdir('migrations'))
          .filter((name) => name.endsWith('.sql'))
          .sort()
          .map((name) => readFile(`migrations/${name}`, 'utf8')),
      )
    ).join('\n');
    const seed = await readFile('seeds/catalog.sql', 'utf8');
    // D1 exec requires one statement per line. Prepared statements preserve trigger bodies.
    const migrationStatements = migration.match(/\s*CREATE TRIGGER[\s\S]*?END;|[^;]+;/g);
    assert.ok(migrationStatements);
    await db.batch(migrationStatements.map((sql) => db.prepare(sql)));
    const seedStatements = seed
      .replace(/^--.*$/gm, '')
      .split(';')
      .map((sql) => sql.trim())
      .filter(Boolean);
    const applySeed = () => db.batch(seedStatements.map((sql) => db.prepare(sql)));
    const repository = new CatalogRepository(db);
    const listingId = 'addin-moghbazar-complete-blood-count';

    await t.test('empty database is empty without demonstration fallback', async () => {
      assert.deepEqual(await repository.listCatalog(), { items: [], nextCursor: null });
      assert.deepEqual(await repository.listBranchServices(), { items: [], nextCursor: null });
      assert.equal(await repository.getBranch('missing'), null);
    });
    await applySeed();

    await t.test(
      'reviewed import returns canonical ID, provider label, currency and distinct dates',
      async () => {
        const catalog = await repository.listCatalog();
        assert.equal(catalog.items.length, 1);
        assert.equal(catalog.items[0].id, 'complete-blood-count');
        assert.deepEqual(catalog.items[0].aliases, [{ name: 'CBC', language: 'en' }]);
        assert.deepEqual(await repository.getService('complete-blood-count'), catalog.items[0]);
        const listing = await repository.getBranchService(listingId);
        assert.ok(listing?.price);
        assert.equal(listing.providerServiceName, 'CBC');
        assert.equal(listing.price.amountBdt, 400);
        assert.equal(listing.price.status, 'verified');
        assert.equal(listing.price.source?.kind, 'official_tariff');
        assert.equal(listing.price.source?.sourceUpdatedDate, '2026-02-23');
        assert.equal(listing.price.verifiedAt, '2026-10-27T11:20:41Z');
        assert.equal(listing.price.verificationMethod, 'official_website_review');
        assert.equal(listing.price.effectiveDate, null);
        assert.equal(listing.branch.coordinates, null);
        assert.equal(listing.branch.phone, null);
        assert.equal(listing.branch.openingHours, null);
        assert.equal(listing.branch.contactSource?.kind, 'official_contact');
        assert.deepEqual(await repository.getBranch('addin-moghbazar'), listing.branch);
      },
    );

    await t.test(
      'foreign keys, uniqueness, coordinates, price amounts and evidence are enforced',
      async () => {
        await assert.rejects(
          db
            .prepare(
              "INSERT INTO services(id, category_id, name, search_key) VALUES ('bad', 'missing', 'Bad', 'bad')",
            )
            .run(),
        );
        await assert.rejects(
          db
            .prepare(
              "INSERT INTO branch_services(id, branch_id, service_id, provider_service_name) VALUES ('duplicate', 'addin-moghbazar', 'complete-blood-count', 'CBC')",
            )
            .run(),
        );
        await assert.rejects(db.prepare('UPDATE branches SET latitude = 91, longitude = 0').run());
        await assert.rejects(db.prepare('UPDATE branches SET latitude = 23').run());
        for (const amount of [0, -10, 1.5]) {
          await assert.rejects(
            db
              .prepare(
                "INSERT INTO prices(id, listing_id, amount_minor, status, created_at) VALUES ('bad-price', ?, ?, 'unverified', '2026-10-27T10:00:00Z')",
              )
              .bind(listingId, amount)
              .run(),
          );
        }
        await assert.rejects(
          db
            .prepare(
              "INSERT INTO prices(id, listing_id, amount_minor, status, created_at) VALUES ('bad-verified', ?, 100, 'verified', '2026-10-27T10:00:00Z')",
            )
            .bind(listingId)
            .run(),
        );
        await assert.rejects(
          db
            .prepare(
              "INSERT INTO prices(id, listing_id, amount_minor, status, source_id, source_row, verified_at, verification_method, created_at) VALUES ('contact-price', ?, 100, 'verified', 'addin-contact-20261027', 1, '2026-10-27T10:00:00Z', 'official_website_review', '2026-10-27T10:00:00Z')",
            )
            .bind(listingId)
            .run(),
        );
      },
    );

    await t.test(
      'missing current revision preserves nulls and seed reruns preserve later choices',
      async () => {
        await db
          .prepare('UPDATE branch_services SET current_price_id = NULL WHERE id = ?')
          .bind(listingId)
          .run();
        await applySeed();
        assert.equal((await repository.getBranchService(listingId))?.price, null);
        await db
          .prepare(
            "UPDATE branch_services SET current_price_id = 'addin-moghbazar-cbc-20261027' WHERE id = ?",
          )
          .bind(listingId)
          .run();
      },
    );

    await t.test(
      'new price selection retains history and rolls back an invalid batch',
      async () => {
        await db.batch([
          db
            .prepare(
              "INSERT INTO prices(id, listing_id, amount_minor, status, created_at) VALUES ('revision-two', ?, 45000, 'unverified', '2026-10-27T11:00:00Z')",
            )
            .bind(listingId),
          db
            .prepare("UPDATE branch_services SET current_price_id = 'revision-two' WHERE id = ?")
            .bind(listingId),
        ]);
        const current = (await repository.getBranchService(listingId))?.price;
        assert.equal(current?.amountBdt, 450);
        assert.equal(current?.source, null);
        assert.equal(current?.verifiedAt, null);
        assert.equal(
          (
            await db
              .prepare('SELECT COUNT(*) AS count FROM prices WHERE listing_id = ?')
              .bind(listingId)
              .first<{ count: number }>()
          )?.count,
          2,
        );
        await assert.rejects(
          db.prepare("UPDATE prices SET amount_minor = 100 WHERE id = 'revision-two'").run(),
        );
        await assert.rejects(db.prepare("DELETE FROM prices WHERE id = 'revision-two'").run());
        await assert.rejects(
          db.batch([
            db
              .prepare(
                "INSERT INTO prices(id, listing_id, amount_minor, status, created_at) VALUES ('rolled-back', ?, 50000, 'unverified', '2026-10-27T11:00:00Z')",
              )
              .bind(listingId),
            db
              .prepare("UPDATE branch_services SET current_price_id = 'missing' WHERE id = ?")
              .bind(listingId),
          ]),
        );
        assert.equal(
          await db.prepare("SELECT id FROM prices WHERE id = 'rolled-back'").first(),
          null,
        );
        assert.equal((await repository.getBranchService(listingId))?.price?.id, 'revision-two');
        await db
          .prepare(
            "UPDATE branch_services SET current_price_id = 'addin-moghbazar-cbc-20261027' WHERE id = ?",
          )
          .bind(listingId)
          .run();
      },
    );

    await t.test('inactive listings and every inactive ancestor are excluded', async () => {
      for (const [table, id] of [
        ['categories', 'hematology'],
        ['services', 'complete-blood-count'],
        ['providers', 'addin-medical-college-hospital'],
        ['branches', 'addin-moghbazar'],
        ['branch_services', listingId],
      ]) {
        // Table names are test constants, never external input.
        await db.prepare(`UPDATE ${table} SET active = 0 WHERE id = ?`).bind(id).run();
        assert.equal((await repository.listBranchServices()).items.length, 0);
        assert.equal(await repository.getBranchService(listingId), null);
        await db.prepare(`UPDATE ${table} SET active = 1 WHERE id = ?`).bind(id).run();
      }
    });

    await t.test(
      'bound names round-trip, pagination works and cross-listing price references fail',
      async () => {
        await db
          .prepare('INSERT INTO services(id, category_id, name, search_key) VALUES (?, ?, ?, ?)')
          .bind(
            'another-service',
            'hematology',
            "Name with ' and ; DROP TABLE services",
            "name with ' and ; drop table services",
          )
          .run();
        await db
          .prepare(
            "INSERT INTO branch_services(id, branch_id, service_id, provider_service_name) VALUES ('another-listing', 'addin-moghbazar', 'another-service', 'Original name')",
          )
          .run();
        await assert.rejects(
          db
            .prepare(
              "UPDATE branch_services SET current_price_id = 'addin-moghbazar-cbc-20261027' WHERE id = 'another-listing'",
            )
            .run(),
        );
        const first = await repository.listCatalog({ limit: 1 });
        assert.equal(first.items[0].name, "Name with ' and ; DROP TABLE services");
        assert.equal(first.nextCursor, 'another-service');
        assert.equal(
          (await repository.listCatalog({ after: first.nextCursor, limit: 1 })).items[0].id,
          'complete-blood-count',
        );
        assert.equal(
          (await repository.listBranchServices({ serviceId: 'another-service' })).items[0].price,
          null,
        );
        assert.equal(
          (await repository.listBranchServices({ branchId: 'missing' })).items.length,
          0,
        );
        const listingPage = await repository.listBranchServices({ limit: 1 });
        assert.ok(listingPage.nextCursor);
        assert.equal(
          (await repository.listBranchServices({ after: listingPage.nextCursor, limit: 1 })).items
            .length,
          1,
        );
      },
    );

    await t.test('invalid server requests fail before queries and cannot inject SQL', async () => {
      for (const request of [
        null,
        [],
        { kind: 'write' },
        { kind: 'service', id: "' OR 1=1 --" },
        { kind: 'catalog', query: { limit: 0 } },
        { kind: 'listings', query: { limit: NaN } },
        { kind: 'branch', id: {} },
        { kind: 'listings', query: { after: 'x;DROP TABLE prices' } },
      ]) {
        const result = await catalogRead(db, request);
        assert.equal(result.ok, false);
        if (!result.ok) assert.equal(result.code, 'invalid_request');
      }
      assert.deepEqual(await repository.getService('missing-or-1'), null);
      assert.ok((await repository.getBranchService(listingId))?.price);
    });

    await t.test(
      'corrupt stored evidence produces explicit unavailable response without fallback',
      async () => {
        await db
          .prepare(
            "UPDATE sources SET retrieved_at = 'invalid' WHERE id = 'addin-hematology-20261027'",
          )
          .run();
        const result = await catalogRead(db, { kind: 'listing', id: listingId });
        assert.deepEqual(result, {
          ok: false,
          code: 'unavailable',
          message: 'The catalog is unavailable. Try again.',
        });
        await db
          .prepare(
            "UPDATE sources SET retrieved_at = '2026-10-27T10:28:23.332Z' WHERE id = 'addin-hematology-20261027'",
          )
          .run();
      },
    );

    await t.test('database failure returns unavailable without exposing SQL', async () => {
      await db.prepare('DROP TABLE service_aliases').run();
      const result = await catalogRead(db, { kind: 'catalog' });
      assert.deepEqual(result, {
        ok: false,
        code: 'unavailable',
        message: 'The catalog is unavailable. Try again.',
      });
    });
  } finally {
    await mf.dispose();
  }
});
