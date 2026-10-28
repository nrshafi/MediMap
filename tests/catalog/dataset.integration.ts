import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { readReviewedInputs, seedStatements } from '../../scripts/data/reviewedCatalog';
import { auditReviewedCatalog } from '../../scripts/database/reviewed-audit';
import { CatalogRepository } from '../../src/features/catalog/server/repository.server';
import { AuthStore } from '../../src/features/authentication/server/store.server';
import { CorrectionRepository } from '../../src/features/corrections/repository.server';
import { parseReport } from '../../src/features/corrections/contracts';

test('reviewed hospital dataset against actual local D1', async (t) => {
  const mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test");}}',
    compatibilityDate: '2026-07-30',
    d1Databases: { DB: 'reviewed-dataset-integration' },
  });
  try {
    const db = await mf.getD1Database('DB');
    for (const name of (await readdir('migrations'))
      .filter((name) => name.endsWith('.sql'))
      .sort()) {
      const statements = (await readFile(`migrations/${name}`, 'utf8')).match(
        /\s*CREATE TRIGGER[\s\S]*?END;|[^;]+;/g,
      );
      assert.ok(statements);
      await db.batch(statements.map((sql) => db.prepare(sql)));
    }
    const base = (await readFile('seeds/catalog.sql', 'utf8'))
      .replace(/^--.*$/gm, '')
      .split(';')
      .map((sql) => sql.trim())
      .filter(Boolean);
    await db.batch(base.map((sql) => db.prepare(sql)));
    const { catalog } = await readReviewedInputs();
    const repository = new CatalogRepository(db);
    const apply = () => db.batch(seedStatements(catalog).map((sql) => db.prepare(sql)));
    await t.test('a conflicting canonical term rolls back the entire reviewed import', async () => {
      await db
        .prepare(
          "INSERT INTO services(id,category_id,name,search_key) VALUES ('fixture-collision','hematology','HbA1c','hba1c')",
        )
        .run();
      await assert.rejects(apply(), /UNIQUE constraint/);
      assert.equal(
        await db
          .prepare(
            "SELECT COUNT(*) AS count FROM providers WHERE id != 'addin-medical-college-hospital'",
          )
          .first('count'),
        0,
      );
      assert.equal(
        await db
          .prepare("SELECT COUNT(*) AS count FROM categories WHERE id = 'biochemistry'")
          .first('count'),
        0,
      );
      assert.equal(
        await db.prepare('SELECT COUNT(*) AS count FROM branch_services').first('count'),
        1,
      );
      await db.prepare("DELETE FROM services WHERE id = 'fixture-collision'").run();
    });
    await t.test(
      'verified entry preserves the original listing and publishes every reviewed record',
      async () => {
        await apply();
        const audit = await auditReviewedCatalog(db, catalog);
        assert.equal(audit.issues.length, 0);
        assert.equal(audit.overrides.length, 0);
        assert.equal(audit.expectedListings, 196);
        assert.equal(audit.storedSeedPrices, 196);
        assert.equal(audit.publicActiveListings, 196);
        assert.equal(audit.verifiedCurrentListings, 196);
        assert.equal(await db.prepare('SELECT COUNT(*) AS count FROM providers').first('count'), 3);
        assert.equal(await db.prepare('SELECT COUNT(*) AS count FROM branches').first('count'), 3);
        assert.equal(
          await db.prepare('SELECT COUNT(*) AS count FROM services').first('count'),
          136,
        );
      },
    );
    await t.test(
      'paginated public reads return the same complete listing set without fixture substitution',
      async () => {
        const ids: string[] = [];
        let after: string | undefined;
        do {
          const page = await repository.listBranchServices({
            limit: 37,
            ...(after ? { after } : {}),
          });
          ids.push(...page.items.map((item) => item.id));
          after = page.nextCursor ?? undefined;
        } while (after);
        assert.deepEqual(ids.sort(), catalog.listings.map((item) => item.id).sort());
        assert.equal(new Set(ids).size, 196);
        for (const branch of catalog.branches) {
          const actual = await repository.getBranch(branch.id);
          assert.equal(actual?.address, branch.address);
          assert.equal(actual?.coordinates, null);
          assert.equal(actual?.openingHours, null);
        }
      },
    );
    await t.test(
      'representative prices retain exact source rows, currencies and separate review dates',
      async () => {
        for (const id of [
          'addin-moghbazar-hba1c',
          'mogh-kamalapur-hba1c',
          'holy-family-eskatan-covid-19-rt-pcr',
          'holy-family-eskatan-covid-19-antigen-rapid',
          'mogh-kamalapur-complete-blood-count',
        ]) {
          const expected = catalog.listings.find((item) => item.id === id);
          assert.ok(expected);
          const actual = await repository.getBranchService(id);
          assert.ok(actual?.price);
          assert.equal(actual.price.amountMinor, expected.amountMinor);
          assert.equal(actual.price.sourceRow, expected.sourceRow);
          assert.equal(actual.price.source?.id, expected.sourceId);
          assert.equal(actual.price.verifiedAt, expected.verifiedAt);
          assert.equal(actual.price.effectiveDate, null);
        }
        assert.equal(
          (await repository.getBranchService('holy-family-eskatan-covid-19-rt-pcr'))?.price
            ?.amountMinor,
          300000,
        );
        assert.equal(
          (await repository.getBranchService('holy-family-eskatan-covid-19-antigen-rapid'))?.price
            ?.amountMinor,
          70000,
        );
        assert.equal(await repository.getBranch('bmu-ssh-shahbag'), null);
        assert.equal(await repository.getBranch('farabi-dhanmondi'), null);
      },
    );
    await t.test(
      'seed reruns are idempotent without additional snapshots or price revisions',
      async () => {
        const before = await db.prepare('SELECT COUNT(*) AS count FROM prices').first('count');
        const sources = await db.prepare('SELECT COUNT(*) AS count FROM sources').first('count');
        await apply();
        assert.equal(
          await db.prepare('SELECT COUNT(*) AS count FROM prices').first('count'),
          before,
        );
        assert.equal(
          await db.prepare('SELECT COUNT(*) AS count FROM sources').first('count'),
          sources,
        );
        assert.equal((await auditReviewedCatalog(db, catalog)).issues.length, 0);
      },
    );
    await t.test(
      'unknown prices and administrator metadata changes survive later seed runs',
      async () => {
        const id = 'mogh-kamalapur-hba1c';
        await db
          .prepare(
            'UPDATE branch_services SET current_price_id = NULL,revision = revision + 1 WHERE id = ?',
          )
          .bind(id)
          .run();
        await db
          .prepare(
            "UPDATE branches SET phone = '0255555000',revision = revision + 1 WHERE id = 'mogh-kamalapur'",
          )
          .run();
        await apply();
        assert.equal((await repository.getBranchService(id))?.price, null);
        assert.equal((await repository.getBranch('mogh-kamalapur'))?.phone, '0255555000');
        const audit = await auditReviewedCatalog(db, catalog);
        assert.equal(audit.issues.length, 0);
        assert.ok(audit.overrides.some((item) => item.id === id));
        assert.ok(audit.overrides.some((item) => item.id === 'mogh-kamalapur'));
      },
    );
    await t.test('pending price reports stay disputed during a reviewed seed rerun', async () => {
      const id = 'addin-moghbazar-hba1c';
      const listing = await repository.getBranchService(id);
      assert.ok(listing?.price);
      const account = await new AuthStore(db).signIn(
        { subject: 'dataset-reporter', email: 'dataset@example.test' },
        null,
      );
      const session = await new AuthStore(db).session(account.token);
      if (session.status !== 'authenticated') throw new Error('Missing fixture account');
      const revision = await db
        .prepare('SELECT revision FROM branch_services WHERE id = ?')
        .bind(id)
        .first<number>('revision');
      assert.ok(revision);
      await new CorrectionRepository(db).submit(
        parseReport({
          target: 'listing',
          id,
          issue: 'price',
          observedRevision: String(revision),
          observedPriceId: listing.price.id,
          details: 'The official tariff might show another amount for this listing.',
          confirmReport: 'yes',
        }),
        session.user.id,
      );
      const disputed = await repository.getBranchService(id);
      assert.equal(disputed?.price?.status, 'disputed');
      await apply();
      assert.equal((await repository.getBranchService(id))?.price?.id, disputed?.price?.id);
      assert.equal((await repository.getBranchService(id))?.price?.status, 'disputed');
      assert.equal((await auditReviewedCatalog(db, catalog)).issues.length, 0);
    });
    await t.test(
      'reconciliation detects source tampering, missing records and canonical ownership drift',
      async () => {
        const changed = structuredClone(catalog);
        changed.sources[0].sha256 = 'a'.repeat(64);
        let audit = await auditReviewedCatalog(db, changed);
        assert.ok(
          audit.issues.some(
            (item) => item.kind === 'conflict' && item.reason.includes('source evidence'),
          ),
        );
        const missing = structuredClone(catalog);
        missing.listings[0].priceId = 'missing-seed-price';
        audit = await auditReviewedCatalog(db, missing);
        assert.ok(audit.issues.some((item) => item.kind === 'missing'));
        const mapping = structuredClone(catalog);
        mapping.listings[0].serviceId = 'hba1c';
        audit = await auditReviewedCatalog(db, mapping);
        assert.ok(
          audit.issues.some(
            (item) => item.kind === 'conflict' && item.reason.includes('canonical mapping'),
          ),
        );
      },
    );
  } finally {
    await mf.dispose();
  }
});
