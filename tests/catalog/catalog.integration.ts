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
        assert.deepEqual(listing.branch.coordinates, {
          latitude: 23.7483439,
          longitude: 90.4053762,
        });
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
        await assert.rejects(db.prepare('UPDATE branches SET longitude = NULL').run());
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

    await t.test(
      'landing data repository read excludes inactive entities, orders by count and name, and returns hospital branches',
      async () => {
        // Setup additional entities to verify filtering and ordering
        await db.batch([
          // Active provider with multiple branches (2 active, 1 inactive)
          db.prepare(
            "INSERT INTO providers(id, name, search_key, active) VALUES ('test-provider-beta', 'Beta Hospital', 'beta hospital', 1)",
          ),
          db.prepare(
            "INSERT INTO branches(id, provider_id, name, address, search_key, active) VALUES ('test-branch-b1', 'test-provider-beta', 'Beta Dhanmondi', 'Dhanmondi', 'beta dhanmondi', 1)",
          ),
          db.prepare(
            "INSERT INTO branches(id, provider_id, name, address, search_key, active) VALUES ('test-branch-b2', 'test-provider-beta', 'Beta Uttara', 'Uttara', 'beta uttara', 1)",
          ),
          db.prepare(
            "INSERT INTO branches(id, provider_id, name, address, search_key, active) VALUES ('test-branch-b-inactive', 'test-provider-beta', 'Beta Inactive Branch', 'Mirpur', 'beta inactive branch', 0)",
          ),

          // Inactive provider with an active branch
          db.prepare(
            "INSERT INTO providers(id, name, search_key, active) VALUES ('test-provider-inactive', 'Inactive Hospital', 'inactive hospital', 0)",
          ),
          db.prepare(
            "INSERT INTO branches(id, provider_id, name, address, search_key, active) VALUES ('test-branch-in1', 'test-provider-inactive', 'Inactive Branch', 'Gulshan', 'inactive branch', 1)",
          ),

          // Services for ordering check:
          // S-Alpha: 3 active listings
          // Complete Blood Count: already has 1, add 1 -> 2 active listings
          // S-Zeta: 2 active listings (tie with CBC, but Zeta > Complete alphabetically)
          // S-Inactive: 1 active listing on active branch -> must be excluded
          db.prepare(
            "INSERT INTO services(id, category_id, name, search_key, active) VALUES ('test-service-alpha', 'hematology', 'Alpha Hemogram', 'alpha hemogram', 1)",
          ),
          db.prepare(
            "INSERT INTO services(id, category_id, name, search_key, active) VALUES ('test-service-zeta', 'hematology', 'Zeta Blood Test', 'zeta blood test', 1)",
          ),
          db.prepare(
            "INSERT INTO services(id, category_id, name, search_key, active) VALUES ('test-service-inactive', 'hematology', 'Inactive Service', 'inactive service', 0)",
          ),

          // Listings for S-Alpha (3 active listings)
          db.prepare(
            "INSERT INTO branch_services(id, branch_id, service_id, provider_service_name, active) VALUES ('test-bs-alpha-1', 'addin-moghbazar', 'test-service-alpha', 'Alpha 1', 1)",
          ),
          db.prepare(
            "INSERT INTO branch_services(id, branch_id, service_id, provider_service_name, active) VALUES ('test-bs-alpha-2', 'test-branch-b1', 'test-service-alpha', 'Alpha 2', 1)",
          ),
          db.prepare(
            "INSERT INTO branch_services(id, branch_id, service_id, provider_service_name, active) VALUES ('test-bs-alpha-3', 'test-branch-b2', 'test-service-alpha', 'Alpha 3', 1)",
          ),

          // Additional listing for Complete Blood Count (to make 2 active listings)
          db.prepare(
            "INSERT INTO branch_services(id, branch_id, service_id, provider_service_name, active) VALUES ('test-bs-cbc-2', 'test-branch-b1', 'complete-blood-count', 'CBC Beta', 1)",
          ),

          // Listings for S-Zeta:
          // 2 active listings
          db.prepare(
            "INSERT INTO branch_services(id, branch_id, service_id, provider_service_name, active) VALUES ('test-bs-zeta-1', 'test-branch-b1', 'test-service-zeta', 'Zeta 1', 1)",
          ),
          db.prepare(
            "INSERT INTO branch_services(id, branch_id, service_id, provider_service_name, active) VALUES ('test-bs-zeta-2', 'test-branch-b2', 'test-service-zeta', 'Zeta 2', 1)",
          ),
          // 1 inactive listing on S-Zeta (should NOT be counted)
          db.prepare(
            "INSERT INTO branch_services(id, branch_id, service_id, provider_service_name, active) VALUES ('test-bs-zeta-inactive', 'addin-moghbazar', 'test-service-zeta', 'Zeta Inactive', 0)",
          ),
          // 1 listing on inactive branch (should NOT be counted)
          db.prepare(
            "INSERT INTO branch_services(id, branch_id, service_id, provider_service_name, active) VALUES ('test-bs-zeta-on-in-branch', 'test-branch-b-inactive', 'test-service-zeta', 'Zeta On Inactive Branch', 1)",
          ),
          // 1 listing on inactive provider (should NOT be counted)
          db.prepare(
            "INSERT INTO branch_services(id, branch_id, service_id, provider_service_name, active) VALUES ('test-bs-zeta-on-in-provider', 'test-branch-in1', 'test-service-zeta', 'Zeta On Inactive Provider', 1)",
          ),

          // Listing for inactive service (should NOT appear in popular services)
          db.prepare(
            "INSERT INTO branch_services(id, branch_id, service_id, provider_service_name, active) VALUES ('test-bs-inactive-service', 'addin-moghbazar', 'test-service-inactive', 'Inactive Service Listing', 1)",
          ),
        ]);

        const landingData = await repository.getLandingData();

        // 1. Inactive service is excluded
        assert.equal(
          landingData.popularServices.some((s) => s.id === 'test-service-inactive'),
          false,
        );

        // 2. Order is by listing count descending, then name ascending
        // Alpha has 3 listings -> index 0
        assert.equal(landingData.popularServices[0].id, 'test-service-alpha');
        assert.equal(landingData.popularServices[0].name, 'Alpha Hemogram');
        assert.equal(landingData.popularServices[0].listingCount, 3);
        assert.equal(landingData.popularServices[0].category, 'Hematology');

        // Complete Blood Count and Zeta Blood Test each have 2 listings (tie-break by name ascending)
        // 'Complete Blood Count' < 'Zeta Blood Test'
        assert.equal(landingData.popularServices[1].id, 'complete-blood-count');
        assert.equal(landingData.popularServices[1].listingCount, 2);

        assert.equal(landingData.popularServices[2].id, 'test-service-zeta');
        assert.equal(landingData.popularServices[2].listingCount, 2);

        // 3. Hospital branches check:
        // Inactive provider 'test-provider-inactive' must be excluded
        assert.equal(
          landingData.hospitals.some((h) => h.id === 'test-provider-inactive'),
          false,
        );

        // Beta Hospital has 2 active branches ('Beta Dhanmondi', 'Beta Uttara'); inactive branch excluded
        const betaHospital = landingData.hospitals.find((h) => h.id === 'test-provider-beta');
        assert.ok(betaHospital);
        assert.equal(betaHospital.name, 'Beta Hospital');
        assert.equal(betaHospital.branchCount, 2);
        assert.deepEqual(betaHospital.branches, [
          { id: 'test-branch-b1', name: 'Beta Dhanmondi' },
          { id: 'test-branch-b2', name: 'Beta Uttara' },
        ]);

        // Ad-din hospital has 1 branch ('Moghbazar')
        const addinHospital = landingData.hospitals.find(
          (h) => h.id === 'addin-medical-college-hospital',
        );
        assert.ok(addinHospital);
        assert.equal(addinHospital.branchCount, 1);
        assert.deepEqual(addinHospital.branches, [{ id: 'addin-moghbazar', name: 'Moghbazar' }]);

        // Cleanup test data
        await db.batch([
          db.prepare("DELETE FROM branch_services WHERE id LIKE 'test-bs-%'"),
          db.prepare("DELETE FROM services WHERE id LIKE 'test-service-%'"),
          db.prepare("DELETE FROM branches WHERE id LIKE 'test-branch-%'"),
          db.prepare("DELETE FROM providers WHERE id LIKE 'test-provider-%'"),
        ]);
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
        // Simulate storage corruption after bypassing the immutable-source guard in this isolated database.
        await db.prepare('DROP TRIGGER source_snapshot_update').run();
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
