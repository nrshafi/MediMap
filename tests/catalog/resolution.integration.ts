import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { AuthStore } from '../../src/features/authentication/server/store.server';
import { tokenHash } from '../../src/features/authentication/server/crypto.server';
import { CorrectionRepository } from '../../src/features/corrections/repository.server';
import { readReportTarget } from '../../src/features/corrections/targets.server';
import { parseReport } from '../../src/features/corrections/contracts';
import {
  readReview,
  writeResolution,
} from '../../src/features/corrections/review-operations.server';
import { CatalogRepository } from '../../src/features/catalog/server/repository.server';
import { ResolutionRepository } from '../../src/features/corrections/resolution.server';
import { parseResolution } from '../../src/features/corrections/review-contracts';

const origin = 'http://localhost:3000';
const provider = 'addin-medical-college-hospital';
const tariff = 'addin-hematology-20261027';
const contact = 'addin-contact-20261027';
const reason = 'Reviewed the official provider source and confirmed the current details.';
function request(token?: string, form: Record<string, string> = {}, requestOrigin = origin) {
  return new Request(`${origin}/admin/reports/resolve`, {
    method: 'POST',
    headers: {
      origin: requestOrigin,
      ...(token ? { cookie: `medimap_session=${token}; role=administrator` } : {}),
    },
    body: new URLSearchParams(form),
  });
}
test('administrator resolution against actual local D1', async (t) => {
  const mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test");}}',
    compatibilityDate: '2026-07-30',
    d1Databases: { DB: 'resolution-integration' },
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
    for (const name of (await readdir('migrations'))
      .filter((name) => name.endsWith('.sql') && name < '0008')
      .sort())
      await apply(name);
    const seed = (await readFile('seeds/catalog.sql', 'utf8'))
      .replace(/^--.*$/gm, '')
      .split(';')
      .map((sql) => sql.trim())
      .filter(Boolean);
    await db.batch(seed.map((sql) => db.prepare(sql)));
    const store = new AuthStore(db);
    const account = async (subject: string = crypto.randomUUID()) => {
      const identity = { subject, email: `${subject}@example.test` };
      const login = await store.signIn(identity, null);
      const session = await store.session(login.token);
      if (session.status !== 'authenticated') throw new Error('Fixture account missing');
      return { token: login.token, id: session.user.id, identity };
    };
    const initialAdmin = await account('resolution-admin');
    await db
      .prepare('INSERT INTO administrator_grants(account_id,granted_at,granted_by) VALUES (?,?,?)')
      .bind(initialAdmin.id, Date.now(), 'integration-test')
      .run();
    const admin = await store.signIn(initialAdmin.identity, null);
    const member = await account('resolution-member');
    const expired = await account('resolution-expired');
    await db
      .prepare('UPDATE auth_sessions SET created_at = ?, expires_at = ? WHERE token_hash = ?')
      .bind(Date.now() - 10000, Date.now() - 1000, await tokenHash(expired.token))
      .run();
    const corrections = new CorrectionRepository(db);
    const published = new CatalogRepository(db);
    const fixture = async (amount: number | null = 40000) => {
      const suffix = crypto.randomUUID();
      const branch = `branch-${suffix}`;
      const listing = `listing-${suffix}`;
      await db
        .prepare(
          'INSERT INTO branches(id,provider_id,name,address,search_key,contact_source_id) VALUES (?,?,?,?,?,?)',
        )
        .bind(branch, provider, `Fixture ${suffix}`, 'Synthetic fixture address', suffix, contact)
        .run();
      await db
        .prepare(
          'INSERT INTO branch_services(id,branch_id,service_id,provider_service_name) VALUES (?,?,?,?)',
        )
        .bind(listing, branch, 'complete-blood-count', 'Resolution CBC')
        .run();
      if (amount !== null) {
        await db
          .prepare(
            "INSERT INTO prices(id,listing_id,amount_minor,status,source_id,source_row,verified_at,verification_method,created_at) VALUES (?,?,?,'verified',?,1,'2026-10-27T11:20:41Z','official_website_review','2026-10-27T11:20:41Z')",
          )
          .bind(`price-${suffix}`, listing, amount, tariff)
          .run();
        await db
          .prepare('UPDATE branch_services SET current_price_id = ? WHERE id = ?')
          .bind(`price-${suffix}`, listing)
          .run();
      }
      return { branch, listing };
    };
    const report = async (
      id: string,
      kind: 'listing' | 'branch' | 'provider' = 'listing',
      issue = 'price',
    ) => {
      const actor = await account();
      const target = await readReportTarget(db, { target: kind, id });
      assert.ok(target);
      return corrections.submit(
        parseReport({
          target: kind,
          id,
          issue,
          observedRevision: String(target.revision),
          observedPriceId: target.price?.id ?? '',
          details: 'The published details differ from the official source.',
          confirmReport: 'yes',
        }),
        actor.id,
      );
    };
    const upgradeFixture = await fixture();
    const originalReport = await report(upgradeFixture.listing);
    await apply('0008_report_resolution.sql');
    const selection = async (id: string) => {
      const result = await readReview(request(admin.token), db, { report: id, status: 'all' });
      if (!result.ok || !result.data.selected) throw new Error('Missing selected report');
      return result.data.selected;
    };
    const form = async (id: string, changes: Record<string, string> = {}) => {
      const selected = await selection(id);
      const price = selected.current.price;
      return {
        reportId: id,
        outcome: 'rejected',
        reason,
        sourceId: selected.report.issue === 'price' ? tariff : contact,
        sourceRow: selected.report.issue === 'price' ? '1' : '',
        reviewedRevision: String(selected.current.revision),
        reviewedPriceId: price?.id ?? '',
        priceAction:
          selected.report.issue === 'price' ? (price ? 'review_price' : 'unknown') : 'none',
        amount: price ? String(price.amountMinor / 100) : '',
        effectiveDate: price?.effectiveDate ?? '',
        confirmReview: 'yes',
        standardPrice: 'yes',
        ...changes,
      };
    };
    const write = (raw: Record<string, string>) =>
      writeResolution(request(admin.token, raw), db, {});

    await t.test(
      'upgrade retains pending reports, disputed prices and original snapshots',
      async () => {
        const selected = await selection(originalReport.id);
        assert.equal(selected.report.status, 'pending');
        assert.equal(selected.current.price?.status, 'disputed');
        assert.equal(selected.report.target.price?.status, 'verified');
        assert.equal(selected.resolution, null);
      },
    );
    await t.test(
      'queue and resolution reject anonymous, member, expired and forged sessions',
      async () => {
        const raw = await form(originalReport.id);
        for (const token of [undefined, member.token, expired.token, 'x'.repeat(43)]) {
          assert.equal((await readReview(request(token), db, {})).ok, false);
          const result = await writeResolution(request(token, raw), db, {});
          assert.equal(result.ok, false);
          if (!result.ok) assert.equal(result.status, token === member.token ? 403 : 401);
        }
        assert.equal((await selection(originalReport.id)).report.status, 'pending');
      },
    );
    await t.test(
      'same-origin bounded forms, confirmation, reason and known-price evidence are mandatory',
      async () => {
        const raw = await form(originalReport.id);
        for (const req of [
          request(admin.token, raw, 'https://attacker.test'),
          request(admin.token, { ...raw, confirmReview: '' }),
          request(admin.token, { ...raw, reason: 'short' }),
          request(admin.token, { ...raw, reason: 'x'.repeat(66000) }),
        ]) {
          const result = await writeResolution(req, db, {});
          assert.equal(result.ok, false);
          if (!result.ok) assert.equal(result.status, 400);
        }
        for (const changes of [
          { sourceId: contact },
          { sourceRow: '' },
          { standardPrice: '' },
          { amount: '1.999' },
        ])
          assert.equal((await write({ ...raw, ...changes })).ok, false);
        assert.equal((await selection(originalReport.id)).report.status, 'pending');
      },
    );
    await t.test(
      'rejected known-price report requires fresh review and restores the same amount',
      async () => {
        const before = await selection(originalReport.id);
        const result = await write(await form(originalReport.id));
        assert.equal(result.ok, true);
        const after = await selection(originalReport.id);
        assert.equal(after.report.status, 'rejected');
        assert.equal(after.current.price?.status, 'verified');
        assert.equal(after.current.price?.amountMinor, 40000);
        assert.notEqual(after.current.price?.id, before.current.price?.id);
        assert.ok(
          after.current.price?.verifiedAt &&
            after.current.price.verifiedAt > '2026-10-27T11:20:41Z',
        );
        assert.equal(after.resolution?.actorId, initialAdmin.id);
        assert.equal(after.resolution?.reason, reason);
        assert.equal(after.resolution?.sourceId, tariff);
        assert.equal(after.report.target.price?.verifiedAt, '2026-10-27T11:20:41Z');
      },
    );
    await t.test(
      'accepted corrected price stays disputed until the final competing report resolves',
      async () => {
        const target = await fixture();
        const first = await report(target.listing);
        const second = await report(target.listing);
        assert.equal(
          (await write(await form(first.id, { outcome: 'accepted', amount: '450.05' }))).ok,
          true,
        );
        const interim = await selection(second.id);
        assert.equal(interim.pendingPriceReports, 1);
        assert.equal(interim.current.price?.status, 'disputed');
        assert.equal(interim.current.price?.amountMinor, 45005);
        const stale = await form(second.id);
        assert.equal((await write(stale)).ok, true);
        const final = await selection(second.id);
        assert.equal(final.pendingPriceReports, 0);
        assert.equal(final.current.price?.status, 'verified');
        assert.equal(final.current.price?.amountMinor, 45005);
        const firstHistory = await selection(first.id);
        assert.equal(firstHistory.resolution?.outcome, 'accepted');
        assert.equal(firstHistory.report.target.price?.amountMinor, 40000);
        const repeated = await write(stale);
        assert.equal(repeated.ok, false);
        if (!repeated.ok) assert.equal(repeated.status, 409);
      },
    );
    await t.test(
      'rejection cannot change amounts, effective dates or clear known prices',
      async () => {
        const target = await fixture();
        const item = await report(target.listing);
        const rejectedChanges: Record<string, string>[] = [
          { amount: '1.00' },
          { effectiveDate: '2026-10-01' },
          { priceAction: 'unknown' },
        ];
        for (const changes of rejectedChanges) {
          const result = await write(await form(item.id, changes));
          assert.equal(result.ok, false);
        }
        assert.equal((await selection(item.id)).report.status, 'pending');
        assert.equal((await published.getBranchService(target.listing))?.price?.amountMinor, 40000);
      },
    );
    await t.test(
      'unknown-price resolution never fabricates an amount and acceptance can publish a reviewed amount',
      async () => {
        const target = await fixture(null);
        const item = await report(target.listing);
        assert.equal(
          (await write(await form(item.id, { priceAction: 'review_price', amount: '400' }))).ok,
          false,
        );
        assert.equal((await write(await form(item.id))).ok, true);
        assert.equal((await published.getBranchService(target.listing))?.price, null);
        const next = await report(target.listing);
        assert.equal(
          (
            await write(
              await form(next.id, {
                outcome: 'accepted',
                priceAction: 'review_price',
                amount: '420',
              }),
            )
          ).ok,
          true,
        );
        assert.equal((await published.getBranchService(target.listing))?.price?.status, 'verified');
        const removal = await report(target.listing);
        assert.equal(
          (
            await write(
              await form(removal.id, {
                outcome: 'accepted',
                priceAction: 'unknown',
                sourceId: contact,
              }),
            )
          ).ok,
          true,
        );
        assert.equal((await published.getBranchService(target.listing))?.price, null);
      },
    );
    await t.test(
      'stale and competing decisions leave one retained resolution without orphan revisions',
      async () => {
        const target = await fixture();
        const item = await report(target.listing);
        const raw = await form(item.id);
        const invalid = await write({ ...raw, reviewedRevision: '999' });
        assert.equal(invalid.ok, false);
        if (!invalid.ok) {
          assert.equal(invalid.status, 409);
          assert.equal(invalid.draft.reason, reason);
        }
        const results = await Promise.all([
          write(raw),
          write({ ...raw, outcome: 'accepted', amount: '410' }),
        ]);
        assert.equal(results.filter((r) => r.ok).length, 1);
        assert.equal(
          await db
            .prepare('SELECT COUNT(*) AS count FROM report_resolutions WHERE report_id = ?')
            .bind(item.id)
            .first('count'),
          1,
        );
      },
    );
    await t.test(
      'non-price acceptance requires a correction and preserves its reviewed target snapshot',
      async () => {
        const target = await fixture();
        const item = await report(target.branch, 'branch', 'phone');
        const unchanged = await write(await form(item.id, { outcome: 'accepted' }));
        assert.equal(unchanged.ok, false);
        if (!unchanged.ok) assert.equal(unchanged.code, 'correction_required');
        await db
          .prepare("UPDATE branches SET phone = '0255555000', revision = revision + 1 WHERE id = ?")
          .bind(target.branch)
          .run();
        const before = await db
          .prepare('SELECT * FROM branches WHERE id = ?')
          .bind(target.branch)
          .first();
        assert.equal((await write(await form(item.id, { outcome: 'accepted' }))).ok, true);
        assert.deepEqual(
          await db.prepare('SELECT * FROM branches WHERE id = ?').bind(target.branch).first(),
          before,
        );
        assert.equal((await selection(item.id)).resolution?.reviewedTarget.phone, '0255555000');
        assert.equal((await selection(item.id)).report.target.phone, null);
      },
    );
    await t.test(
      'non-price rejection does not change core data and inactive targets remain reviewable',
      async () => {
        const target = await fixture();
        const item = await report(target.branch, 'branch', 'address');
        await db
          .prepare('UPDATE branches SET active = 0,revision = revision + 1 WHERE id = ?')
          .bind(target.branch)
          .run();
        const selected = await selection(item.id);
        assert.equal(selected.active, false);
        assert.equal(await readReportTarget(db, { target: 'branch', id: target.branch }), null);
        assert.equal((await write(await form(item.id))).ok, true);
        assert.equal((await selection(item.id)).current.address, 'Synthetic fixture address');
      },
    );
    await t.test(
      'queue filters, compound cursors and off-page selected sources preserve access to history',
      async () => {
        const first = await readReview(request(admin.token), db, { status: 'all', limit: 2 });
        assert.equal(first.ok, true);
        if (!first.ok) throw new Error();
        assert.equal(first.data.queue.items.length, 2);
        assert.ok(first.data.queue.nextCursor);
        const second = await readReview(request(admin.token), db, {
          status: 'all',
          limit: 2,
          after: first.data.queue.nextCursor,
        });
        if (!second.ok) throw new Error();
        assert.ok(
          second.data.queue.items.every(
            (row) => !first.data.queue.items.some((a) => a.id === row.id),
          ),
        );
        const selected = await readReview(request(admin.token), db, {
          report: originalReport.id,
          status: 'rejected',
          limit: 1,
          sourceAfter: 'zzzz',
          source: tariff,
        });
        if (!selected.ok) throw new Error();
        assert.equal(selected.data.sources.items.length, 0);
        assert.equal(selected.data.selectedSource?.id, tariff);
        assert.equal(selected.data.selected?.report.id, originalReport.id);
        assert.equal(
          (await readReview(request(admin.token), db, { status: 'all', after: 'invalid' })).ok,
          false,
        );
      },
    );
    await t.test(
      'a failed price write rolls back resolution, report status, listing audit and pointer',
      async () => {
        const target = await fixture();
        const item = await report(target.listing);
        const before = await selection(item.id);
        await db
          .prepare(
            "CREATE TRIGGER fixture_resolution_failure BEFORE INSERT ON prices WHEN NEW.notes = 'Administrator report resolution' BEGIN SELECT RAISE(ABORT,'fixture rollback'); END;",
          )
          .run();
        const result = await write(await form(item.id, { outcome: 'accepted', amount: '500' }));
        assert.equal(result.ok, false);
        if (!result.ok) assert.equal(result.status, 503);
        const after = await selection(item.id);
        assert.equal(after.report.status, 'pending');
        assert.equal(after.resolution, null);
        assert.equal(after.current.price?.id, before.current.price?.id);
        assert.equal(after.current.revision, before.current.revision);
        assert.equal(
          await db
            .prepare('SELECT COUNT(*) AS count FROM listing_changes WHERE listing_id = ?')
            .bind(target.listing)
            .first('count'),
          1,
        );
        await db.prepare('DROP TRIGGER fixture_resolution_failure').run();
      },
    );
    await t.test(
      'resolution history is immutable and report statuses cannot be changed without it',
      async () => {
        await assert.rejects(
          db
            .prepare(
              "UPDATE report_resolutions SET reason = 'New reason that replaces the old decision' WHERE report_id = ?",
            )
            .bind(originalReport.id)
            .run(),
          /immutable/,
        );
        await assert.rejects(
          db
            .prepare('DELETE FROM report_resolutions WHERE report_id = ?')
            .bind(originalReport.id)
            .run(),
          /Retain report/,
        );
        await assert.rejects(
          db
            .prepare("UPDATE correction_reports SET status = 'pending' WHERE id = ?")
            .bind(originalReport.id)
            .run(),
          /authorized resolution/,
        );
        const target = await fixture();
        const item = await report(target.listing);
        await assert.rejects(
          db
            .prepare("UPDATE correction_reports SET status = 'rejected' WHERE id = ?")
            .bind(item.id)
            .run(),
          /authorized resolution/,
        );
      },
    );
    await t.test(
      'revoked administrator grants fail both HTTP checks and database resolution guards',
      async () => {
        const target = await fixture();
        const item = await report(target.listing);
        const raw = await form(item.id);
        await db
          .prepare('DELETE FROM administrator_grants WHERE account_id = ?')
          .bind(initialAdmin.id)
          .run();
        assert.equal((await readReview(request(admin.token), db, {})).ok, false);
        assert.equal((await write(raw)).ok, false);
        await assert.rejects(
          new ResolutionRepository(db).resolve(parseResolution(raw), initialAdmin.id),
          /Administrator access/,
        );
      },
    );
  } finally {
    await mf.dispose();
  }
});
