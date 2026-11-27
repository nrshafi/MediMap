import { AuthError, type AuthenticatedUser, type SessionState } from '../contracts';
import { randomToken, tokenHash, validToken } from './crypto.server';
import { normalizeEmail } from '../passwordForm';
import type { GoogleIdentity, OAuthAttempt } from './google.server';

function storedRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new AuthError('unavailable');
  return Object.fromEntries(Object.entries(value));
}

function storedText(value: unknown): string {
  if (typeof value !== 'string' || !value || value.length > 2048)
    throw new AuthError('unavailable');
  return value;
}

function storedTime(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new AuthError('unavailable');
  return value;
}

export class AuthStore {
  constructor(
    private readonly db: D1Database,
    private readonly now: () => number = Date.now,
  ) {}

  async createAttempt(returnTo: string): Promise<{ token: string; attempt: OAuthAttempt }> {
    const token = randomToken();
    const attempt = {
      state: randomToken(),
      nonce: randomToken(),
      codeVerifier: randomToken(),
      returnTo,
    };
    const now = this.now();
    await this.db.batch([
      this.db.prepare('DELETE FROM oauth_attempts WHERE expires_at <= ?').bind(now),
      this.db
        .prepare(
          `INSERT INTO oauth_attempts(token_hash, state, nonce, code_verifier, return_to, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          await tokenHash(token),
          attempt.state,
          attempt.nonce,
          attempt.codeVerifier,
          returnTo,
          now,
          now + 10 * 60_000,
        ),
    ]);
    return { token, attempt };
  }

  async consumeAttempt(token: string | null): Promise<OAuthAttempt | null> {
    if (!validToken(token)) return null;
    const value = await this.db
      .prepare(
        `DELETE FROM oauth_attempts WHERE token_hash = ? AND expires_at > ?
      RETURNING state, nonce, code_verifier, return_to`,
      )
      .bind(await tokenHash(token), this.now())
      .first<unknown>();
    if (value === null) return null;
    const row = storedRecord(value);
    return {
      state: storedText(row.state),
      nonce: storedText(row.nonce),
      codeVerifier: storedText(row.code_verifier),
      returnTo: storedText(row.return_to),
    };
  }

  async signIn(
    identity: GoogleIdentity,
    previousToken: string | null,
  ): Promise<{ token: string; expiresAt: number }> {
    const now = this.now();
    const accountId = crypto.randomUUID();
    const token = randomToken();
    const expiresAt = now + 7 * 86400_000;
    const emailNormalized = normalizeEmail(identity.email);
    // Resolve the account by subject inside the batch. Concurrent first sign-ins cannot create duplicate accounts.
    // A new subject with the email of another account stops at the unique index. Accounts are never linked.
    // A disabled account keeps its email and last sign-in time. Its sign-in attempt changes nothing.
    const statements = [
      this.db
        .prepare(
          `INSERT INTO accounts(id, google_subject, email, email_normalized, created_at, last_signed_in_at)
        VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(google_subject) DO UPDATE SET
        email = excluded.email, email_normalized = excluded.email_normalized,
        last_signed_in_at = excluded.last_signed_in_at WHERE accounts.active = 1`,
        )
        .bind(accountId, identity.subject, identity.email, emailNormalized, now, now),
      this.db
        .prepare(
          `INSERT INTO auth_sessions(token_hash, account_id, created_at, expires_at)
        SELECT ?, id, ?, ? FROM accounts WHERE google_subject = ? AND active = 1`,
        )
        .bind(await tokenHash(token), now, expiresAt, identity.subject),
    ];
    statements.push(...(await this.replacedSession(previousToken, now)));
    let results: Awaited<ReturnType<D1Database['batch']>>;
    try {
      results = await this.db.batch(statements);
    } catch (error) {
      if (String(error).includes('accounts.email_normalized')) throw new AuthError('email_in_use');
      throw error;
    }
    if (results[1].meta.changes !== 1) throw new AuthError('forbidden');
    return { token, expiresAt };
  }

  // Deletes the previous session token and every session that expired more than one day ago. A session that
  // expired less than a day ago stays, so its owner still sees the expired-session message.
  // Runs in the same batch as the new session.
  private async replacedSession(
    previousToken: string | null,
    now: number,
  ): Promise<ReturnType<D1Database['prepare']>[]> {
    const statements: ReturnType<D1Database['prepare']>[] = [];
    if (validToken(previousToken))
      statements.push(
        this.db
          .prepare('DELETE FROM auth_sessions WHERE token_hash = ?')
          .bind(await tokenHash(previousToken)),
      );
    statements.push(
      this.db.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?').bind(now - 86400_000),
    );
    return statements;
  }

  // Creates an account and its password credential. The session starts in the same batch.
  // The caller passes the hash. A used email stops at the unique index on email_normalized.
  async createPasswordAccount(
    email: { email: string; normalized: string },
    passwordHash: string,
    previousToken: string | null,
  ): Promise<{ token: string; expiresAt: number }> {
    const now = this.now();
    const accountId = crypto.randomUUID();
    const token = randomToken();
    const expiresAt = now + 7 * 86400_000;
    const statements = [
      this.db
        .prepare(
          `INSERT INTO accounts(id, google_subject, email, email_normalized, created_at, last_signed_in_at)
        VALUES (?, NULL, ?, ?, ?, ?)`,
        )
        .bind(accountId, email.email, email.normalized, now, now),
      this.db
        .prepare(
          'INSERT INTO password_credentials(account_id, password_hash, updated_at) VALUES (?, ?, ?)',
        )
        .bind(accountId, passwordHash, now),
      this.db
        .prepare(
          'INSERT INTO auth_sessions(token_hash, account_id, created_at, expires_at) SELECT ?, id, ?, ? FROM accounts WHERE id = ? AND active = 1',
        )
        .bind(await tokenHash(token), now, expiresAt, accountId),
      ...(await this.replacedSession(previousToken, now)),
    ];
    try {
      await this.db.batch(statements);
    } catch (error) {
      if (String(error).includes('accounts.email_normalized')) throw new AuthError('email_in_use');
      throw error;
    }
    return { token, expiresAt };
  }

  // The stored hash is null when the email is unknown or the account has no password (Google only).
  async passwordCredential(
    normalizedEmail: string,
  ): Promise<{ accountId: string; active: boolean; hash: string | null } | null> {
    const value = await this.db
      .prepare(
        `SELECT a.id, a.active, c.password_hash FROM accounts a
      LEFT JOIN password_credentials c ON c.account_id = a.id WHERE a.email_normalized = ?`,
      )
      .bind(normalizedEmail)
      .first<unknown>();
    if (value === null) return null;
    const row = storedRecord(value);
    return {
      accountId: storedText(row.id),
      active: row.active === 1,
      hash: row.password_hash === null ? null : storedText(row.password_hash),
    };
  }

  // Starts a session for a password account that the caller has already verified.
  async startPasswordSession(
    accountId: string,
    previousToken: string | null,
  ): Promise<{ token: string; expiresAt: number }> {
    const now = this.now();
    const token = randomToken();
    const expiresAt = now + 7 * 86400_000;
    const results = await this.db.batch([
      this.db
        .prepare(
          'INSERT INTO auth_sessions(token_hash, account_id, created_at, expires_at) SELECT ?, id, ?, ? FROM accounts WHERE id = ? AND active = 1',
        )
        .bind(await tokenHash(token), now, expiresAt, accountId),
      this.db
        .prepare('UPDATE accounts SET last_signed_in_at = ? WHERE id = ? AND active = 1')
        .bind(now, accountId),
      ...(await this.replacedSession(previousToken, now)),
    ]);
    if (results[0].meta.changes !== 1) throw new AuthError('forbidden');
    return { token, expiresAt };
  }

  async passwordHashOf(accountId: string): Promise<string | null> {
    const value = await this.db
      .prepare('SELECT password_hash FROM password_credentials WHERE account_id = ?')
      .bind(accountId)
      .first<unknown>();
    return value === null ? null : storedText(storedRecord(value).password_hash);
  }

  async hasPassword(accountId: string): Promise<boolean> {
    return (
      (await this.db
        .prepare('SELECT 1 AS present FROM password_credentials WHERE account_id = ?')
        .bind(accountId)
        .first<unknown>()) !== null
    );
  }

  // Replaces the hash and deletes every other session of the account. The current session stays.
  // The update runs only if the hash is still the one the caller verified. Returns false if it changed.
  async changePassword(
    accountId: string,
    verifiedHash: string,
    newHash: string,
    currentToken: string,
  ): Promise<boolean> {
    const now = this.now();
    const results = await this.db.batch([
      this.db
        .prepare(
          'UPDATE password_credentials SET password_hash = ?, updated_at = ? WHERE account_id = ? AND password_hash = ?',
        )
        .bind(newHash, now, accountId, verifiedHash),
      this.db
        .prepare(
          `DELETE FROM auth_sessions WHERE account_id = ? AND token_hash != ?
        AND EXISTS (SELECT 1 FROM password_credentials WHERE account_id = ? AND password_hash = ?)`,
        )
        .bind(accountId, await tokenHash(currentToken), accountId, newHash),
    ]);
    return results[0].meta.changes === 1;
  }

  async session(token: string | null): Promise<SessionState> {
    if (!validToken(token)) return { status: 'anonymous' };
    const value = await this.db
      .prepare(
        `SELECT a.id, a.email, a.active, s.expires_at,
      EXISTS(SELECT 1 FROM administrator_grants g WHERE g.account_id = a.id) AS administrator
      FROM auth_sessions s JOIN accounts a ON a.id = s.account_id WHERE s.token_hash = ?`,
      )
      .bind(await tokenHash(token))
      .first<unknown>();
    if (value === null) return { status: 'anonymous' };
    const row = storedRecord(value);
    const expiresAt = storedTime(row.expires_at);
    if (expiresAt <= this.now()) return { status: 'expired' };
    if (row.active !== 1) return { status: 'anonymous' };
    if (row.administrator !== 0 && row.administrator !== 1) throw new AuthError('unavailable');
    const user: AuthenticatedUser = {
      id: storedText(row.id),
      email: storedText(row.email),
      isAdministrator: row.administrator === 1,
    };
    return { status: 'authenticated', user, expiresAt };
  }

  async signOut(token: string | null): Promise<void> {
    if (validToken(token))
      await this.db
        .prepare('DELETE FROM auth_sessions WHERE token_hash = ?')
        .bind(await tokenHash(token))
        .run();
  }
}
