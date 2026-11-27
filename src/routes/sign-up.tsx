import { createFileRoute } from '@tanstack/react-router';
import { safeReturnTo } from '../features/authentication/contracts';
import { SignUpView } from '../features/authentication/SignUpView';

export const Route = createFileRoute('/sign-up')({
  head: () => ({ meta: [{ title: 'Sign up | MediMap' }, { name: 'robots', content: 'noindex' }] }),
  validateSearch: (input: Record<string, unknown>) => ({
    // Keep the URL short. The default path is not written to it.
    returnTo:
      safeReturnTo(input.returnTo) === '/account' ? undefined : safeReturnTo(input.returnTo),
    error: typeof input.error === 'string' && input.error ? input.error : undefined,
  }),
  component: SignUpRoute,
});

function SignUpRoute() {
  const search = Route.useSearch();
  return <SignUpView returnTo={search.returnTo} error={search.error} />;
}
