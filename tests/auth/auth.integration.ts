import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { AuthStore } from '../../src/features/authentication/server/store.server';
import {
  requireUser,
  requireAdministrator,
} from '../../src/features/authentication/server/access.server';
import { GoogleSignIn } from '../../src/features/authentication/server/google.server';
import {
  startGoogle,
  finishGoogle,
  signOut,
} from '../../src/features/authentication/server/http.server';
import {
  authCookie,
  readAuthCookie,
} from '../../src/features/authentication/server/cookies.server';
import { randomToken, tokenHash } from '../../src/features/authentication/server/crypto.server';
import { safeReturnTo } from '../../src/features/authentication/contracts';
import { environment, settings, googleFixture } from './google.fixture';

function request(path: string, token?: string, method = 'GET', origin = settings.origin) {
  return new Request(`${settings.origin}${path}`, {
    method,
    headers: {
      ...(token ? { cookie: `medimap_session=${token}` } : {}),
      ...(method === 'POST' ? { origin } : {}),
    },
  });
}

test('authentication against actual local D1 and signed OpenID tokens', async (t) => {
  const mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test");}}',
    compatibilityDate: '2026-07-30',
    d1Databases: { DB: 'auth-integration' },
  });
  try {
    const db = await mf.getD1Database('DB');
    const migrations = (
      await Promise.all(
        (await readdir('migrations'))
          .filter((name) => name.endsWith('.sql'))
          .sort()
          .map((name) => readFile(`migrations/${name}`, 'utf8')),
      )
    ).join('\n');
    const statements = migrations.match(/\s*CREATE TRIGGER[\s\S]*?END;|[^;]+;/g);
    assert.ok(statements);
    await db.batch(statements.map((sql) => db.prepare(sql)));
    let now = Date.now();
    const store = new AuthStore(db, () => now);
    const identity = { subject: 'test-member-subject', email: 'member@example.test' };
    const first = await store.signIn(identity, null);

    await t.test(
      'anonymous, member, forged role and forged session requests cannot administer',
      async () => {
        await assert.rejects(requireUser(request('/account'), db), { code: 'unauthenticated' });
        const user = await requireUser(request('/account', first.token), db);
        assert.equal(user.user.isAdministrator, false);
        const forged = new Request(`${settings.origin}/admin/catalog`, {
          headers: {
            cookie: `medimap_session=${first.token}; role=admin`,
            'x-role': 'administrator',
            'x-user-id': user.user.id,
          },
        });
        await assert.rejects(requireAdministrator(forged, db), { code: 'forbidden' });
        await assert.rejects(requireAdministrator(request('/admin/catalog', randomToken()), db), {
          code: 'unauthenticated',
        });
        await assert.rejects(requireUser(request('/account', `${first.token}.admin`), db), {
          code: 'unauthenticated',
        });
      },
    );

    await t.test(
      'sessions persist as hashes, expire in seven days and never extend on reads',
      async () => {
        const row = await db
          .prepare(
            'SELECT token_hash, created_at, expires_at FROM auth_sessions WHERE token_hash = ?',
          )
          .bind(await tokenHash(first.token))
          .first<{ token_hash: string; created_at: number; expires_at: number }>();
        assert.ok(row);
        assert.notEqual(row.token_hash, first.token);
        assert.equal(row.expires_at - row.created_at, 7 * 86400_000);
        now += 60_000;
        assert.equal((await store.session(first.token)).status, 'authenticated');
        assert.equal(
          (
            await db
              .prepare('SELECT expires_at FROM auth_sessions WHERE token_hash = ?')
              .bind(row.token_hash)
              .first<{ expires_at: number }>()
          )?.expires_at,
          row.expires_at,
        );
        now = row.expires_at;
        assert.deepEqual(await store.session(first.token), { status: 'expired' });
        now = Date.now();
        const expired = await store.signIn(
          { subject: 'expired-subject', email: 'expired@example.test' },
          null,
        );
        await db
          .prepare('UPDATE auth_sessions SET created_at = ?, expires_at = ? WHERE token_hash = ?')
          .bind(now - 10000, now - 1, await tokenHash(expired.token))
          .run();
        await assert.rejects(requireAdministrator(request('/admin/catalog', expired.token), db), {
          code: 'expired',
        });
      },
    );

    await t.test(
      'stable subject preserves identity without email-based merging or implicit administrator grants',
      async () => {
        const second = await store.signIn(
          { ...identity, email: 'changed@example.test' },
          first.token,
        );
        assert.equal((await store.session(first.token)).status, 'anonymous');
        const signedIn = await store.session(second.token);
        assert.equal(signedIn.status, 'authenticated');
        if (signedIn.status !== 'authenticated') throw new Error('Missing session');
        assert.equal(signedIn.user.email, 'changed@example.test');
        assert.equal(signedIn.user.isAdministrator, false);
        await store.signIn({ subject: 'other-subject', email: 'changed@example.test' }, null);
        assert.equal(
          (
            await db
              .prepare('SELECT COUNT(*) AS count FROM accounts WHERE email = ?')
              .bind('changed@example.test')
              .first<{ count: number }>()
          )?.count,
          2,
        );
        await db
          .prepare('UPDATE accounts SET active = 0 WHERE id = ?')
          .bind(signedIn.user.id)
          .run();
        assert.equal((await store.session(second.token)).status, 'anonymous');
        await assert.rejects(store.signIn(identity, null), { code: 'forbidden' });
        await db
          .prepare('UPDATE accounts SET active = 1 WHERE id = ?')
          .bind(signedIn.user.id)
          .run();
      },
    );

    await t.test(
      'explicit owner grants authorize administrators and grant changes revoke sessions',
      async () => {
        const account = await db
          .prepare('SELECT id FROM accounts WHERE google_subject = ?')
          .bind(identity.subject)
          .first<{ id: string }>();
        assert.ok(account);
        const before = await store.signIn(identity, null);
        await db
          .prepare(
            'INSERT INTO administrator_grants(account_id, granted_at, granted_by) VALUES (?, ?, ?)',
          )
          .bind(account.id, now, 'test-owner')
          .run();
        assert.equal((await store.session(before.token)).status, 'anonymous');
        const administrator = await store.signIn(identity, null);
        assert.equal(
          (await requireAdministrator(request('/admin/catalog', administrator.token), db)).user.id,
          account.id,
        );
        await db
          .prepare('DELETE FROM administrator_grants WHERE account_id = ?')
          .bind(account.id)
          .run();
        await assert.rejects(
          requireAdministrator(request('/admin/catalog', administrator.token), db),
          { code: 'unauthenticated' },
        );
      },
    );

    await t.test(
      'OAuth attempts are browser-bound, expiring and consumed atomically once',
      async () => {
        const flow = await store.createAttempt('/admin/catalog');
        assert.equal(await store.consumeAttempt(randomToken()), null);
        const attempts = await Promise.all([
          store.consumeAttempt(flow.token),
          store.consumeAttempt(flow.token),
        ]);
        assert.equal(attempts.filter(Boolean).length, 1);
        const expired = await store.createAttempt('/account');
        now += 600_000;
        assert.equal(await store.consumeAttempt(expired.token), null);
        now = Date.now();
      },
    );

    await t.test(
      'Google authorization uses state, nonce, S256 PKCE and a fixed callback',
      async () => {
        const { attempt } = await store.createAttempt('/account');
        const fixture = await googleFixture(attempt);
        const url = new URL(
          await new GoogleSignIn(settings, fixture.fetcher).authorizationUrl(attempt),
        );
        assert.equal(url.origin, 'https://accounts.google.com');
        assert.equal(url.searchParams.get('state'), attempt.state);
        assert.equal(url.searchParams.get('nonce'), attempt.nonce);
        assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
        assert.notEqual(url.searchParams.get('code_challenge'), attempt.codeVerifier);
        assert.equal(url.searchParams.get('scope'), 'openid email');
        assert.equal(
          url.searchParams.get('redirect_uri'),
          `${settings.origin}/auth/google/callback`,
        );
      },
    );

    await t.test(
      'sign-in initiation binds a browser cookie and keeps return destinations local',
      async () => {
        const dummy = {
          state: randomToken(),
          nonce: randomToken(),
          codeVerifier: randomToken(),
          returnTo: '/account',
        };
        const fixture = await googleFixture(dummy);
        const incoming = new Request(`${settings.origin}/auth/google/start`, {
          method: 'POST',
          headers: { origin: settings.origin },
          body: new URLSearchParams({ returnTo: 'https://attacker.invalid' }),
        });
        const response = await startGoogle(incoming, environment, db, fixture.fetcher);
        assert.equal(response.status, 303);
        const location = new URL(response.headers.get('location') ?? '');
        assert.equal(location.origin, 'https://accounts.google.com');
        const cookie = response.headers.getSetCookie()[0];
        assert.match(cookie, /HttpOnly; SameSite=Lax; Max-Age=600/);
        const token = cookie.split(';')[0].split('=')[1];
        const stored = await store.consumeAttempt(token);
        assert.ok(stored);
        assert.equal(stored.returnTo, '/account');
        assert.equal(stored.state, location.searchParams.get('state'));
        assert.equal(stored.nonce, location.searchParams.get('nonce'));
      },
    );

    await t.test(
      'valid signed Google callback creates an ordinary session and replay fails',
      async () => {
        const flow = await store.createAttempt('/admin/catalog?service=complete-blood-count');
        const fixture = await googleFixture(flow.attempt);
        const callback = new Request(
          `${settings.origin}/auth/google/callback?code=test-code&state=${flow.attempt.state}`,
          { headers: { cookie: `medimap_oauth=${flow.token}` } },
        );
        const response = await finishGoogle(callback, environment, db, fixture.fetcher);
        assert.equal(
          response.headers.get('location'),
          '/admin/catalog?service=complete-blood-count',
        );
        const cookies = response.headers.getSetCookie();
        assert.equal(cookies.length, 2);
        const cookie = cookies.find((value) => value.startsWith('medimap_session='));
        assert.ok(cookie);
        const token = cookie.split(';')[0].split('=')[1];
        const session = await store.session(token);
        assert.equal(session.status, 'authenticated');
        if (session.status === 'authenticated') assert.equal(session.user.isAdministrator, false);
        assert.ok(fixture.calls.includes('https://www.googleapis.com/oauth2/v3/certs'));
        assert.equal(
          (await finishGoogle(callback, environment, db, fixture.fetcher)).headers.get('location'),
          '/sign-in?reason=failed',
        );
      },
    );

    await t.test(
      'wrong state, nonce, audience, issuer, expiry, signature and unverified email are rejected',
      async () => {
        for (const [overrides, wrongState, badSignature] of [
          [{}, true, false],
          [{ nonce: 'wrong' }, false, false],
          [{ aud: 'other-client' }, false, false],
          [{ iss: 'https://attacker.invalid' }, false, false],
          [{ exp: 1 }, false, false],
          [{}, false, true],
          [{ email_verified: false }, false, false],
        ] as const) {
          const { attempt } = await store.createAttempt('/account');
          const fixture = await googleFixture(attempt, overrides, badSignature);
          const callback = new URL(
            `${settings.origin}/auth/google/callback?code=test&state=${wrongState ? 'wrong' : attempt.state}`,
          );
          await assert.rejects(
            new GoogleSignIn(settings, fixture.fetcher).identity(callback, attempt),
          );
        }
      },
    );

    await t.test(
      'callback cancellation, missing cookies and provider failures do not create sessions or expose errors',
      async () => {
        const before = await db
          .prepare('SELECT COUNT(*) AS count FROM auth_sessions')
          .first<{ count: number }>();
        const flow = await store.createAttempt('/account');
        const fixture = await googleFixture(flow.attempt);
        const request = new Request(
          `${settings.origin}/auth/google/callback?error=access_denied&state=${flow.attempt.state}`,
          { headers: { cookie: `medimap_oauth=${flow.token}` } },
        );
        const denied = await finishGoogle(request, environment, db, fixture.fetcher);
        assert.equal(denied.headers.get('location'), '/sign-in?reason=failed');
        const noCookie = await finishGoogle(
          new Request(`${settings.origin}/auth/google/callback?code=stolen`),
          environment,
          db,
          fixture.fetcher,
        );
        assert.equal(noCookie.headers.get('location'), '/sign-in?reason=failed');
        assert.deepEqual(
          await db.prepare('SELECT COUNT(*) AS count FROM auth_sessions').first(),
          before,
        );
        assert.equal(await denied.text(), '');
      },
    );

    await t.test(
      'cross-origin and GET state changes fail; valid POST sign-out revokes the session',
      async () => {
        const session = await store.signIn(
          { subject: 'signout-subject', email: 'signout@example.test' },
          null,
        );
        assert.equal(
          (
            await signOut(
              request('/auth/sign-out', session.token, 'POST', 'https://attacker.invalid'),
              environment,
              db,
            )
          ).status,
          403,
        );
        assert.equal(
          (await signOut(request('/auth/sign-out', session.token), environment, db)).status,
          403,
        );
        assert.equal((await store.session(session.token)).status, 'authenticated');
        const response = await signOut(
          request('/auth/sign-out', session.token, 'POST'),
          environment,
          db,
        );
        assert.equal(response.status, 303);
        assert.equal((await store.session(session.token)).status, 'anonymous');
        assert.ok(response.headers.getSetCookie().every((cookie) => cookie.includes('Max-Age=0')));
        assert.equal(
          (
            await startGoogle(
              request('/auth/google/start', undefined, 'POST', 'https://attacker.invalid'),
              environment,
              db,
            )
          ).status,
          403,
        );
        assert.equal(
          (await startGoogle(request('/auth/google/start', undefined, 'POST'), {}, db)).headers.get(
            'location',
          ),
          '/sign-in?reason=unavailable',
        );
      },
    );

    await t.test(
      'cookies have production security flags; duplicate or malformed cookies cannot authenticate',
      () => {
        const secure = new Request('https://medimap.example/account');
        const cookie = authCookie(secure, 'session', randomToken(), 604800);
        assert.match(cookie, /^__Host-medimap_session=/);
        assert.match(cookie, /HttpOnly; SameSite=Lax; Max-Age=604800; Secure/);
        assert.doesNotMatch(cookie, /Domain=/);
        const duplicate = new Request(settings.origin, {
          headers: { cookie: `medimap_session=${first.token}; medimap_session=${randomToken()}` },
        });
        assert.equal(readAuthCookie(duplicate, 'session'), null);
        assert.equal(readAuthCookie(request('/account', 'malformed'), 'session'), null);
      },
    );

    await t.test(
      'return destinations cannot redirect outside the app or back into auth endpoints',
      () => {
        for (const value of [
          'https://attacker.invalid',
          '//attacker.invalid',
          '/\\attacker.invalid',
          '/%2f%2fattacker.invalid',
          '/auth/google/start',
          '/sign-in',
          '/x/..//attacker.invalid',
          '/%00evil',
        ])
          assert.equal(safeReturnTo(value), '/account');
        assert.equal(
          safeReturnTo('/admin/catalog?service=complete-blood-count'),
          '/admin/catalog?service=complete-blood-count',
        );
      },
    );
  } finally {
    await mf.dispose();
  }
});
