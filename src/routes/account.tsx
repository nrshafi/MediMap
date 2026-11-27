import { createFileRoute } from '@tanstack/react-router';
import { readAccount } from '../features/authentication/auth.functions';
import { AccountView } from '../features/authentication/AccountView';

export const Route = createFileRoute('/account')({
  head: () => ({
    meta: [{ title: 'Your account | MediMap' }, { name: 'robots', content: 'noindex' }],
  }),
  validateSearch: (input: Record<string, unknown>) => ({
    error: typeof input.error === 'string' && input.error ? input.error : undefined,
    changed: input.changed === 1 || input.changed === '1' ? 1 : undefined,
  }),
  loader: () => readAccount(),
  component: AccountRoute,
});
function AccountRoute() {
  const search = Route.useSearch();
  return (
    <AccountView
      result={Route.useLoaderData()}
      error={search.error}
      changed={search.changed === 1}
    />
  );
}
