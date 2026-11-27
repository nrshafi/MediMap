import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { AuthStore } from '../../src/features/authentication/server/store.server';
import {
  passwordChange,
  passwordSignIn,
  passwordSignUp,
} from '../../src/features/authentication/server/passwordHttp.server';
import { verifyPassword } from '../../src/features/authentication/server/password.server';
import { tokenHash } from '../../src/features/authentication/server/crypto.server';
import { environment, settings } from './google.fixture';

const strong = 'correct-horse-battery-9';
const other = 'another-long-secret-7!';

type Handler = typeof passwordSignUp;

function post(path: string, fields: Record<string, string>, token?: string, origin?: string) {
  return new Request(`${settings.origin}${path}`, {
    method: 'POST',
    headers: {
      origin: origin ?? settings.origin,
      'content-type': 'application/x-www-form-urlencoded',
      ...(token ? { cookie: `medimap_session=${token}` } : {}),
    },
    body: new URLSearchParams(fields),
  });
}

function sessionToken(response: Response): string {
  const cookie = response.headers
    .getSetCookie()
    .find((value) => value.startsWith('medimap_session='));
  assert.ok(cookie, 'session cookie');
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Max-Age=604800/);
  const token = cookie.slice('medimap_session='.length).split(';')[0];
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  return token;
}

function assertNoSecrets(response: Response, ...secrets: string[]) {
  const text = [...response.headers].flat().join('\n');
  for (const secret of secrets.filter(Boolean)) {
    assert.ok(!text.includes(secret), 'headers must not contain a password');
    assert.ok(!text.includes(encodeURIComponent(secret)), 'headers must not contain a password');
  }
  assert.ok(!/pbkdf2-sha256/.test(text), 'headers must not contain a hash');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
}

async function setup() {
  const mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test");}}',
    compatibilityDate: '2026-07-30',
    d1Databases: { DB: 'password-endpoints' },
  });
  const db = await mf.getD1Database('DB');
  const names = (await readdir('migrations')).filter((name) => name.endsWith('.sql')).sort();
  const text = (
    await Promise.all(names.map((name) => readFile(`migrations/${name}`, 'utf8')))
  ).join('\n');
  const statements = text.match(/\s*CREATE TRIGGER[\s\S]*?END;|[^;]+;/g);
  assert.ok(statements);
  await db.batch(statements.map((sql) => db.prepare(sql)));
  const call = (handler: Handler, path: string, fields: Record<string, string>, token?: string) =>
    handler(post(path, fields, token), environment, db);
  return {
    mf,
    db,
    store: new AuthStore(db),
    signUp: (fields: Record<string, string>, token?: string) =>
      call(passwordSignUp, '/auth/password/sign-up', fields, token),
    signIn: (fields: Record<string, string>, token?: string) =>
      call(passwordSignIn, '/auth/password/sign-in', fields, token),
    change: (fields: Record<string, string>, token?: string) =>
      call(passwordChange, '/auth/password/change', fields, token),
  };
}

async function count(db: D1Database, table: string): Promise<number> {
  return (await db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).first<{ c: number }>())?.c ?? -1;
}

test('sign-up creates the account, the credential and a session in one request', async () => {
  const { mf, db, store, signUp } = await setup();
  try {
    const response = await signUp({
      email: '  New.Member@Example.TEST ',
      password: strong,
      confirmPassword: strong,
      returnTo: '/reviews?listing=x',
    });
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('Location'), '/reviews?listing=x');
    assertNoSecrets(response, strong);
    const token = sessionToken(response);
    const account = await db
      .prepare('SELECT id, google_subject, email, email_normalized, active FROM accounts')
      .first<Record<string, unknown>>();
    assert.deepEqual(
      { ...account, id: 'x' },
      {
        id: 'x',
        google_subject: null,
        email: 'New.Member@Example.TEST',
        email_normalized: 'new.member@example.test',
        active: 1,
      },
    );
    const credential = await db
      .prepare('SELECT password_hash FROM password_credentials WHERE account_id = ?')
      .bind(account?.id)
      .first<{ password_hash: string }>();
    assert.ok(credential);
    assert.ok(credential.password_hash.startsWith('pbkdf2-sha256$'));
    assert.ok(!credential.password_hash.includes(strong));
    assert.equal(await verifyPassword(strong, credential.password_hash), true);
    const session = await store.session(token);
    assert.equal(session.status, 'authenticated');
    assert.equal(
      session.status === 'authenticated' && session.user.email,
      'New.Member@Example.TEST',
    );
    assert.equal(await store.hasPassword(String(account?.id)), true);
    // The session is stored as a hash.
    assert.equal(
      (
        await db
          .prepare('SELECT COUNT(*) AS c FROM auth_sessions WHERE token_hash = ?')
          .bind(await tokenHash(token))
          .first<{ c: number }>()
      )?.c,
      1,
    );
  } finally {
    await mf.dispose();
  }
});

test('sign-up replaces the previous session and ignores an unsafe return path', async () => {
  const { mf, db, store, signUp } = await setup();
  try {
    const previous = await store.signIn({ subject: 'g-prev', email: 'prev@example.test' }, null);
    const response = await signUp(
      { email: 'a@example.test', password: strong, returnTo: 'https://evil.test/' },
      previous.token,
    );
    assert.equal(response.headers.get('Location'), '/account');
    assert.equal((await store.session(previous.token)).status, 'anonymous');
    assert.equal((await store.session(sessionToken(response))).status, 'authenticated');
    assert.equal(await count(db, 'auth_sessions'), 1);
  } finally {
    await mf.dispose();
  }
});

test('sign-up rejects each validation failure and creates nothing', async () => {
  const { mf, db, signUp } = await setup();
  try {
    const cases: Array<[Record<string, string>, string]> = [
      [{ email: 'not-an-email', password: strong }, 'invalid_email'],
      [{ email: '', password: strong }, 'invalid_email'],
      [{ email: `${'a'.repeat(320)}@e.co`, password: strong }, 'invalid_email'],
      [{ email: 'a@example.test', password: 'short1!' }, 'too_short'],
      [{ email: 'a@example.test', password: '' }, 'too_short'],
      [{ email: 'a@example.test', password: 'x'.repeat(129) }, 'too_long'],
      [{ email: 'a@example.test', password: 'password123' }, 'common'],
      [{ email: 'a@example.test', password: 'a@example.test' }, 'matches_email'],
      [{ email: 'longname-here@example.test', password: 'longname-here' }, 'matches_email'],
      [{ email: 'a@example.test', password: strong, confirmPassword: `${strong}x` }, 'mismatch'],
    ];
    for (const [fields, code] of cases) {
      const response = await signUp({ ...fields, returnTo: '/reviews' });
      assert.equal(response.status, 303, code);
      assert.equal(response.headers.get('Location'), `/sign-up?error=${code}&returnTo=%2Freviews`);
      assert.equal(response.headers.getSetCookie().length, 0);
      assertNoSecrets(response, fields.password);
    }
    assert.equal(await count(db, 'accounts'), 0);
    assert.equal(await count(db, 'password_credentials'), 0);
    // A missing password field is a rule failure, not a crash.
    const missing = await signUp({ email: 'a@example.test' });
    assert.equal(missing.headers.get('Location'), '/sign-up?error=too_short');
  } finally {
    await mf.dispose();
  }
});

test('sign-up refuses an email that a Google account or a password account uses', async () => {
  const { mf, db, store, signUp } = await setup();
  try {
    await store.signIn({ subject: 'g-1', email: 'Google.User@Example.test' }, null);
    const google = await signUp({ email: ' google.user@EXAMPLE.test ', password: strong });
    assert.equal(google.headers.get('Location'), '/sign-up?error=email_in_use');
    assert.equal(google.headers.getSetCookie().length, 0);
    const first = await signUp({ email: 'dup@example.test', password: strong });
    assert.equal(first.status, 303);
    assert.ok(!first.headers.get('Location')?.includes('error'));
    const second = await signUp({ email: 'DUP@example.test', password: other });
    assert.equal(second.headers.get('Location'), '/sign-up?error=email_in_use');
    assert.equal(await count(db, 'accounts'), 2);
    assert.equal(await count(db, 'password_credentials'), 1);
    assert.equal(await count(db, 'auth_sessions'), 2);
  } finally {
    await mf.dispose();
  }
});

test('every password endpoint rejects a cross-origin POST before any change', async () => {
  const { mf, db, store } = await setup();
  try {
    const first = await passwordSignUp(
      post('/auth/password/sign-up', { email: 'a@example.test', password: strong }),
      environment,
      db,
    );
    const token = sessionToken(first);
    const handlers: Array<[Handler, string, Record<string, string>]> = [
      [passwordSignUp, '/auth/password/sign-up', { email: 'b@example.test', password: strong }],
      [passwordSignIn, '/auth/password/sign-in', { email: 'a@example.test', password: strong }],
      [passwordChange, '/auth/password/change', { currentPassword: strong, newPassword: other }],
    ];
    for (const [handler, path, fields] of handlers) {
      for (const request of [
        post(path, fields, token, 'https://attacker.invalid'),
        new Request(`${settings.origin}${path}`, {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            cookie: `medimap_session=${token}`,
          },
          body: new URLSearchParams(fields),
        }),
        new Request(`${settings.origin}${path}`, {
          method: 'POST',
          headers: {
            origin: settings.origin,
            'sec-fetch-site': 'cross-site',
            'content-type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(fields),
        }),
      ]) {
        const response = await handler(request, environment, db);
        assert.equal(response.status, 403, path);
        assert.equal(response.headers.get('Cache-Control'), 'no-store');
        assert.equal(response.headers.getSetCookie().length, 0);
      }
    }
    assert.equal(await count(db, 'accounts'), 1);
    assert.equal((await store.session(token)).status, 'authenticated');
    assert.equal(await count(db, 'auth_sessions'), 1);
  } finally {
    await mf.dispose();
  }
});

test('sign-in accepts the right password and replaces the previous session', async () => {
  const { mf, db, store, signUp, signIn } = await setup();
  try {
    const created = await signUp({ email: 'user@example.test', password: strong });
    const old = sessionToken(created);
    const response = await signIn(
      { email: ' USER@example.test', password: strong, returnTo: '/reviews' },
      old,
    );
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('Location'), '/reviews');
    assertNoSecrets(response, strong);
    const fresh = sessionToken(response);
    assert.notEqual(fresh, old);
    assert.equal((await store.session(old)).status, 'anonymous');
    assert.equal((await store.session(fresh)).status, 'authenticated');
    assert.equal(await count(db, 'auth_sessions'), 1);
    // Unicode passwords match after NFC normalization.
    const composed = await signUp({ email: 'unicode@example.test', password: 'café-café-café' });
    assert.equal(composed.status, 303);
    const decomposed = await signIn({ email: 'unicode@example.test', password: 'café-café-café' });
    assert.ok(!decomposed.headers.get('Location')?.includes('error'));
  } finally {
    await mf.dispose();
  }
});

test('sign-in gives one generic failure for unknown email, Google-only account and wrong password', async () => {
  const { mf, db, store, signUp, signIn } = await setup();
  try {
    await signUp({ email: 'user@example.test', password: strong });
    await store.signIn({ subject: 'g-only', email: 'google@example.test' }, null);
    const sessionsBefore = await count(db, 'auth_sessions');
    const responses = [
      await signIn({ email: 'nobody@example.test', password: strong }),
      await signIn({ email: 'google@example.test', password: strong }),
      await signIn({ email: 'user@example.test', password: other }),
      await signIn({ email: 'bad', password: strong }),
      await signIn({ email: 'user@example.test', password: '' }),
      await signIn({ email: 'user@example.test', password: 'x'.repeat(5000) }),
    ];
    for (const response of responses) {
      assert.equal(response.status, 303);
      assert.equal(response.headers.get('Location'), '/sign-in?error=credentials');
      assert.equal(response.headers.getSetCookie().length, 0);
      assertNoSecrets(response, strong, other);
    }
    assert.equal(await count(db, 'auth_sessions'), sessionsBefore);
  } finally {
    await mf.dispose();
  }
});

test('sign-in runs exactly one key derivation for known, unknown and Google-only emails', async () => {
  const { mf, signUp, signIn, store } = await setup();
  const subtle = crypto.subtle;
  const original = subtle.deriveBits.bind(subtle);
  let derivations = 0;
  Object.defineProperty(subtle, 'deriveBits', {
    configurable: true,
    value: (...args: Parameters<typeof original>) => {
      derivations += 1;
      return original(...args);
    },
  });
  try {
    await signUp({ email: 'user@example.test', password: strong });
    await store.signIn({ subject: 'g-only', email: 'google@example.test' }, null);
    for (const email of ['user@example.test', 'nobody@example.test', 'google@example.test']) {
      derivations = 0;
      await signIn({ email, password: other });
      assert.equal(derivations, 1, email);
    }
  } finally {
    Reflect.deleteProperty(subtle, 'deriveBits');
    await mf.dispose();
  }
});

test('sign-in refuses an inactive account only after the right password', async () => {
  const { mf, db, signUp, signIn } = await setup();
  try {
    await signUp({ email: 'user@example.test', password: strong });
    await db.prepare('UPDATE accounts SET active = 0').run();
    const sessions = await count(db, 'auth_sessions');
    const right = await signIn({ email: 'user@example.test', password: strong });
    assert.equal(right.headers.get('Location'), '/sign-in?error=forbidden');
    assert.equal(right.headers.getSetCookie().length, 0);
    const wrong = await signIn({ email: 'user@example.test', password: other });
    assert.equal(wrong.headers.get('Location'), '/sign-in?error=credentials');
    assert.equal(await count(db, 'auth_sessions'), sessions);
  } finally {
    await mf.dispose();
  }
});

test('change-password updates the hash and deletes only the other sessions of the account', async () => {
  const { mf, db, store, signUp, signIn, change } = await setup();
  try {
    const current = sessionToken(await signUp({ email: 'user@example.test', password: strong }));
    const second = sessionToken(await signIn({ email: 'user@example.test', password: strong }));
    const third = sessionToken(await signIn({ email: 'user@example.test', password: strong }));
    const bystander = sessionToken(
      await signUp({ email: 'bystander@example.test', password: strong }),
    );
    const google = await store.signIn({ subject: 'g-b', email: 'g@example.test' }, null);
    assert.equal(await count(db, 'auth_sessions'), 5);
    const response = await change(
      {
        currentPassword: strong,
        newPassword: other,
        confirmNewPassword: other,
      },
      current,
    );
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('Location'), '/account?changed=1');
    assertNoSecrets(response, strong, other);
    assert.equal(response.headers.getSetCookie().length, 0);
    assert.equal((await store.session(current)).status, 'authenticated');
    assert.equal((await store.session(second)).status, 'anonymous');
    assert.equal((await store.session(third)).status, 'anonymous');
    assert.equal((await store.session(bystander)).status, 'authenticated');
    assert.equal((await store.session(google.token)).status, 'authenticated');
    assert.equal(await count(db, 'auth_sessions'), 3);
    // The old password stops working and the new one works.
    const old = await signIn({ email: 'user@example.test', password: strong });
    assert.equal(old.headers.get('Location'), '/sign-in?error=credentials');
    const fresh = await signIn({ email: 'user@example.test', password: other });
    assert.ok(!fresh.headers.get('Location')?.includes('error'));
    // The bystander password did not change.
    const unchanged = await signIn({ email: 'bystander@example.test', password: strong });
    assert.ok(!unchanged.headers.get('Location')?.includes('error'));
  } finally {
    await mf.dispose();
  }
});

test('change-password rejects a wrong current password and rule failures without changes', async () => {
  const { mf, db, signUp, change } = await setup();
  try {
    const token = sessionToken(await signUp({ email: 'user@example.test', password: strong }));
    sessionToken(await signUp({ email: 'two@example.test', password: strong }));
    const before = await db
      .prepare('SELECT account_id, password_hash FROM password_credentials ORDER BY account_id')
      .all();
    const cases: Array<[Record<string, string>, string]> = [
      [{ currentPassword: other, newPassword: other }, 'current_incorrect'],
      [{ currentPassword: '', newPassword: other }, 'current_incorrect'],
      [{ newPassword: other }, 'current_incorrect'],
      [{ currentPassword: strong, newPassword: 'short1!' }, 'too_short'],
      [{ currentPassword: strong, newPassword: 'password123' }, 'common'],
      [{ currentPassword: strong, newPassword: 'user@example.test' }, 'matches_email'],
      [{ currentPassword: strong, newPassword: other, confirmNewPassword: 'x' }, 'mismatch'],
    ];
    for (const [fields, code] of cases) {
      const response = await change(fields, token);
      assert.equal(response.headers.get('Location'), `/account?error=${code}`, code);
      assertNoSecrets(response, strong, other, fields.newPassword ?? other);
    }
    assert.deepEqual(
      (
        await db
          .prepare('SELECT account_id, password_hash FROM password_credentials ORDER BY account_id')
          .all()
      ).results,
      before.results,
    );
    assert.equal(await count(db, 'auth_sessions'), 2);
  } finally {
    await mf.dispose();
  }
});

test('change-password needs a signed-in password account', async () => {
  const { mf, db, store, signUp, change } = await setup();
  try {
    const anonymous = await change({ currentPassword: strong, newPassword: other });
    assert.equal(anonymous.headers.get('Location'), '/sign-in?reason=required');
    const google = await store.signIn({ subject: 'g-1', email: 'g@example.test' }, null);
    const refused = await change({ currentPassword: strong, newPassword: other }, google.token);
    assert.equal(refused.headers.get('Location'), '/account?error=not_password_account');
    assert.equal(await count(db, 'password_credentials'), 0);
    const token = sessionToken(await signUp({ email: 'user@example.test', password: strong }));
    await db
      .prepare('UPDATE auth_sessions SET created_at = 0, expires_at = 1 WHERE token_hash = ?')
      .bind(await tokenHash(token))
      .run();
    const expired = await change({ currentPassword: strong, newPassword: other }, token);
    assert.equal(expired.headers.get('Location'), '/sign-in?reason=expired');
  } finally {
    await mf.dispose();
  }
});

test('a new session keeps a session that expired less than a day ago and removes older ones', async () => {
  const { mf, db, store, signUp } = await setup();
  try {
    const recent = await store.signIn({ subject: 'g-1', email: 'one@example.test' }, null);
    const old = await store.signIn({ subject: 'g-2', email: 'two@example.test' }, null);
    const now = Date.now();
    await db
      .prepare('UPDATE auth_sessions SET created_at = ?, expires_at = ? WHERE token_hash = ?')
      .bind(now - 100_000, now - 1000, await tokenHash(recent.token))
      .run();
    await db
      .prepare('UPDATE auth_sessions SET created_at = ?, expires_at = ? WHERE token_hash = ?')
      .bind(now - 3 * 86400_000, now - 2 * 86400_000, await tokenHash(old.token))
      .run();
    await signUp({ email: 'new@example.test', password: strong });
    assert.deepEqual(await store.session(recent.token), { status: 'expired' });
    assert.deepEqual(await store.session(old.token), { status: 'anonymous' });
  } finally {
    await mf.dispose();
  }
});
