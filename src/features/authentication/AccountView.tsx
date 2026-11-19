import type { readAccount } from './auth.functions';
import { safeReturnTo } from './contracts';
import { LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { SiteFooter, SiteHeader } from '../../ui/SiteChrome';
import { ui } from '../../ui/styles';

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
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main
        id="main-content"
        className="mx-auto grid w-full max-w-md flex-1 content-start gap-5 px-4 py-8 sm:py-12"
      >
        <section className={`${ui.card} grid gap-4 p-6`}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Your MediMap account
            </p>
            <h1 className={`${ui.heading1} mt-1`}>{signedIn ? 'Your account' : 'Sign in'}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Browse services without an account. Use Google to sign in for account features.
            </p>
          </div>
          {message && (
            <p className={ui.notice} role="status">
              {message}
            </p>
          )}
          {signedIn ? (
            <>
              <dl className="grid gap-3 rounded-sm bg-surface-sunken p-3">
                <div>
                  <dt className="text-xs font-semibold text-muted">Signed in as</dt>
                  <dd className="mt-0.5 text-sm font-semibold [overflow-wrap:anywhere]">
                    {signedIn.user.email}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted">Account access</dt>
                  <dd className="mt-0.5 text-sm font-semibold">
                    {signedIn.user.isAdministrator ? 'Administrator' : 'Member'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted">Session ends</dt>
                  <dd className="mt-0.5 text-sm font-semibold">
                    {new Intl.DateTimeFormat('en-GB', {
                      dateStyle: 'long',
                      timeStyle: 'short',
                      timeZone: 'Asia/Dhaka',
                    }).format(new Date(signedIn.expiresAt))}{' '}
                    · Dhaka time
                  </dd>
                </div>
              </dl>
              <p className="text-sm text-muted">
                Sessions last seven days. Sign in again after this session ends.
              </p>
              {signedIn.user.isAdministrator && (
                <a
                  className={ui.buttonPrimary}
                  href={
                    safeReturnTo(returnTo) === '/account'
                      ? '/admin/catalog'
                      : safeReturnTo(returnTo)
                  }
                >
                  <ShieldCheck aria-hidden size={18} />
                  Open administration
                </a>
              )}
              <form method="post" action="/auth/sign-out" className="grid">
                <button className={ui.buttonSecondary} type="submit">
                  <LogOut aria-hidden size={18} />
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              {result.ok && !result.signInAvailable && (
                <p className={ui.notice} role="status">
                  Google sign-in is not configured yet. Public browsing is available.
                </p>
              )}
              <form method="post" action="/auth/google/start" className="grid">
                <input type="hidden" name="returnTo" value={safeReturnTo(returnTo)} />
                <button
                  className={ui.buttonPrimary}
                  type="submit"
                  disabled={!result.ok || !result.signInAvailable}
                >
                  <LogIn aria-hidden size={18} />
                  Sign in with Google
                </button>
              </form>
              <p className="text-sm text-muted">
                MediMap requests your Google account identity and verified email address. Signing in
                does not grant administrator access.
              </p>
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
