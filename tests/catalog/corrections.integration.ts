import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { AuthStore } from '../../src/features/authentication/server/store.server';
import { tokenHash } from '../../src/features/authentication/server/crypto.server';
import { CorrectionRepository } from '../../src/features/corrections/repository.server';
import { readReportTarget } from '../../src/features/corrections/targets.server';
import { reportPage, submitReport } from '../../src/features/corrections/operations.server';
import { parseReport } from '../../src/features/corrections/contracts';
import { CatalogRepository } from '../../src/features/catalog/server/repository.server';
import { writePricing } from '../../src/features/pricing/operations.server';

const origin = 'http://localhost:3000';
const listing = 'addin-moghbazar-complete-blood-count';
const provider = 'addin-medical-college-hospital';
const branch = 'addin-moghbazar';
const details = 'The official tariff appears to show a different amount.';
function request(token?: string, input: Record<string, string> = {}, requestOrigin = origin) {
  return new Request(`${origin}/report/submit`, {
    method: 'POST',
    headers: {
      origin: requestOrigin,
      ...(token ? { cookie: `medimap_session=${token}; role=administrator` } : {}),
    },
    body: new URLSearchParams(input),
  });
}

test('correction submission against actual local D1', async (t) => {
  const mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test");}}',
    compatibilityDate: '2026-07-30',
    d1Databases: { DB: 'corrections-integration' },
  });
  try {
    const db = await mf.getD1Database('DB');
    const apply = async (name: string) => {
      const statements = (await readFile(`migrations/${name}`, 'utf8')).match(
        /\s*CREATE TRIGGER[\s\S]*?END;|[^;]+;/g,
      );
      assert.ok(statements);
      await db.batch(statements.map((sql) => db.prepare(sql)));
    };
    const names = (await readdir('migrations')).filter((name) => name.endsWith('.sql')).sort();
    for (const name of names.filter((name) => name < '0007')) await apply(name);
    const seed = (await readFile('seeds/catalog.sql', 'utf8'))
      .replace(/^--.*$/gm, '')
      .split(';')
      .map((sql) => sql.trim())
      .filter(Boolean);
    await db.batch(seed.map((sql) => db.prepare(sql)));
    await apply('0007_correction_reports.sql');
    const store = new AuthStore(db);
    const account = async (subject: string) => {
      const login = await store.signIn({ subject, email: `${subject}@example.test` }, null);
      const session = await store.session(login.token);
      if (session.status !== 'authenticated') throw new Error('Fixture session missing');
      return { token: login.token, id: session.user.id };
    };
    const member = await account('report-member');
    const other = await account('report-other');
    const expired = await account('report-expired');
    await db
      .prepare('UPDATE auth_sessions SET created_at = ?, expires_at = ? WHERE token_hash = ?')
      .bind(Date.now() - 10000, Date.now() - 1000, await tokenHash(expired.token))
      .run();
    const repository = new CorrectionRepository(db);
    const count = () =>
      db.prepare('SELECT COUNT(*) AS count FROM correction_reports').first<number>('count');
    const form = async (target: 'listing' | 'branch' | 'provider' = 'listing', issue = 'price') => {
      const record = await readReportTarget(db, {
        target,
        id: target === 'listing' ? listing : target === 'branch' ? branch : provider,
      });
      assert.ok(record);
      return {
        target,
        id: record.id,
        issue,
        observedRevision: String(record.revision),
        observedPriceId: record.price?.id ?? '',
        details,
        suggestedCorrection: 'BDT 1.00',
        evidenceUrl: 'https://example.test/evidence',
        confirmReport: 'yes',
      };
    };
    let receiptId = '';
    await t.test(
      'upgrade preserves published prices and limits target access to active records',
      async () => {
        assert.equal(
          (await new CatalogRepository(db).getBranchService(listing))?.price?.status,
          'verified',
        );
        assert.equal(await count(), 0);
        assert.equal(await readReportTarget(db, { target: 'listing', id: 'missing' }), null);
        await db.prepare('UPDATE branches SET active = 0 WHERE id = ?').bind(branch).run();
        assert.equal(await readReportTarget(db, { target: 'listing', id: listing }), null);
        assert.equal(await readReportTarget(db, { target: 'branch', id: branch }), null);
        await db.prepare('UPDATE branches SET active = 1 WHERE id = ?').bind(branch).run();
      },
    );
    await t.test(
      'anonymous, forged and expired sessions cannot submit; expired drafts survive',
      async () => {
        for (const token of [undefined, 'x'.repeat(43), expired.token]) {
          const result = await submitReport(request(token, await form()), db, {});
          assert.equal(result.ok, false);
          if (result.ok) throw new Error('Unexpected success');
          assert.equal(result.status, 401);
          assert.equal(result.draft.details, details);
          assert.equal(result.data.access, token === expired.token ? 'expired' : 'sign_in');
        }
        assert.equal(await count(), 0);
      },
    );
    await t.test(
      'same-origin POST, bounded body, unique fields and explicit confirmation are required',
      async () => {
        const input = await form();
        for (const req of [
          request(member.token, input, 'https://attacker.test'),
          request(member.token, { ...input, confirmReport: '' }),
          request(member.token, { ...input, details: 'x'.repeat(66000) }),
          new Request(`${origin}/report/submit`, {
            headers: { cookie: `medimap_session=${member.token}`, origin },
          }),
          new Request(`${origin}/report/submit`, {
            method: 'POST',
            headers: {
              cookie: `medimap_session=${member.token}`,
              origin,
              'content-type': 'application/x-www-form-urlencoded',
            },
            body: 'target=listing&target=provider',
          }),
        ]) {
          const result = await submitReport(req, db, {});
          assert.equal(result.ok, false);
          if (!result.ok) assert.equal(result.status, 400);
        }
        const invalid = await submitReport(
          request(member.token, { ...input, evidenceUrl: 'javascript:alert(1)' }),
          db,
          {},
        );
        assert.equal(invalid.ok, false);
        if (!invalid.ok) assert.equal(invalid.draft.details, details);
        assert.equal(await count(), 0);
      },
    );
    await t.test(
      'stale revision or price rejects the whole submission with refreshed form data',
      async () => {
        const input = await form();
        for (const changed of [
          { ...input, observedRevision: '999' },
          { ...input, observedPriceId: '' },
        ]) {
          const result = await submitReport(request(member.token, changed), db, {});
          assert.equal(result.ok, false);
          if (!result.ok) {
            assert.equal(result.status, 409);
            assert.equal(result.data.target?.revision, 1);
            assert.equal(result.draft.details, details);
          }
        }
        assert.equal(await count(), 0);
        assert.equal(
          await db.prepare('SELECT COUNT(*) AS count FROM listing_changes').first('count'),
          0,
        );
      },
    );
    await t.test(
      'ordinary member report atomically disputes price without changing amount, source or review',
      async () => {
        const before = await new CatalogRepository(db).getBranchService(listing);
        assert.ok(before?.price);
        const input = await form();
        const result = await submitReport(
          request(member.token, {
            ...input,
            reporterId: other.id,
            amount: '1',
            status: 'verified',
            address: 'Forged address',
          }),
          db,
          {},
        );
        assert.equal(result.ok, true);
        if (!result.ok) throw new Error('Report failed');
        receiptId = result.id;
        const after = await new CatalogRepository(db).getBranchService(listing);
        assert.ok(after?.price);
        assert.equal(after.price.status, 'disputed');
        assert.equal(after.price.amountMinor, before.price.amountMinor);
        assert.equal(after.price.source?.id, before.price.source?.id);
        assert.equal(after.price.sourceRow, before.price.sourceRow);
        assert.equal(after.price.verifiedAt, before.price.verifiedAt);
        assert.equal(after.price.effectiveDate, before.price.effectiveDate);
        assert.equal(after.price.verificationMethod, before.price.verificationMethod);
        assert.equal(after.branch.address, before.branch.address);
        assert.equal(
          await db
            .prepare('SELECT status FROM prices WHERE id = ?')
            .bind(before.price.id)
            .first('status'),
          'verified',
        );
        const receipt = await repository.ownReceipt(receiptId, member.id);
        assert.equal(receipt?.target.price?.status, 'verified');
        assert.equal(receipt?.suggestedCorrection, 'BDT 1.00');
        assert.equal(await repository.ownReceipt(receiptId, other.id), null);
        assert.equal(
          await db
            .prepare('SELECT actor_id FROM listing_changes WHERE listing_id = ?')
            .bind(listing)
            .first('actor_id'),
          member.id,
        );
      },
    );
    await t.test(
      'receipt access checks the owner and never exposes another account report',
      async () => {
        const own = await reportPage(request(member.token), db, { submitted: receiptId });
        assert.equal(own.receipt?.id, receiptId);
        const stranger = await reportPage(request(other.token), db, { submitted: receiptId });
        assert.equal(stranger.receipt, null);
        assert.equal(stranger.error, 'not_found');
        assert.equal((await reportPage(request(), db, { submitted: receiptId })).receipt, null);
      },
    );
    await t.test(
      'duplicate pending submissions fail while another account can report an already disputed price',
      async () => {
        const duplicate = await submitReport(request(member.token, await form()), db, {});
        assert.equal(duplicate.ok, false);
        if (!duplicate.ok) assert.equal(duplicate.data.error, 'duplicate');
        const prices = await db.prepare('SELECT COUNT(*) AS count FROM prices').first('count');
        assert.equal((await submitReport(request(other.token, await form()), db, {})).ok, true);
        assert.equal(
          await db.prepare('SELECT COUNT(*) AS count FROM prices').first('count'),
          prices,
        );
        assert.equal(
          await db.prepare('SELECT COUNT(*) AS count FROM listing_changes').first('count'),
          1,
        );
      },
    );
    await t.test(
      'pending price reports block administrator verification and old verified pointer restoration',
      async () => {
        const identity = { subject: 'report-admin', email: 'admin@example.test' };
        const initial = await store.signIn(identity, null);
        const session = await store.session(initial.token);
        if (session.status !== 'authenticated') throw new Error('Admin fixture missing');
        await db
          .prepare(
            'INSERT INTO administrator_grants(account_id, granted_at, granted_by) VALUES (?, ?, ?)',
          )
          .bind(session.user.id, Date.now(), 'integration-test')
          .run();
        const admin = await store.signIn(identity, null);
        const input = {
          entity: 'price',
          action: 'set',
          id: listing,
          revision: '2',
          amount: '400',
          status: 'verified',
          sourceId: 'addin-hematology-20261027',
          sourceRow: '1',
          confirmReview: 'yes',
          standardPrice: 'yes',
        };
        const response = await writePricing(request(admin.token, input), db, {});
        assert.equal(
          new URL(response.headers.get('location') ?? '/', origin).searchParams.get('code'),
          'pending_report',
        );
        await assert.rejects(
          db
            .prepare('UPDATE branch_services SET current_price_id = ? WHERE id = ?')
            .bind('addin-moghbazar-cbc-20261027', listing)
            .run(),
          /price_report_pending/,
        );
        assert.equal(
          (await reportPage(request(admin.token), db, { submitted: receiptId })).receipt,
          null,
        );
      },
    );
    await t.test(
      'non-price reports retain text while leaving published details unchanged',
      async () => {
        const before = await db.prepare('SELECT * FROM branches WHERE id = ?').bind(branch).first();
        for (const issue of ['address', 'hours', 'phone'])
          assert.equal(
            (await submitReport(request(member.token, await form('branch', issue)), db, {})).ok,
            true,
          );
        assert.equal(
          (
            await submitReport(
              request(member.token, await form('provider', 'provider_information')),
              db,
              {},
            )
          ).ok,
          true,
        );
        assert.deepEqual(
          await db.prepare('SELECT * FROM branches WHERE id = ?').bind(branch).first(),
          before,
        );
        assert.equal(await count(), 6);
      },
    );
    await t.test(
      'five reports per rolling 24 hours applies across all targets and statuses',
      async () => {
        const input = await form('provider', 'phone');
        const result = await submitReport(request(member.token, input), db, {});
        assert.equal(result.ok, false);
        if (!result.ok) {
          assert.equal(result.status, 429);
          assert.equal(result.data.error, 'rate_limited');
          assert.equal(result.draft.details, details);
        }
        await db
          .prepare("UPDATE correction_reports SET status = 'rejected' WHERE reporter_id = ?")
          .bind(member.id)
          .run();
        const result2 = await submitReport(request(member.token, input), db, {});
        assert.equal(result2.ok, false);
        if (!result2.ok) assert.equal(result2.status, 429);
      },
    );
    await t.test(
      'the exact 24-hour boundary releases quota and simultaneous submissions cannot exceed it',
      async () => {
        const actor = await account('report-boundary');
        const now = Date.now();
        const input = parseReport(await form('provider', 'phone'));
        for (let i = 0; i < 5; i++) {
          const result = await repository.submit(input, actor.id, now - 86400000);
          await db
            .prepare("UPDATE correction_reports SET status = 'rejected' WHERE id = ?")
            .bind(result.id)
            .run();
        }
        const first = await repository.submit(input, actor.id, now);
        await db
          .prepare("UPDATE correction_reports SET status = 'rejected' WHERE id = ?")
          .bind(first.id)
          .run();
        const requests = [
          await form('branch', 'address'),
          await form('branch', 'hours'),
          await form('branch', 'phone'),
          await form('provider', 'provider_information'),
          await form('provider', 'phone'),
        ];
        const results = await Promise.allSettled(
          requests.map((raw) => repository.submit(parseReport(raw), actor.id, now)),
        );
        assert.equal(results.filter((result) => result.status === 'fulfilled').length, 4);
        assert.equal(
          results.filter(
            (result) => result.status === 'rejected' && result.reason.code === 'rate_limited',
          ).length,
          1,
        );
        assert.equal(
          await db
            .prepare(
              'SELECT COUNT(*) AS count FROM correction_reports WHERE reporter_id = ? AND created_at > ?',
            )
            .bind(actor.id, now - 86400000)
            .first('count'),
          5,
        );
      },
    );
    await t.test('concurrent duplicate submissions retain only one report', async () => {
      const actor = await account('report-duplicate');
      const input = parseReport(await form('branch', 'hours'));
      const results = await Promise.allSettled([
        repository.submit(input, actor.id),
        repository.submit(input, actor.id),
      ]);
      assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
      assert.equal(
        results.filter(
          (result) => result.status === 'rejected' && result.reason.code === 'duplicate',
        ).length,
        1,
      );
    });
    await t.test(
      'unknown-price reports retain unknown prices without invented revisions',
      async () => {
        await db
          .prepare(
            'UPDATE branch_services SET current_price_id = NULL, revision = revision + 1 WHERE id = ?',
          )
          .bind(listing)
          .run();
        const actor = await account('report-unknown');
        const before = await db.prepare('SELECT COUNT(*) AS count FROM prices').first('count');
        assert.equal((await submitReport(request(actor.token, await form()), db, {})).ok, true);
        assert.equal((await new CatalogRepository(db).getBranchService(listing))?.price, null);
        assert.equal(
          await db.prepare('SELECT COUNT(*) AS count FROM prices').first('count'),
          before,
        );
      },
    );
    await t.test('a failed price-dispute write rolls back the report and its audit', async () => {
      // Use a separate branch because each branch-service pair is unique.
      await db
        .prepare(
          "INSERT INTO branches(id,provider_id,name,address,search_key) VALUES ('rollback-branch', ?, 'Rollback', 'Fixture address', 'rollback')",
        )
        .bind(provider)
        .run();
      await db
        .prepare(
          "INSERT INTO branch_services(id,branch_id,service_id,provider_service_name) VALUES ('rollback-price-listing','rollback-branch','complete-blood-count','Rollback fixture')",
        )
        .run();
      await db
        .prepare(
          "INSERT INTO prices(id,listing_id,amount_minor,status,created_at) VALUES ('rollback-price','rollback-price-listing',50000,'unverified','2026-10-28T00:00:00Z')",
        )
        .run();
      await db
        .prepare(
          "UPDATE branch_services SET current_price_id = 'rollback-price' WHERE id = 'rollback-price-listing'",
        )
        .run();
      await db
        .prepare(
          "CREATE TRIGGER fixture_dispute_failure BEFORE INSERT ON prices WHEN NEW.status = 'disputed' BEGIN SELECT RAISE(ABORT, 'fixture failure'); END;",
        )
        .run();
      const actor = await account('report-rollback');
      const target = await readReportTarget(db, {
        target: 'listing',
        id: 'rollback-price-listing',
      });
      assert.ok(target);
      const before = await count();
      const result = await submitReport(
        request(actor.token, {
          ...(await form()),
          id: target.id,
          observedRevision: String(target.revision),
          observedPriceId: 'rollback-price',
        }),
        db,
        {},
      );
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.status, 503);
      assert.equal(await count(), before);
      assert.equal(
        await db
          .prepare(
            "SELECT COUNT(*) AS count FROM listing_changes WHERE listing_id = 'rollback-price-listing'",
          )
          .first('count'),
        0,
      );
      assert.equal(
        await db
          .prepare(
            "SELECT current_price_id FROM branch_services WHERE id = 'rollback-price-listing'",
          )
          .first('current_price_id'),
        'rollback-price',
      );
      await db.prepare('DROP TRIGGER fixture_dispute_failure').run();
    });
    await t.test(
      'availability, duplicate and service-mapping reports preserve the published listing',
      async () => {
        const actor = await account('report-listing-issues');
        const before = await db
          .prepare('SELECT * FROM branch_services WHERE id = ?')
          .bind(listing)
          .first();
        for (const issue of ['availability', 'duplicate_listing', 'service_mapping']) {
          assert.equal(
            (await submitReport(request(actor.token, await form('listing', issue)), db, {})).ok,
            true,
          );
        }
        assert.deepEqual(
          await db.prepare('SELECT * FROM branch_services WHERE id = ?').bind(listing).first(),
          before,
        );
        const missing = await submitReport(
          request(actor.token, { ...(await form()), id: 'missing-listing' }),
          db,
          {},
        );
        assert.equal(missing.ok, false);
        if (!missing.ok) assert.equal(missing.status, 404);
      },
    );
    await t.test('original report content and history cannot be rewritten or deleted', async () => {
      await assert.rejects(
        db
          .prepare(
            "UPDATE correction_reports SET details = 'Different report text with enough characters' WHERE id = ?",
          )
          .bind(receiptId)
          .run(),
        /Retain original/,
      );
      await assert.rejects(
        db.prepare('DELETE FROM correction_reports WHERE id = ?').bind(receiptId).run(),
        /Retain correction/,
      );
      assert.equal((await repository.ownReceipt(receiptId, member.id))?.details, details);
    });
  } finally {
    await mf.dispose();
  }
});
