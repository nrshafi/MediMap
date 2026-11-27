import { createFileRoute } from '@tanstack/react-router';
import { readAccounts } from '../features/administration/accounts.functions';
import { AccountManager } from '../features/administration/AccountManager';
import { SiteFooter, SiteHeader } from '../ui/SiteChrome';
import { ui } from '../ui/styles';
import { ButtonLink } from '../ui/Button';

export const Route = createFileRoute('/admin/accounts')({
  head: () => ({
    meta: [{ title: 'Accounts | MediMap' }, { name: 'robots', content: 'noindex' }],
  }),
  validateSearch: (input: Record<string, unknown>) => ({
    query: typeof input.query === 'string' && input.query ? input.query : undefined,
    after: typeof input.after === 'string' && input.after ? input.after : undefined,
    result: typeof input.result === 'string' && input.result ? input.result : undefined,
  }),
  loaderDeps: ({ search }) => ({ query: search.query, after: search.after }),
  loader: ({ deps }) => readAccounts({ data: deps }),
  component: AccountRoute,
  errorComponent: () => (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main
        id="main-content"
        className="mx-auto grid w-full max-w-3xl flex-1 content-start gap-4 px-4 py-8"
      >
        <h1 className={ui.heading1}>Accounts unavailable</h1>
        <p className="text-small text-muted">
          Sign in with administrator access, or try again later.
        </p>
        <ButtonLink className="w-fit" href="/sign-in">
          Sign in
        </ButtonLink>
      </main>
      <SiteFooter />
    </div>
  ),
});

function AccountRoute() {
  return <AccountManager result={Route.useLoaderData()} search={Route.useSearch()} />;
}
