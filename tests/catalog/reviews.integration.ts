import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { ReviewRepository } from '../../src/features/reviews/repository.server';
import { reportReview, moderateReview } from '../../src/features/reviews/moderation.server';
import { reserveMappingRequest } from '../../src/features/public/provider.server';
test('service reviews retain ownership, history and public visibility in D1', async () => {
  const mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test")}}',
    compatibilityDate: '2026-07-30',
    d1Databases: { DB: 'reviews-integration' },
  });
  try {
    const db = await mf.getD1Database('DB');
    for (const name of (await readdir('migrations')).filter((n) => n.endsWith('.sql')).sort()) {
      const statements = (await readFile(`migrations/${name}`, 'utf8')).match(
        /\s*CREATE TRIGGER[\s\S]*?END;|[^;]+;/g,
      );
      assert.ok(statements);
      await db.batch(statements.map((sql) => db.prepare(sql)));
    }
    const seed = (await readFile('seeds/catalog.sql', 'utf8'))
      .replace(/^--.*$/gm, '')
      .split(';')
      .filter((s) => s.trim());
    await db.batch(seed.map((sql) => db.prepare(sql)));
    for (const id of ['reviewer-a', 'reviewer-b'])
      await db
        .prepare(
          'INSERT INTO accounts(id,google_subject,email,created_at,last_signed_in_at) VALUES(?,?,?,?,?)',
        )
        .bind(id, id, `${id}@example.test`, Date.now(), Date.now())
        .run();
    const repository = new ReviewRepository(db);
    const input = {
      listing: 'addin-moghbazar-complete-blood-count',
      body: 'Good service',
      revision: 0,
      ...Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`score${i}`, 4])),
    };
    const race = await Promise.allSettled([
      repository.save('reviewer-a', input),
      repository.save('reviewer-a', input),
    ]);
    assert.equal(
      race.filter((r) => r.status === 'fulfilled').length,
      1,
      JSON.stringify(race.map((r) => (r.status === 'rejected' ? String(r.reason) : 'saved'))),
    );
    assert.equal((await repository.summary(input.listing))?.mean, 4);
    await assert.rejects(
      repository.save('reviewer-b', { ...input, revision: 1, body: 'Forged edit' }),
    );
    await repository.save('reviewer-a', { ...input, revision: 1, score0: 1 });
    assert.equal((await repository.own(input.listing, 'reviewer-a'))?.revision, 2);
    await assert.rejects(repository.save('reviewer-a', { ...input, revision: 1 }));
    await assert.rejects(repository.save('reviewer-b', { ...input, score5: 6 }));
    const own = await repository.own(input.listing, 'reviewer-a');
    assert.ok(own);
    await db
      .prepare("UPDATE service_reviews SET visibility='hidden' WHERE id=?")
      .bind(own.id)
      .run();
    assert.equal((await repository.summary(input.listing))?.count, 0);
    assert.equal((await repository.list(input.listing)).length, 0);
    assert.equal(
      await db.prepare('SELECT COUNT(*) AS n FROM service_review_changes').first('n'),
      2,
    );
    await assert.rejects(db.prepare('DELETE FROM service_review_changes').run());
    await db
      .prepare("UPDATE service_reviews SET visibility='visible' WHERE id=?")
      .bind(own.id)
      .run();
    await reportReview(db, 'reviewer-b', {
      review: own.id,
      reason: 'This review includes inappropriate personal information.',
    });
    await assert.rejects(
      reportReview(db, 'reviewer-b', {
        review: own.id,
        reason: 'This review includes inappropriate personal information.',
      }),
    );
    await assert.rejects(
      moderateReview(db, 'reviewer-b', {
        review: own.id,
        revision: 2,
        action: 'hide',
        reason: 'Reviewed report and confirmed personal information.',
      }),
    );
    await db
      .prepare(
        "INSERT INTO administrator_grants(account_id,granted_at,granted_by) VALUES('reviewer-b',?,'test-owner')",
      )
      .bind(Date.now())
      .run();
    await moderateReview(db, 'reviewer-b', {
      review: own.id,
      revision: 2,
      action: 'hide',
      reason: 'Reviewed report and confirmed personal information.',
    });
    assert.equal((await repository.summary(input.listing))?.count, 0);
    assert.equal(
      await db
        .prepare("SELECT COUNT(*) AS n FROM review_abuse_reports WHERE status='pending'")
        .first('n'),
      0,
    );
    await assert.rejects(
      moderateReview(db, 'reviewer-b', {
        review: own.id,
        revision: 2,
        action: 'restore',
        reason: 'Stale form must not change the accepted decision.',
      }),
    );
    await moderateReview(db, 'reviewer-b', {
      review: own.id,
      revision: 3,
      action: 'restore',
      reason: 'Review checked again and approved for public display.',
    });
    assert.equal((await repository.summary(input.listing))?.count, 1);
    await moderateReview(db, 'reviewer-b', {
      review: own.id,
      revision: 4,
      action: 'remove',
      reason: 'Confirmed repeated abuse warrants retained removal.',
    });
    await assert.rejects(repository.save('reviewer-a', { ...input, revision: 5 }));
    assert.equal((await repository.summary(input.listing))?.count, 0);
    await assert.rejects(db.prepare('DELETE FROM review_moderation').run());
    const now = Date.now();
    assert.equal(await reserveMappingRequest(db, now), true);
    assert.equal(await reserveMappingRequest(db, now), true);
    assert.equal(await reserveMappingRequest(db, now), true);
    assert.equal(await reserveMappingRequest(db, now), true);
    assert.equal(await reserveMappingRequest(db, now), false);
    const nextSecond = now + 1000;
    assert.equal(await reserveMappingRequest(db, nextSecond), true);
    await db
      .prepare(
        'INSERT INTO accounts(id,google_subject,email,created_at,last_signed_in_at) VALUES(?,?,?,?,?)',
      )
      .bind('reviewer-c', 'reviewer-c', 'c@example.test', now, now)
      .run();
    for (let revision = 0; revision < 5; revision++)
      await repository.save('reviewer-c', { ...input, revision });
    await assert.rejects(repository.save('reviewer-c', { ...input, revision: 5 }));
    assert.equal((await repository.aggregate('branch', 'addin-moghbazar'))?.count, 1);
    assert.equal(
      (await repository.aggregate('provider', 'addin-medical-college-hospital'))?.count,
      1,
    );

    // Dimension summaries: visible-only means, zero reviews, hidden exclusion, inactive branch, multi-listing batch
    await db
      .prepare(
        "INSERT INTO services(id,category_id,name,search_key) VALUES('dim-service-2','hematology','Second Test','second test')",
      )
      .run();
    await db
      .prepare(
        "INSERT INTO branch_services(id,branch_id,service_id,provider_service_name) VALUES('dim-listing-2','addin-moghbazar','dim-service-2','Second')",
      )
      .run();
    await db
      .prepare(
        'INSERT INTO accounts(id,google_subject,email,created_at,last_signed_in_at) VALUES(?,?,?,?,?)',
      )
      .bind('reviewer-d', 'reviewer-d', 'd@example.test', now, now)
      .run();

    // Zero reviews returns no entry (no NaN)
    assert.deepEqual(await repository.dimensionSummaries(['dim-listing-2']), {});
    assert.deepEqual(await repository.dimensionSummaries([]), {});

    // reviewer-c already has scores [4,4,4,4,4,4] on input.listing; add reviewer-d with [2,4,5,3,1,5]
    await repository.save('reviewer-d', {
      listing: input.listing,
      body: 'Mixed experience',
      revision: 0,
      score0: 2,
      score1: 4,
      score2: 5,
      score3: 3,
      score4: 1,
      score5: 5,
    });
    await repository.save('reviewer-d', {
      listing: 'dim-listing-2',
      body: 'Second listing review',
      revision: 0,
      score0: 5,
      score1: 5,
      score2: 4,
      score3: 4,
      score4: 3,
      score5: 3,
    });

    const multi = await repository.dimensionSummaries([input.listing, 'dim-listing-2']);
    assert.equal(multi[input.listing]?.count, 2);
    assert.deepEqual(multi[input.listing]?.dimensions, [3, 4, 4.5, 3.5, 2.5, 4.5]);
    assert.equal(multi['dim-listing-2']?.count, 1);
    assert.deepEqual(multi['dim-listing-2']?.dimensions, [5, 5, 4, 4, 3, 3]);

    // Hide reviewer-d's review via moderation and confirm it is excluded
    const revD = await repository.own(input.listing, 'reviewer-d');
    assert.ok(revD);
    await moderateReview(db, 'reviewer-b', {
      review: revD.id,
      revision: revD.revision,
      action: 'hide',
      reason: 'Hidden for dimension average exclusion integration check.',
    });
    const afterHide = await repository.dimensionSummaries([input.listing]);
    assert.equal(afterHide[input.listing]?.count, 1);
    assert.deepEqual(afterHide[input.listing]?.dimensions, [4, 4, 4, 4, 4, 4]);

    // Inactive branch excludes all its listings from dimensionSummaries
    await db.prepare("UPDATE branches SET active=0 WHERE id='addin-moghbazar'").run();
    assert.deepEqual(await repository.dimensionSummaries([input.listing, 'dim-listing-2']), {});
    await db.prepare("UPDATE branches SET active=1 WHERE id='addin-moghbazar'").run();
  } finally {
    await mf.dispose();
  }
});
