import { Miniflare } from 'miniflare';
import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { AuthStore } from '../../src/features/authentication/server/store.server';
import { tokenHash } from '../../src/features/authentication/server/crypto.server';

const statePath = process.env.MEDIMAP_D1_STATE;
if (
  !statePath ||
  (!resolve(statePath).startsWith(resolve('.bun-tmp') + '\\') &&
    !resolve(statePath).startsWith(resolve('.bun-tmp') + '/'))
) {
  throw new Error('Browser session fixtures require an isolated state path inside .bun-tmp');
}
const mf = new Miniflare({
  modules: true,
  script: 'export default {fetch(){return new Response("fixtures");}}',
  compatibilityDate: '2026-07-30',
  d1Persist: resolve(statePath, 'v3/d1'),
  d1Databases: { DB: '00000000-0000-0000-0000-000000000001' },
});
try {
  const db = await mf.getD1Database('DB');
  const store = new AuthStore(db);
  const administratorIdentity = {
    subject: 'browser-administrator',
    email: 'administrator@example.test',
  };
  const initial = await store.signIn(administratorIdentity, null);
  const administrator = await store.session(initial.token);
  if (administrator.status !== 'authenticated') throw new Error('Missing browser fixture account');
  await db
    .prepare(
      `INSERT INTO administrator_grants(account_id, granted_at, granted_by) VALUES (?, ?, ?)
    ON CONFLICT(account_id) DO UPDATE SET granted_at = excluded.granted_at`,
    )
    .bind(administrator.user.id, Date.now(), 'isolated-browser-test')
    .run();
  const admin = await store.signIn(administratorIdentity, null);
  const member = await store.signIn(
    { subject: 'browser-member', email: 'member@example.test' },
    null,
  );
  const expired = await store.signIn(
    { subject: 'browser-expired', email: 'expired@example.test' },
    null,
  );
  const signOutIdentity = { subject: 'browser-member', email: 'member@example.test' };
  const signOutDesktop = await store.signIn(signOutIdentity, null);
  const signOutMobile = await store.signIn(signOutIdentity, null);
  const signOutNoJsDesktop = await store.signIn(signOutIdentity, null);
  const signOutNoJsMobile = await store.signIn(signOutIdentity, null);
  await db
    .prepare('UPDATE auth_sessions SET created_at = ?, expires_at = ? WHERE token_hash = ?')
    .bind(Date.now() - 10000, Date.now() - 1000, await tokenHash(expired.token))
    .run();
  await writeFile(
    '.bun-tmp/browser-sessions.json',
    JSON.stringify({
      admin: admin.token,
      member: member.token,
      expired: expired.token,
      'signout-desktop': signOutDesktop.token,
      'signout-mobile': signOutMobile.token,
      'signout-nojs-desktop': signOutNoJsDesktop.token,
      'signout-nojs-mobile': signOutNoJsMobile.token,
    }),
  );
} finally {
  await mf.dispose();
}
