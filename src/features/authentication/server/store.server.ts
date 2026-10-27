import { AuthError, type AuthenticatedUser, type SessionState } from '../contracts';
import { randomToken, tokenHash, validToken } from './crypto.server';
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
    // Resolve the account by subject inside the batch. Concurrent first sign-ins cannot create duplicate accounts.
    const statements = [
      this.db
        .prepare(
          `INSERT INTO accounts(id, google_subject, email, created_at, last_signed_in_at)
        VALUES (?, ?, ?, ?, ?) ON CONFLICT(google_subject) DO UPDATE SET
        email = excluded.email, last_signed_in_at = excluded.last_signed_in_at`,
        )
        .bind(accountId, identity.subject, identity.email, now, now),
      this.db
        .prepare(
          `INSERT INTO auth_sessions(token_hash, account_id, created_at, expires_at)
        SELECT ?, id, ?, ? FROM accounts WHERE google_subject = ? AND active = 1`,
        )
        .bind(await tokenHash(token), now, expiresAt, identity.subject),
    ];
    if (validToken(previousToken))
      statements.push(
        this.db
          .prepare('DELETE FROM auth_sessions WHERE token_hash = ?')
          .bind(await tokenHash(previousToken)),
      );
    statements.push(this.db.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?').bind(now));
    const results = await this.db.batch(statements);
    if (results[1].meta.changes !== 1) throw new AuthError('forbidden');
    return { token, expiresAt };
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
