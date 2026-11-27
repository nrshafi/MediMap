import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { AuthStore } from '../../src/features/authentication/server/store.server';

const target = '0012_password_accounts.sql';

async function statementsOf(names: string[]): Promise<string[]> {
  const text = (
    await Promise.all(names.map((name) => readFile(`migrations/${name}`, 'utf8')))
  ).join('\n');
  const statements = text.match(/\s*CREATE TRIGGER[\s\S]*?END;|[^;]+;/g);
  assert.ok(statements);
  return statements;
}

async function database(mf: Miniflare) {
  const db = await mf.getD1Database('DB');
  const names = (await readdir('migrations')).filter((name) => name.endsWith('.sql')).sort();
  assert.equal(names.at(-1), target);
  const before = await statementsOf(names.slice(0, -1));
  await db.batch(before.map((sql) => db.prepare(sql)));
  const apply = async () => {
    const after = await statementsOf([target]);
    await db.batch(after.map((sql) => db.prepare(sql)));
  };
  return { db, apply };
}

function miniflare() {
  return new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test");}}',
    compatibilityDate: '2026-07-30',
    d1Databases: { DB: 'password-accounts' },
  });
}

test('migration 0012 keeps existing accounts, sessions and grants', async () => {
  const mf = miniflare();
  try {
    const { db, apply } = await database(mf);
    await db.batch([
      db.prepare(
        "INSERT INTO accounts(id,google_subject,email,created_at,last_signed_in_at) VALUES ('a1','g1',' Member@Example.Test ',1,2),('a2','g2','admin@example.test',3,4)",
      ),
      db.prepare("UPDATE accounts SET active = 0 WHERE id = 'a2'"),
      db
        .prepare(
          "INSERT INTO auth_sessions(token_hash,account_id,created_at,expires_at) VALUES (?,'a1',1,99)",
        )
        .bind('f'.repeat(64)),
      db.prepare(
        "INSERT INTO administrator_grants(account_id,granted_at,granted_by) VALUES ('a2',1,'owner')",
      ),
    ]);
    await apply();
    const rows = (
      await db
        .prepare(
          'SELECT id,google_subject,email,email_normalized,active,created_at,last_signed_in_at FROM accounts ORDER BY id',
        )
        .all()
    ).results;
    assert.deepEqual(rows, [
      {
        id: 'a1',
        google_subject: 'g1',
        email: ' Member@Example.Test ',
        email_normalized: 'member@example.test',
        active: 1,
        created_at: 1,
        last_signed_in_at: 2,
      },
      {
        id: 'a2',
        google_subject: 'g2',
        email: 'admin@example.test',
        email_normalized: 'admin@example.test',
        active: 0,
        created_at: 3,
        last_signed_in_at: 4,
      },
    ]);
    assert.equal(
      (await db.prepare('SELECT COUNT(*) AS c FROM auth_sessions').first<{ c: number }>())?.c,
      1,
    );
    assert.equal(
      (await db.prepare('SELECT COUNT(*) AS c FROM administrator_grants').first<{ c: number }>())
        ?.c,
      1,
    );
    assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results, []);
    const references = await db
      .prepare(
        "SELECT name FROM sqlite_schema WHERE type='table' AND sql LIKE '%REFERENCES accounts(id)%' ORDER BY name",
      )
      .all<{ name: string }>();
    assert.ok(references.results.length >= 8);
    assert.ok(references.results.some((row) => row.name === 'auth_sessions'));
    const triggers = await db
      .prepare(
        "SELECT COUNT(*) AS c FROM sqlite_schema WHERE type='trigger' AND sql LIKE '%accounts%'",
      )
      .first<{ c: number }>();
    assert.ok((triggers?.c ?? 0) >= 4);
    assert.equal(
      await db
        .prepare(
          "SELECT COUNT(*) AS c FROM sqlite_schema WHERE name LIKE '%rebuilt%' OR name LIKE 'account_email_guard%'",
        )
        .first('c'),
      0,
    );
    // The rebuilt table still enforces the foreign key on child rows.
    await assert.rejects(
      db
        .prepare(
          "INSERT INTO auth_sessions(token_hash,account_id,created_at,expires_at) VALUES (?, 'missing',1,99)",
        )
        .bind('e'.repeat(64))
        .run(),
    );
  } finally {
    await mf.dispose();
  }
});

test('migration 0012 stops on a duplicate normalized email and changes nothing', async () => {
  const mf = miniflare();
  try {
    const { db, apply } = await database(mf);
    await db.batch([
      db.prepare(
        "INSERT INTO accounts(id,google_subject,email,created_at,last_signed_in_at) VALUES ('a1','g1','Same@Example.test',1,1),('a2','g2',' same@example.test',1,1)",
      ),
    ]);
    await assert.rejects(apply(), /Migration 0012 stopped\. Two accounts have the same email/);
    assert.equal(
      (await db.prepare('SELECT COUNT(*) AS c FROM accounts').first<{ c: number }>())?.c,
      2,
    );
    const columns = await db
      .prepare("SELECT name FROM pragma_table_info('accounts')")
      .all<{ name: string }>();
    assert.ok(!columns.results.some((column) => column.name === 'email_normalized'));
    assert.equal(
      await db
        .prepare("SELECT COUNT(*) AS c FROM sqlite_schema WHERE name = 'password_credentials'")
        .first('c'),
      0,
    );
  } finally {
    await mf.dispose();
  }
});

test('email is unique across Google and password accounts', async () => {
  const mf = miniflare();
  try {
    const { db, apply } = await database(mf);
    await apply();
    const now = 1_000;
    const store = new AuthStore(db, () => now);
    await db.batch([
      db.prepare(
        "INSERT INTO accounts(id,google_subject,email,email_normalized,created_at,last_signed_in_at) VALUES ('p1',NULL,'Person@Example.test','person@example.test',1,1)",
      ),
      db.prepare(
        "INSERT INTO password_credentials(account_id,password_hash,updated_at) VALUES ('p1','pbkdf2-sha256$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',1)",
      ),
    ]);
    // A second password account with the same email stops at the unique index.
    await assert.rejects(
      db
        .prepare(
          "INSERT INTO accounts(id,google_subject,email,email_normalized,created_at,last_signed_in_at) VALUES ('p2',NULL,'person@example.test','person@example.test',1,1)",
        )
        .run(),
      /email_normalized/,
    );
    // Google sign-in for a new subject with the same email is refused, and nothing is written.
    await assert.rejects(
      store.signIn({ subject: 'new-google-subject', email: 'PERSON@example.test' }, null),
      { code: 'email_in_use' },
    );
    assert.equal(
      (await db.prepare('SELECT COUNT(*) AS c FROM accounts').first<{ c: number }>())?.c,
      1,
    );
    assert.equal(
      (await db.prepare('SELECT COUNT(*) AS c FROM auth_sessions').first<{ c: number }>())?.c,
      0,
    );
    // Google sign-in still works for a new email, and again for the same subject.
    const first = await store.signIn({ subject: 'g-ok', email: 'Google.User@example.test' }, null);
    assert.ok(first.token);
    assert.equal(
      await db
        .prepare("SELECT email_normalized FROM accounts WHERE google_subject='g-ok'")
        .first('email_normalized'),
      'google.user@example.test',
    );
    await store.signIn({ subject: 'g-ok', email: 'google.user@example.test' }, first.token);
    // A Google account cannot take the email of a password account when its own email changes.
    await assert.rejects(store.signIn({ subject: 'g-ok', email: 'person@example.test' }, null), {
      code: 'email_in_use',
    });
    // A password credential needs an existing account and a versioned hash.
    await assert.rejects(
      db
        .prepare(
          "INSERT INTO password_credentials(account_id,password_hash,updated_at) VALUES ('missing','pbkdf2-sha256$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',1)",
        )
        .run(),
    );
    await assert.rejects(
      db
        .prepare(
          "INSERT INTO password_credentials(account_id,password_hash,updated_at) VALUES ('p1','plain-text-password-value',1)",
        )
        .run(),
    );
  } finally {
    await mf.dispose();
  }
});
