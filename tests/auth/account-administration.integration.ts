import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { AuthStore } from '../../src/features/authentication/server/store.server';
import { requireAdministrator } from '../../src/features/authentication/server/access.server';
import { passwordSignIn } from '../../src/features/authentication/server/passwordHttp.server';
import { hashPassword } from '../../src/features/authentication/server/password.server';
import { tokenHash } from '../../src/features/authentication/server/crypto.server';
import {
  accountStatusChange,
  changeAccountStatus,
  listAccounts,
  writeAccountStatus,
} from '../../src/features/administration/server/accounts.server';
import { environment, settings } from './google.fixture';

const strong = 'correct-horse-battery-9';
const reason = 'The account sent abusive messages to other users.';

async function setup() {
  const mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test");}}',
    compatibilityDate: '2026-07-30',
    d1Databases: { DB: 'account-administration' },
  });
  const db = await mf.getD1Database('DB');
  const names = (await readdir('migrations')).filter((name) => name.endsWith('.sql')).sort();
  const text = (
    await Promise.all(names.map((name) => readFile(`migrations/${name}`, 'utf8')))
  ).join('\n');
  const statements = text.match(/\s*CREATE TRIGGER[\s\S]*?END;|[^;]+;/g);
  assert.ok(statements);
  await db.batch(statements.map((sql) => db.prepare(sql)));
  const store = new AuthStore(db);
  const administrator = await store.signIn(
    { subject: 'g-admin', email: 'admin@example.test' },
    null,
  );
  const adminSession = await store.session(administrator.token);
  assert.equal(adminSession.status, 'authenticated');
  const adminId = adminSession.status === 'authenticated' ? adminSession.user.id : '';
  await db
    .prepare(
      'INSERT INTO administrator_grants(account_id, granted_at, granted_by) VALUES (?, ?, ?)',
    )
    .bind(adminId, Date.now(), 'test')
    .run();
  // The grant trigger deletes the sessions of the account. Sign in again.
  const admin = await store.signIn({ subject: 'g-admin', email: 'admin@example.test' }, null);
  const hash = await hashPassword(strong);
  async function passwordUser(email: string) {
    const id = crypto.randomUUID();
    const now = Date.now();
    await db.batch([
      db
        .prepare(
          'INSERT INTO accounts(id, google_subject, email, email_normalized, created_at, last_signed_in_at) VALUES (?, NULL, ?, lower(?), ?, ?)',
        )
        .bind(id, email, email, now, now),
      db
        .prepare(
          'INSERT INTO password_credentials(account_id, password_hash, updated_at) VALUES (?, ?, ?)',
        )
        .bind(id, hash, now),
    ]);
    return id;
  }
  return { mf, db, store, adminId, admin, passwordUser };
}

function cookieRequest(token: string | null, extra: Record<string, string> = {}) {
  return new Request(`${settings.origin}/admin/accounts`, {
    headers: { ...(token ? { cookie: `medimap_session=${token}` } : {}), ...extra },
  });
}

function post(fields: Record<string, string>, token: string | null, origin = settings.origin) {
  return new Request(`${settings.origin}/admin/accounts/write`, {
    method: 'POST',
    headers: {
      origin,
      'content-type': 'application/x-www-form-urlencoded',
      ...(token ? { cookie: `medimap_session=${token}` } : {}),
    },
    body: new URLSearchParams(fields),
  });
}

async function activeOf(db: D1Database, id: string) {
  return (
    await db.prepare('SELECT active FROM accounts WHERE id = ?').bind(id).first<{
      active: number;
    }>()
  )?.active;
}

async function sessionCount(db: D1Database, id: string) {
  return (
    await db
      .prepare('SELECT COUNT(*) AS c FROM auth_sessions WHERE account_id = ?')
      .bind(id)
      .first<{ c: number }>()
  )?.c;
}

test('guests, ordinary users, expired sessions and forged roles are refused', async () => {
  const { mf, db, store, adminId, passwordUser } = await setup();
  try {
    const memberId = await passwordUser('member@example.test');
    const member = await store.startPasswordSession(memberId, null);
    const targetId = await passwordUser('target@example.test');
    // Expired session of an administrator.
    const expiring = await store.signIn({ subject: 'g-admin', email: 'admin@example.test' }, null);
    await db
      .prepare('UPDATE auth_sessions SET created_at = ?, expires_at = ? WHERE token_hash = ?')
      .bind(Date.now() - 10_000, Date.now() - 1000, await tokenHash(expiring.token))
      .run();
    const forged = [
      cookieRequest(member.token, { 'x-administrator': 'true', 'x-role': 'admin' }),
      new Request(`${settings.origin}/admin/accounts?role=admin&administrator=1`, {
        headers: { cookie: `medimap_session=${member.token}; role=admin; administrator=true` },
      }),
    ];
    await assert.rejects(requireAdministrator(cookieRequest(null), db), {
      code: 'unauthenticated',
    });
    await assert.rejects(requireAdministrator(cookieRequest('x'.repeat(43)), db), {
      code: 'unauthenticated',
    });
    await assert.rejects(requireAdministrator(cookieRequest(expiring.token), db), {
      code: 'expired',
    });
    for (const request of forged)
      await assert.rejects(requireAdministrator(request, db), { code: 'forbidden' });
    const fields = { account: targetId, action: 'disable', reason, confirm: 'yes' };
    for (const token of [null, 'x'.repeat(43), expiring.token, member.token]) {
      const response = await writeAccountStatus(post(fields, token), environment, db);
      assert.equal(response.status, 400);
    }
    // A forged role field in the form does not grant access.
    const withRole = await writeAccountStatus(
      post({ ...fields, role: 'administrator', administrator: '1', actor: adminId }, member.token),
      environment,
      db,
    );
    assert.equal(withRole.status, 400);
    assert.equal(await activeOf(db, targetId), 1);
    assert.equal(
      (await db.prepare('SELECT COUNT(*) AS c FROM account_status_changes').first<{ c: number }>())
        ?.c,
      0,
    );
  } finally {
    await mf.dispose();
  }
});

test('a cross-origin or malformed post changes nothing', async () => {
  const { mf, db, admin, passwordUser } = await setup();
  try {
    const targetId = await passwordUser('target@example.test');
    const fields = { account: targetId, action: 'disable', reason, confirm: 'yes' };
    const crossOrigin = await writeAccountStatus(
      post(fields, admin.token, 'https://attacker.invalid'),
      environment,
      db,
    );
    assert.equal(crossOrigin.status, 400);
    const noOrigin = new Request(`${settings.origin}/admin/accounts/write`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        cookie: `medimap_session=${admin.token}`,
      },
      body: new URLSearchParams(fields),
    });
    assert.equal((await writeAccountStatus(noOrigin, environment, db)).status, 400);
    for (const bad of [
      { ...fields, confirm: '' },
      { ...fields, reason: 'too short' },
      { ...fields, action: 'delete' },
      { ...fields, account: "x' OR '1'='1" },
    ])
      assert.equal((await writeAccountStatus(post(bad, admin.token), environment, db)).status, 400);
    assert.equal(await activeOf(db, targetId), 1);
    assert.throws(() => accountStatusChange({ ...fields, confirm: 'no' }));
  } finally {
    await mf.dispose();
  }
});

test('disabling deletes every session, records the change and blocks both sign-in methods', async () => {
  const { mf, db, store, admin, adminId, passwordUser } = await setup();
  try {
    const targetId = await passwordUser('Target@Example.test');
    const first = await store.startPasswordSession(targetId, null);
    const second = await store.startPasswordSession(targetId, null);
    const bystanderId = await passwordUser('bystander@example.test');
    const bystander = await store.startPasswordSession(bystanderId, null);
    assert.equal(await sessionCount(db, targetId), 2);
    const googleTarget = await store.signIn({ subject: 'g-target', email: 'g@example.test' }, null);
    const googleId = (await store.session(googleTarget.token)) as { user: { id: string } };
    const before = Date.now();
    const response = await writeAccountStatus(
      post(
        { account: targetId, action: 'disable', reason: `  ${reason} `, confirm: 'yes' },
        admin.token,
      ),
      environment,
      db,
    );
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('Location'), '/admin/accounts?result=disabled');
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(await activeOf(db, targetId), 0);
    assert.equal(await sessionCount(db, targetId), 0);
    assert.equal((await store.session(first.token)).status, 'anonymous');
    assert.equal((await store.session(second.token)).status, 'anonymous');
    assert.equal((await store.session(bystander.token)).status, 'authenticated');
    assert.equal(await sessionCount(db, bystanderId), 1);
    const history = await db
      .prepare(
        'SELECT account_id, actor_id, action, reason, created_at FROM account_status_changes',
      )
      .all<{
        account_id: string;
        actor_id: string;
        action: string;
        reason: string;
        created_at: number;
      }>();
    assert.equal(history.results.length, 1);
    const row = history.results[0];
    assert.equal(row.account_id, targetId);
    assert.equal(row.actor_id, adminId);
    assert.equal(row.action, 'disable');
    assert.equal(row.reason, reason);
    assert.ok(row.created_at >= before && row.created_at <= Date.now());
    // Password sign-in is refused after the right password, and starts no session.
    const attempt = await passwordSignIn(
      new Request(`${settings.origin}/auth/password/sign-in`, {
        method: 'POST',
        headers: {
          origin: settings.origin,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ email: 'target@example.test', password: strong }),
      }),
      environment,
      db,
    );
    assert.equal(attempt.headers.get('Location'), '/sign-in?error=forbidden');
    assert.equal(attempt.headers.getSetCookie().length, 0);
    assert.equal(await sessionCount(db, targetId), 0);
    // Google sign-in is refused too.
    await changeAccountStatus(db, adminId, {
      account: googleId.user.id,
      action: 'disable',
      reason,
    });
    assert.equal(await sessionCount(db, googleId.user.id), 0);
    const lastBefore = await db
      .prepare('SELECT email, last_signed_in_at FROM accounts WHERE id = ?')
      .bind(googleId.user.id)
      .first();
    await assert.rejects(
      store.signIn({ subject: 'g-target', email: 'changed@example.test' }, null),
      { code: 'forbidden' },
    );
    // A refused Google sign-in leaves the disabled account unchanged.
    assert.deepEqual(
      await db
        .prepare('SELECT email, last_signed_in_at FROM accounts WHERE id = ?')
        .bind(googleId.user.id)
        .first(),
      lastBefore,
    );
    assert.equal(await sessionCount(db, googleId.user.id), 0);
    // The history is immutable.
    await assert.rejects(db.prepare('DELETE FROM account_status_changes').run());
    await assert.rejects(db.prepare("UPDATE account_status_changes SET reason = 'x'").run());
  } finally {
    await mf.dispose();
  }
});

test('an administrator cannot disable their own account', async () => {
  const { mf, db, admin, adminId } = await setup();
  try {
    const response = await writeAccountStatus(
      post({ account: adminId, action: 'disable', reason, confirm: 'yes' }, admin.token),
      environment,
      db,
    );
    assert.equal(response.headers.get('Location'), '/admin/accounts?result=own_account');
    assert.equal(await activeOf(db, adminId), 1);
    assert.equal(await sessionCount(db, adminId), 1);
    await assert.rejects(
      changeAccountStatus(db, adminId, { account: adminId, action: 'disable', reason }),
    );
    assert.equal(
      (await db.prepare('SELECT COUNT(*) AS c FROM account_status_changes').first<{ c: number }>())
        ?.c,
      0,
    );
  } finally {
    await mf.dispose();
  }
});

test('enabling restores sign-in and a repeated change is refused as stale', async () => {
  const { mf, db, admin, adminId, passwordUser } = await setup();
  try {
    const targetId = await passwordUser('target@example.test');
    const send = (action: string) =>
      writeAccountStatus(
        post({ account: targetId, action, reason, confirm: 'yes' }, admin.token),
        environment,
        db,
      );
    assert.equal((await send('enable')).headers.get('Location'), '/admin/accounts?result=stale');
    assert.equal(
      (await send('disable')).headers.get('Location'),
      '/admin/accounts?result=disabled',
    );
    assert.equal((await send('disable')).headers.get('Location'), '/admin/accounts?result=stale');
    assert.equal((await send('enable')).headers.get('Location'), '/admin/accounts?result=enabled');
    assert.equal(await activeOf(db, targetId), 1);
    const attempt = await passwordSignIn(
      new Request(`${settings.origin}/auth/password/sign-in`, {
        method: 'POST',
        headers: {
          origin: settings.origin,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ email: 'target@example.test', password: strong }),
      }),
      environment,
      db,
    );
    assert.ok(!attempt.headers.get('Location')?.includes('error'));
    assert.equal(attempt.headers.getSetCookie().length, 1);
    assert.equal(await sessionCount(db, targetId), 1);
    assert.equal(
      (await db.prepare('SELECT COUNT(*) AS c FROM account_status_changes').first<{ c: number }>())
        ?.c,
      2,
    );
    // An account that does not exist is refused.
    await assert.rejects(
      changeAccountStatus(db, adminId, { account: 'missing', action: 'disable', reason }),
    );
  } finally {
    await mf.dispose();
  }
});

test('a disabled administrator cannot change accounts', async () => {
  const { mf, db, store, adminId, passwordUser } = await setup();
  try {
    const targetId = await passwordUser('target@example.test');
    await db.prepare('UPDATE accounts SET active = 0 WHERE id = ?').bind(adminId).run();
    await assert.rejects(
      changeAccountStatus(db, adminId, { account: targetId, action: 'disable', reason }),
    );
    const ordinary = await passwordUser('ordinary@example.test');
    await assert.rejects(
      changeAccountStatus(db, ordinary, { account: targetId, action: 'disable', reason }),
    );
    assert.equal(await activeOf(db, targetId), 1);
    void store;
  } finally {
    await mf.dispose();
  }
});

test('the account list paginates, searches by email and exposes no secrets', async () => {
  const { mf, db, passwordUser, adminId } = await setup();
  try {
    for (let index = 0; index < 24; index++) {
      const id = await passwordUser(`person${String(index).padStart(2, '0')}@example.test`);
      await db
        .prepare('UPDATE accounts SET created_at = ? WHERE id = ?')
        .bind(1_700_000_000_000 + index, id)
        .run();
    }
    await passwordUser('Under_Score%@example.test');
    const first = await listAccounts(db, {});
    assert.equal(first.accounts.length, 20);
    assert.ok(first.next);
    const second = await listAccounts(db, { after: first.next });
    assert.equal(second.accounts.length, 6);
    assert.equal(second.next, null);
    const ids = [...first.accounts, ...second.accounts].map((account) => account.id);
    assert.equal(new Set(ids).size, 26);
    const administrator = [...first.accounts, ...second.accounts].find(
      (account) => account.id === adminId,
    );
    assert.deepEqual(
      { administrator: administrator?.isAdministrator, methods: administrator?.methods },
      { administrator: true, methods: ['Google'] },
    );
    const found = await listAccounts(db, { query: '  PERSON07 ' });
    assert.deepEqual(
      found.accounts.map((account) => account.email),
      ['person07@example.test'],
    );
    assert.equal(found.accounts[0].methods[0], 'Email and password');
    // LIKE wildcards in the search text match literally.
    assert.equal((await listAccounts(db, { query: '%' })).accounts.length, 1);
    assert.equal((await listAccounts(db, { query: '_' })).accounts.length, 1);
    assert.equal((await listAccounts(db, { query: 'nobody' })).accounts.length, 0);
    assert.equal((await listAccounts(db, { query: "' OR 1=1 --" })).accounts.length, 0);
    await assert.rejects(listAccounts(db, { after: 'not a cursor' }));
    await assert.rejects(listAccounts(db, { query: 'x'.repeat(101) }));
    const text = JSON.stringify([...first.accounts, ...second.accounts]);
    assert.ok(!text.includes('pbkdf2'));
    assert.ok(!text.includes('g-admin'));
    assert.ok(!/token|hash|subject/i.test(Object.keys(first.accounts[0]).join(' ')));
  } finally {
    await mf.dispose();
  }
});
