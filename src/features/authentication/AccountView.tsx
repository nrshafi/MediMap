import type { readAccount } from './auth.functions';
import { safeReturnTo } from './contracts';
import './account.css';

export type AccountData = Awaited<ReturnType<typeof readAccount>>;
const reasons: Record<string, string> = {
  required: 'Sign in to continue.',
  expired: 'Your session has expired. Sign in again.',
  failed: 'Google sign-in did not complete. Try again.',
  'signed-out': 'You are signed out.',
  unavailable: 'Google sign-in is unavailable. Try again later.',
};

export function AccountView({
  result,
  returnTo = '/account',
  reason = '',
}: {
  result: AccountData;
  returnTo?: string;
  reason?: string;
}) {
  const session = result.ok ? result.session : null;
  const signedIn = session?.status === 'authenticated' ? session : null;
  const message = !result.ok
    ? 'Your account is unavailable. Try again later.'
    : session?.status === 'expired'
      ? reasons.expired
      : Object.hasOwn(reasons, reason)
        ? reasons[reason]
        : undefined;
  return (
    <div className="account-page">
      <header>
        <a href="/" className="account-brand">
          MediMap
        </a>
        <a href="/discovery">Browse services</a>
      </header>
      <main className="account-panel">
        <p className="account-eyebrow">Your MediMap account</p>
        <h1>{signedIn ? 'Your account' : 'Sign in'}</h1>
        <p className="account-description">
          Browse services without an account. Use Google to sign in for account features.
        </p>
        {message && (
          <p className="account-message" role="status">
            {message}
          </p>
        )}
        {signedIn ? (
          <>
            <dl>
              <div>
                <dt>Signed in as</dt>
                <dd>{signedIn.user.email}</dd>
              </div>
              <div>
                <dt>Account access</dt>
                <dd>{signedIn.user.isAdministrator ? 'Administrator' : 'Member'}</dd>
              </div>
              <div>
                <dt>Session ends</dt>
                <dd>
                  {new Intl.DateTimeFormat('en-GB', {
                    dateStyle: 'long',
                    timeStyle: 'short',
                    timeZone: 'Asia/Dhaka',
                  }).format(new Date(signedIn.expiresAt))}{' '}
                  · Dhaka time
                </dd>
              </div>
            </dl>
            <p>Sessions last seven days. Sign in again after this session ends.</p>
            {signedIn.user.isAdministrator && (
              <a
                className="account-action"
                href={
                  safeReturnTo(returnTo) === '/account' ? '/admin/catalog' : safeReturnTo(returnTo)
                }
              >
                Open administration
              </a>
            )}
            <form method="post" action="/auth/sign-out">
              <button type="submit">Sign out</button>
            </form>
          </>
        ) : (
          <>
            {result.ok && !result.signInAvailable && (
              <p className="account-message" role="status">
                Google sign-in is not configured yet. Public browsing is available.
              </p>
            )}
            <form method="post" action="/auth/google/start">
              <input type="hidden" name="returnTo" value={safeReturnTo(returnTo)} />
              <button type="submit" disabled={!result.ok || !result.signInAvailable}>
                Sign in with Google
              </button>
            </form>
            <p className="account-note">
              MediMap requests your Google account identity and verified email address. Signing in
              does not grant administrator access.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
