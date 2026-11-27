import type { readAccount } from './auth.functions';
import { safeReturnTo } from './contracts';
import { LogIn, LogOut, MapPin, ShieldCheck } from 'lucide-react';
import { SiteFooter, SiteHeader } from '../../ui/SiteChrome';
import { Button, ButtonLink } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Notice } from '../../ui/Notice';

export type AccountData = Awaited<ReturnType<typeof readAccount>>;
const reasons: Record<string, string> = {
  required: 'Sign in to continue.',
  expired: 'Your session has expired. Sign in again.',
  failed: 'Google sign-in did not complete. Try again.',
  email_in_use: 'This email already has an account. Sign in with the existing method.',
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
        className="mx-auto flex w-full max-w-md flex-1 items-center justify-center px-4 py-8 sm:py-12"
      >
        {signedIn ? (
          <Card variant="default" className="grid w-full gap-4 p-6">
            <div>
              <h1 className="font-display text-h1 font-bold text-ink">Your account</h1>
              <p className="mt-2 text-small leading-relaxed text-muted">
                Manage your MediMap session and account access.
              </p>
            </div>
            {message && (
              <Notice kind={reason === 'signed-out' ? 'info' : 'warning'}>{message}</Notice>
            )}
            <dl className="grid gap-3 rounded-sm bg-surface-sunken p-3">
              <div>
                <dt className="text-label font-semibold text-muted">Signed in as</dt>
                <dd className="mt-0.5 text-small font-semibold [overflow-wrap:anywhere]">
                  {signedIn.user.email}
                </dd>
              </div>
              <div>
                <dt className="text-label font-semibold text-muted">Account access</dt>
                <dd className="mt-0.5 text-small font-semibold">
                  {signedIn.user.isAdministrator ? 'Administrator' : 'Member'}
                </dd>
              </div>
              {/* Sign-in method row (step 16 will expand this) */}
              <div>
                <dt className="text-label font-semibold text-muted">Sign-in method</dt>
                <dd className="mt-0.5 text-small font-semibold">Google</dd>
              </div>
              <div>
                <dt className="text-label font-semibold text-muted">Session ends</dt>
                <dd className="mt-0.5 text-small font-semibold">
                  {new Intl.DateTimeFormat('en-GB', {
                    dateStyle: 'long',
                    timeStyle: 'short',
                    timeZone: 'Asia/Dhaka',
                  }).format(new Date(signedIn.expiresAt))}{' '}
                  · Dhaka time
                </dd>
              </div>
            </dl>
            {/* Change password section slot for step 16 */}
            <div id="change-password-slot">
              {/* Step 16: nrshafi adds change password section here */}
            </div>
            <p className="text-small text-muted">
              Sessions last seven days. Sign in again after this session ends.
            </p>
            {signedIn.user.isAdministrator && (
              <ButtonLink
                variant="primary"
                href={
                  safeReturnTo(returnTo) === '/account' ? '/admin/catalog' : safeReturnTo(returnTo)
                }
                icon={<ShieldCheck aria-hidden size={18} />}
                className="w-full"
              >
                Open administration
              </ButtonLink>
            )}
            <form method="post" action="/auth/sign-out" className="grid">
              <Button
                type="submit"
                variant="secondary"
                icon={<LogOut aria-hidden size={18} />}
                className="w-full"
              >
                Sign out
              </Button>
            </form>
          </Card>
        ) : (
          <Card variant="default" className="grid w-full gap-4 p-6">
            <div className="flex justify-center" aria-hidden="true">
              <span className="inline-flex items-center gap-2 font-display text-h3 font-bold text-ink">
                <MapPin size={22} className="text-primary" />
                MediMap
              </span>
            </div>
            <div>
              <h1 className="text-center font-display text-h1 font-bold text-ink">Sign in</h1>
              <p className="mt-2 text-center text-small leading-relaxed text-muted">
                Browse services without an account, or sign in to access account features.
              </p>
            </div>
            {message && (
              <Notice kind={reason === 'signed-out' ? 'info' : 'warning'}>{message}</Notice>
            )}
            {result.ok && !result.signInAvailable && (
              <Notice kind="info">
                Google sign-in is not configured yet. Public browsing is available.
              </Notice>
            )}
            <form method="post" action="/auth/google/start" className="grid">
              <input type="hidden" name="returnTo" value={safeReturnTo(returnTo)} />
              <Button
                type="submit"
                variant="primary"
                disabled={!result.ok || !result.signInAvailable}
                icon={<LogIn aria-hidden size={18} />}
                className="w-full"
              >
                Sign in with Google
              </Button>
            </form>
            {/* Marked slot for second sign-in method (step 16 adds email and password form here) */}
            <div className="group/second-auth">
              <div className="hidden group-has-[[data-slot=second-auth]:not(:empty)]:flex items-center gap-3 my-4 text-small text-muted before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                <span>or</span>
              </div>
              <div data-slot="second-auth">
                {/* Step 16: nrshafi adds email and password form here */}
              </div>
            </div>
            <p className="text-center text-small text-muted">
              MediMap requests your Google account identity and verified email address. Signing in
              does not grant administrator access.
            </p>
          </Card>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
