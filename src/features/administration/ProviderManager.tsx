import { AdminLayout } from './AdminLayout';
import { ProviderForm, BranchForm } from './ProviderForms';
import { providerMessages, providersHref } from '../providers/contracts';
import type { readProviders } from '../providers/operations.server';
import './catalogManager.css';
import './providerManager.css';

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
      <div className="admin-title">
        <p className="admin-eyebrow">Provider administration</p>
        <h1>Manage providers and branches</h1>
        <p>
          Keep provider identity separate from each branch. Record known contacts, coordinates, and
          usual weekly hours.
        </p>
      </div>
      {!result.ok ? (
        <section className="catalog-state" role="alert">
          <h2>
            {result.code === 'forbidden'
              ? 'Administrator access required'
              : result.code === 'expired'
                ? 'Session expired'
                : result.code === 'unauthenticated'
                  ? 'Sign in to continue'
                  : 'Provider data unavailable'}
          </h2>
          <p>{result.message}</p>
          <a
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
        </section>
      ) : (
        data && (
          <>
            {message && (
              <div className="admin-notice" role={search.code === 'saved' ? 'status' : 'alert'}>
                <p>{message}</p>
                {search.code !== 'saved' && <a href={providersHref()}>Reload providers</a>}
              </div>
            )}
            <p className="admin-notice">
              Deactivation hides a provider or branch from public reads and keeps its listing and
              price history. Blank fields remain unknown.
            </p>
            <section className="catalog-edit-card" aria-labelledby="add-provider">
              <h2 id="add-provider">Add provider</h2>
              <ProviderForm />
            </section>
            <div className="catalog-management-grid">
              <section className="catalog-edit-card" aria-labelledby="providers">
                <h2 id="providers">Providers</h2>
                <ul className="catalog-management-list">
                  {data.providers.items.map((provider) => (
                    <li key={provider.id}>
                      <a href={providersHref({ provider: provider.id })}>{provider.name}</a>
                      <span>{provider.active ? 'Active' : 'Inactive'}</span>
                    </li>
                  ))}
                </ul>
                {!data.providers.items.length && <p>No providers on this page.</p>}
                {data.providers.nextCursor && (
                  <a
                    href={providersHref({
                      ...search,
                      providerAfter: data.providers.nextCursor,
                      code: undefined,
                    })}
                  >
                    More providers
                  </a>
                )}
              </section>
              <section className="catalog-edit-card" aria-labelledby="branches">
                <h2 id="branches">Branches</h2>
                <ul className="catalog-management-list">
                  {data.branches.items.map((branch) => (
                    <li key={branch.id}>
                      <a href={providersHref({ provider: branch.providerId, branch: branch.id })}>
                        {branch.name}
                      </a>
                      <span>{branch.active ? 'Active' : 'Inactive'}</span>
                    </li>
                  ))}
                </ul>
                {!data.branches.items.length && <p>No branches on this page.</p>}
                <a href={providersHref()}>Show all providers and branches</a>
                {data.branches.nextCursor && (
                  <a
                    href={providersHref({
                      ...search,
                      after: data.branches.nextCursor,
                      code: undefined,
                    })}
                  >
                    More branches
                  </a>
                )}
              </section>
            </div>
            {search.provider && !data.provider && <p role="alert">Provider not found.</p>}
            {search.branch && !data.branch && <p role="alert">Branch not found.</p>}
            {data.provider && (
              <>
                <section className="catalog-edit-card" aria-labelledby="edit-provider">
                  <h2 id="edit-provider">Edit provider</h2>
                  <ProviderForm
                    key={`${data.provider.id}-${data.provider.revision}`}
                    existing={data.provider}
                  />
                </section>
                <section className="catalog-edit-card" aria-labelledby="contact-sources">
                  <h2 id="contact-sources">Official contact sources</h2>
                  <p>
                    Check the selected source before publishing a branch. Source retrieval alone
                    does not verify a coordinate, telephone number, or schedule.
                  </p>
                  {sources.length ? (
                    <ul>
                      {sources.map((source) => (
                        <li key={source.id}>
                          <a href={source.url} target="_blank" rel="noreferrer">
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
                      href={providersHref({
                        ...search,
                        sourceAfter: data.sources.nextCursor,
                        code: undefined,
                      })}
                    >
                      More contact sources
                    </a>
                  )}
                </section>
                <section className="catalog-edit-card" aria-labelledby="add-branch">
                  <h2 id="add-branch">Add branch</h2>
                  <BranchForm provider={data.provider} sources={sources} />
                </section>
              </>
            )}
            {data.provider && data.branch && (
              <section className="catalog-edit-card" aria-labelledby="edit-branch">
                <h2 id="edit-branch">Edit branch</h2>
                <BranchForm
                  key={`${data.branch.id}-${data.branch.revision}`}
                  provider={data.provider}
                  existing={data.branch}
                  sources={sources}
                />
                <a href="/admin/catalog">Open catalog inspector</a>
              </section>
            )}
          </>
        )
      )}
    </AdminLayout>
  );
}
