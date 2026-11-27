import { admin, Notice, Section } from './adminUi';
import { AdminLayout } from './AdminLayout';
import type { AccountPage, AccountRow } from './server/accounts.server';
import { Badge } from '../../ui/Badge';
import { Button, ButtonLink } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { fieldControlStyles } from '../../ui/Field';
import { PageHeader } from '../../ui/PageHeader';
import { ui } from '../../ui/styles';

export type AccountSearch = { query?: string; after?: string; result?: string };

export const accountResults: Record<string, { kind: 'info' | 'error'; text: string }> = {
  disabled: { kind: 'info', text: 'The account is disabled. Its sessions are deleted.' },
  enabled: { kind: 'info', text: 'The account is enabled. The user can sign in again.' },
  own_account: { kind: 'error', text: 'You cannot disable your own account.' },
  stale: {
    kind: 'error',
    text: 'The account status changed before this request. Check the list and try again.',
  },
  failed: { kind: 'error', text: 'The change was not saved. Try again later.' },
};

const dhakaTime = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Dhaka',
});

function when(value: number): string {
  return dhakaTime.format(new Date(value));
}

function StatusForm({ account, own }: { account: AccountRow; own: boolean }) {
  if (own) return <p className={admin.hint}>This is your account. You cannot disable it.</p>;
  const disabling = account.active;
  const name = disabling ? 'Disable account' : 'Enable account';
  return (
    <details className="rounded-sm border border-border p-3">
      <summary className="flex min-h-touch cursor-pointer items-center text-small font-semibold text-primary">
        {name}
      </summary>
      <form method="post" action="/admin/accounts/write" className={`${admin.form} mt-3`}>
        <input type="hidden" name="account" value={account.id} />
        <input type="hidden" name="action" value={disabling ? 'disable' : 'enable'} />
        <p className={admin.hint}>
          {disabling
            ? 'The user is signed out on every device and cannot sign in until you enable the account.'
            : 'The user can sign in again with the same method.'}
        </p>
        <label className={ui.label}>
          Reason
          <textarea
            className={admin.textarea}
            name="reason"
            minLength={20}
            maxLength={1000}
            required
          />
        </label>
        <label className={admin.check}>
          <input className={admin.checkbox} type="checkbox" name="confirm" value="yes" required />
          <span>
            {disabling ? 'I confirm that I want to disable ' : 'I confirm that I want to enable '}
            {account.email}.
          </span>
        </label>
        <Button type="submit" variant={disabling ? 'danger' : 'primary'} className="sm:w-fit">
          {name}
        </Button>
      </form>
    </details>
  );
}

function AccountCard({ account, own }: { account: AccountRow; own: boolean }) {
  return (
    <Card as="article" variant="default" className="grid gap-3">
      <h3 className={`${ui.heading3} [overflow-wrap:anywhere]`}>{account.email}</h3>
      <p className="flex flex-wrap items-center gap-2">
        <Badge tone={account.active ? 'verified' : 'error'}>
          {account.active ? 'Active' : 'Disabled'}
        </Badge>
        {account.isAdministrator && <Badge tone="neutral">Administrator</Badge>}
        {own && <Badge tone="neutral">You</Badge>}
      </p>
      <dl className="grid gap-3 sm:grid-cols-3">
        <div>
          <dt className={admin.dt}>Sign-in method</dt>
          <dd className={admin.dd}>{account.methods.join(', ') || 'None'}</dd>
        </div>
        <div>
          <dt className={admin.dt}>Created</dt>
          <dd className={admin.dd}>{when(account.createdAt)}</dd>
        </div>
        <div>
          <dt className={admin.dt}>Last sign-in</dt>
          <dd className={admin.dd}>{when(account.lastSignedInAt)}</dd>
        </div>
      </dl>
      <StatusForm account={account} own={own} />
    </Card>
  );
}

export function AccountManager({
  result,
  search,
}: {
  result: AccountPage & { currentAccountId: string };
  search: AccountSearch;
}) {
  const notice = search.result ? accountResults[search.result] : undefined;
  const more = new URLSearchParams();
  if (search.query) more.set('query', search.query);
  if (result.next) more.set('after', result.next);
  return (
    <AdminLayout activeHref="/admin/accounts">
      <PageHeader
        title="Accounts"
        description="Disable or enable accounts. A disabled account cannot sign in and has no active session. Times use Dhaka time."
      />
      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
      <form method="get" action="/admin/accounts" className={admin.filter}>
        <label className={ui.label}>
          Search by email
          <input
            className={fieldControlStyles}
            type="search"
            name="query"
            maxLength={100}
            defaultValue={search.query ?? ''}
          />
        </label>
        <Button type="submit" variant="secondary">
          Search
        </Button>
        {search.query && (
          <ButtonLink href="/admin/accounts" variant="ghost">
            Clear search
          </ButtonLink>
        )}
      </form>
      <Section id="account-list" title="Accounts">
        {result.accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            own={account.id === result.currentAccountId}
          />
        ))}
        {!result.accounts.length && <p className={ui.muted}>No accounts match.</p>}
        {result.next && (
          <a className={admin.link} href={`/admin/accounts?${more.toString()}`}>
            More accounts
          </a>
        )}
      </Section>
    </AdminLayout>
  );
}
