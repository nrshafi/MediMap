import { MapPin } from 'lucide-react';
import { SiteFooter, SiteHeader } from '../../ui/SiteChrome';
import { Card } from '../../ui/Card';
import { Link } from '../../ui/Link';
import { safeReturnTo } from './contracts';
import { SignUpForm } from './PasswordForms';

export function signInLink(returnTo: string): string {
  const target = safeReturnTo(returnTo);
  return target === '/account'
    ? '/sign-in'
    : `/sign-in?${new URLSearchParams({ returnTo: target })}`;
}

export function SignUpView({
  returnTo = '/account',
  error,
}: {
  returnTo?: string;
  error?: string;
}) {
  const target = safeReturnTo(returnTo);
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-md flex-1 items-center justify-center px-4 py-8 sm:py-12"
      >
        <Card variant="default" className="grid w-full gap-4 p-6">
          <div className="flex justify-center" aria-hidden="true">
            <span className="inline-flex items-center gap-2 font-display text-h3 font-bold text-ink">
              <MapPin size={22} className="text-primary" />
              MediMap
            </span>
          </div>
          <div>
            <h1 className="text-center font-display text-h1 font-bold text-ink">
              Create an account
            </h1>
            <p className="mt-2 text-center text-small leading-relaxed text-muted">
              Use an email and a password. Creating an account does not grant administrator access.
            </p>
          </div>
          <SignUpForm returnTo={target} error={error} />
          <p className="text-center text-small text-muted">
            Already have an account?{' '}
            <Link href={signInLink(target)} className="font-semibold text-primary underline">
              Sign in
            </Link>
          </p>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
