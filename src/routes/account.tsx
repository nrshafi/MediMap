import { createFileRoute } from '@tanstack/react-router';
import { readAccount } from '../features/authentication/auth.functions';
import { AccountView } from '../features/authentication/AccountView';

export const Route = createFileRoute('/account')({
  head: () => ({
    meta: [{ title: 'Your account | MediMap' }, { name: 'robots', content: 'noindex' }],
  }),
  loader: () => readAccount(),
  component: AccountRoute,
});
function AccountRoute() {
  return <AccountView result={Route.useLoaderData()} />;
}
