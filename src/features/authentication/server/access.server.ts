import { AuthError } from '../contracts';
import { readAuthCookie } from './cookies.server';
import { AuthStore } from './store.server';

export async function requireUser(request: Request, db: D1Database) {
  const session = await new AuthStore(db).session(readAuthCookie(request, 'session'));
  if (session.status !== 'authenticated')
    throw new AuthError(session.status === 'expired' ? 'expired' : 'unauthenticated');
  return session;
}

export async function requireAdministrator(request: Request, db: D1Database) {
  const session = await requireUser(request, db);
  if (!session.user.isAdministrator) throw new AuthError('forbidden');
  return session;
}

export function authFailure(error: unknown) {
  const failure = error instanceof AuthError ? error : new AuthError('unavailable');
  return { ok: false, code: failure.code, message: failure.message } as const;
}
