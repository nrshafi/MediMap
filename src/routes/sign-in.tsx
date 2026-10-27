import { createFileRoute } from '@tanstack/react-router';
import { readAccount } from '../features/authentication/auth.functions';
import { AccountView } from '../features/authentication/AccountView';
import { safeReturnTo } from '../features/authentication/contracts';

export const Route = createFileRoute('/sign-in')({
  head: () => ({ meta: [{ title: 'Sign in | MediMap' }, { name: 'robots', content: 'noindex' }] }),
  validateSearch: (input: Record<string, unknown>) => ({
    returnTo: safeReturnTo(input.returnTo),
    reason: typeof input.reason === 'string' ? input.reason : '',
  }),
  loader: () => readAccount(),
  component: SignInRoute,
});

function SignInRoute() {
  const search = Route.useSearch();
  return (
    <AccountView result={Route.useLoaderData()} returnTo={search.returnTo} reason={search.reason} />
  );
}
