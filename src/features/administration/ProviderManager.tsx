import { AdminLayout } from './AdminLayout';
import { ProviderForm, BranchForm } from './ProviderForms';
import { providerMessages, providersHref } from '../providers/contracts';
import type { readProviders } from '../providers/operations.server';
import { admin, ActiveBadge, Notice, Section, StateCard } from './adminUi';
import { PageHeader } from '../../ui/PageHeader';

export function ProviderManager({
  result,
  search,
}: {
  result: Awaited<ReturnType<typeof readProviders>>;
  search: Record<string, string | undefined>;
}) {
  const data = result.ok ? result.data : null;
  const sources = data ? [...data.sources.items] : [];
  if (data?.selectedSource && !sources.some((source) => source.id === data.selectedSource?.id))
    sources.push(data.selectedSource);
  const message = Object.hasOwn(providerMessages, search.code ?? '')
    ? Object.entries(providerMessages).find(([key]) => key === search.code)?.[1]
    : undefined;
  return (
    <AdminLayout activeHref="/admin/providers">
      <PageHeader
        title="Manage providers and branches"
        description="Keep provider identity separate from each branch. Record known contacts, coordinates, and usual weekly hours."
      />
      {!result.ok ? (
        <StateCard
          title={
            result.code === 'forbidden'
              ? 'Administrator access required'
              : result.code === 'expired'
                ? 'Session expired'
                : result.code === 'unauthenticated'
                  ? 'Sign in to continue'
                  : 'Provider data unavailable'
          }
        >
          <p>{result.message}</p>
          <a
            className={admin.link}
            href={
              ['unauthenticated', 'expired'].includes(result.code)
                ? '/sign-in?returnTo=%2Fadmin%2Fproviders'
                : result.code === 'forbidden'
                  ? '/account'
                  : providersHref()
            }
          >
            {' '}
            {['unauthenticated', 'expired'].includes(result.code)
              ? 'Sign in with Google'
              : result.code === 'forbidden'
                ? 'Open your account'
                : 'Reload providers'}
          </a>
        </StateCard>
      ) : (
        data && (
          <>
            {message && (
              <Notice
                kind={search.code === 'saved' ? 'info' : 'error'}
                role={search.code === 'saved' ? 'status' : 'alert'}
              >
                <p>{message}</p>
                {search.code !== 'saved' && (
                  <a className={admin.link} href={providersHref()}>
                    Reload providers
                  </a>
                )}
              </Notice>
            )}
            <Notice kind="info" role="none">
              Deactivation hides a provider or branch from public reads and keeps its listing and
              price history. Blank fields remain unknown.
            </Notice>
            <Section id="add-provider" title="Add provider">
              <ProviderForm />
            </Section>
            <div className={admin.twoColumns}>
              <Section id="providers" title="Providers">
                <ul className={admin.list}>
                  {data.providers.items.map((provider) => (
                    <li key={provider.id} className={admin.listRow}>
                      <a className={admin.link} href={providersHref({ provider: provider.id })}>
                        {provider.name}
                      </a>
                      <ActiveBadge active={provider.active} />
                    </li>
                  ))}
                </ul>
                {!data.providers.items.length && <p>No providers on this page.</p>}
                {data.providers.nextCursor && (
                  <a
                    className={admin.link}
                    href={providersHref({
                      ...search,
                      providerAfter: data.providers.nextCursor,
                      code: undefined,
                    })}
                  >
                    More providers
                  </a>
                )}
              </Section>
              <Section id="branches" title="Branches">
                <ul className={admin.list}>
                  {data.branches.items.map((branch) => (
                    <li key={branch.id} className={admin.listRow}>
                      <a
                        className={admin.link}
                        href={providersHref({ provider: branch.providerId, branch: branch.id })}
                      >
                        {branch.name}
                      </a>
                      <ActiveBadge active={branch.active} />
                    </li>
                  ))}
                </ul>
                {!data.branches.items.length && <p>No branches on this page.</p>}
                <a className={admin.link} href={providersHref()}>
                  Show all providers and branches
                </a>
                {data.branches.nextCursor && (
                  <a
                    className={admin.link}
                    href={providersHref({
                      ...search,
                      after: data.branches.nextCursor,
                      code: undefined,
                    })}
                  >
                    More branches
                  </a>
                )}
              </Section>
            </div>
            {search.provider && !data.provider && (
              <Notice kind="error" role="alert">
                Provider not found.
              </Notice>
            )}
            {search.branch && !data.branch && (
              <Notice kind="error" role="alert">
                Branch not found.
              </Notice>
            )}
            {data.provider && (
              <>
                <Section id="edit-provider" title="Edit provider">
                  <ProviderForm
                    key={`${data.provider.id}-${data.provider.revision}`}
                    existing={data.provider}
                  />
                </Section>
                <Section id="contact-sources" title="Official contact sources">
                  <p>
                    Check the selected source before publishing a branch. Source retrieval alone
                    does not verify a coordinate, telephone number, or schedule.
                  </p>
                  {sources.length ? (
                    <ul className="grid gap-1 text-small">
                      {sources.map((source) => (
                        <li key={source.id} className={admin.listRow}>
                          <a
                            className={admin.link}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {source.id}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>
                      No official contact source is available for this provider. Keep new branches
                      inactive.
                    </p>
                  )}
                  {data.sources.nextCursor && (
                    <a
                      className={admin.link}
                      href={providersHref({
                        ...search,
                        sourceAfter: data.sources.nextCursor,
                        code: undefined,
                      })}
                    >
                      More contact sources
                    </a>
                  )}
                </Section>
                <Section id="add-branch" title="Add branch">
                  <BranchForm provider={data.provider} sources={sources} />
                </Section>
              </>
            )}
            {data.provider && data.branch && (
              <Section id="edit-branch" title="Edit branch">
                <BranchForm
                  key={`${data.branch.id}-${data.branch.revision}`}
                  provider={data.provider}
                  existing={data.branch}
                  sources={sources}
                />
                <a className={admin.link} href="/admin/catalog">
                  Open catalog inspector
                </a>
              </Section>
            )}
          </>
        )
      )}
    </AdminLayout>
  );
}
