import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { ReviewRepository } from '../../src/features/reviews/repository.server';
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
  } finally {
    await mf.dispose();
  }
});
