import { AdminLayout } from './AdminLayout';
import { SourceForm, ListingForm, PriceForm, ClearPriceForm, decimalBdt } from './PricingForms';
import { pricingMessages, pricingHref } from '../pricing/contracts';
import type { readPricing } from '../pricing/operations.server';
import { admin, Notice, PageTitle, Section, StateCard } from './adminUi';
import { ui } from '../../ui/styles';

export function PricingManager({
  result,
  search,
}: {
  result: Awaited<ReturnType<typeof readPricing>>;
  search: Record<string, string | undefined>;
}) {
  const data = result.ok ? result.data : null;
  const sources = data ? [...data.sources.items] : [];
  if (data?.selectedSource && !sources.some((source) => source.id === data.selectedSource?.id))
    sources.push(data.selectedSource);
  const feedback = Object.hasOwn(pricingMessages, search.code ?? '')
    ? Object.entries(pricingMessages).find(([key]) => key === search.code)?.[1]
    : undefined;
  return (
    <AdminLayout activeHref="/admin/prices">
      <PageTitle eyebrow="Prices and evidence" title="Manage branch prices">
        Maintain diagnostic availability, standard BDT prices, and retained official source
        evidence.
      </PageTitle>
      {!result.ok ? (
        <StateCard
          title={
            result.code === 'forbidden'
              ? 'Administrator access required'
              : result.code === 'expired'
                ? 'Session expired'
                : result.code === 'unauthenticated'
                  ? 'Sign in to continue'
                  : 'Pricing unavailable'
          }
        >
          <p>{result.message}</p>
          <a
            className={admin.link}
            href={
              ['unauthenticated', 'expired'].includes(result.code)
                ? '/sign-in?returnTo=%2Fadmin%2Fprices'
                : result.code === 'forbidden'
                  ? '/account'
                  : pricingHref()
            }
          >
            {['unauthenticated', 'expired'].includes(result.code)
              ? 'Sign in with Google'
              : result.code === 'forbidden'
                ? 'Open your account'
                : 'Reload prices'}
          </a>
        </StateCard>
      ) : (
        data && (
          <>
            {feedback && (
              <Notice role={search.code === 'saved' ? 'status' : 'alert'}>
                <p>{feedback}</p>
                {search.code !== 'saved' && (
                  <a className={admin.link} href={pricingHref()}>
                    Reload prices
                  </a>
                )}
              </Notice>
            )}
            <Notice>
              Price corrections retain history. Unknown prices stay unknown. Disputed prices are
              excluded from default statistics, and prices do not expire by age.
            </Notice>
            <form method="get" action="/admin/prices" className={admin.filter}>
              <div className="grid min-w-0 flex-1 gap-1 sm:max-w-md">
                <label className="text-sm font-semibold text-ink" htmlFor="pricing-provider">
                  Provider filter
                </label>
                <select
                  className={admin.input}
                  id="pricing-provider"
                  name="provider"
                  defaultValue={data.provider?.id ?? ''}
                >
                  <option value="">All providers</option>
                  {data.provider &&
                    !data.providers.items.some((item) => item.id === data.provider?.id) && (
                      <option value={data.provider.id}>{data.provider.name}</option>
                    )}
                  {data.providers.items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <button className={ui.buttonPrimary} type="submit">
                Apply provider
              </button>
            </form>
            {data.providers.nextCursor && (
              <a
                className={admin.link}
                href={pricingHref({
                  ...search,
                  providerAfter: data.providers.nextCursor,
                  code: undefined,
                })}
              >
                More providers
              </a>
            )}
            <Section id="price-listings" title="Branch-service listings">
              <ul className={admin.list}>
                {data.listings.items.map((item) => (
                  <li key={item.id} className="py-1">
                    <a className={admin.link} href={pricingHref({ listing: item.id })}>
                      {item.serviceName} at {item.providerName}, {item.branchName}
                    </a>
                    <p className="text-sm text-muted">
                      {item.active ? 'Active listing' : 'Inactive listing'} ·{' '}
                      {item.price
                        ? `BDT ${decimalBdt(item.price.amountMinor)} · ${item.price.status}`
                        : 'Price unknown'}
                    </p>
                  </li>
                ))}
              </ul>
              {!data.listings.items.length && <p>No listings on this page.</p>}
              {data.listings.nextCursor && (
                <a
                  className={admin.link}
                  href={pricingHref({
                    ...search,
                    after: data.listings.nextCursor,
                    code: undefined,
                  })}
                >
                  More listings
                </a>
              )}
            </Section>
            {search.listing && !data.selected && <Notice role="alert">Listing not found.</Notice>}
            {data.provider && (
              <>
                <Section id="source-snapshots" title="Official source snapshots">
                  {sources.length ? (
                    sources.map((source) => (
                      <article
                        key={source.id}
                        className="grid gap-1 rounded-sm border border-border bg-surface-sunken p-4 text-sm"
                      >
                        <h3 className="text-base font-bold text-ink">{source.id}</h3>
                        <a
                          className={admin.link}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open official source
                        </a>
                        <p>
                          {source.kind === 'official_tariff'
                            ? 'Official tariff'
                            : 'Official contact page'}{' '}
                          · {source.currencyEvidence ?? 'Currency evidence unknown'}
                        </p>
                        <p>
                          Collected: {source.retrievedAt}
                          <br />
                          Collector: {source.collector ?? 'Unknown'}
                          <br />
                          Website update: {source.sourceUpdatedDate ?? 'Unknown'}
                        </p>
                        <p className={admin.hint}>
                          SHA-256: <code>{source.sha256}</code>
                        </p>
                        {source.notes && <p>{source.notes}</p>}
                      </article>
                    ))
                  ) : (
                    <p>No source snapshots on this page.</p>
                  )}
                  {data.sources.nextCursor && (
                    <a
                      className={admin.link}
                      href={pricingHref({
                        ...search,
                        sourceAfter: data.sources.nextCursor,
                        code: undefined,
                      })}
                    >
                      More sources
                    </a>
                  )}
                </Section>
                <Section id="new-source" title="Add source snapshot">
                  <p className="text-sm">
                    Record actual collection details. Create a new snapshot to correct evidence. A
                    URL alone does not establish a verified price.
                  </p>
                  <SourceForm provider={data.provider} />
                </Section>
                <Section id="new-listing" title="Add branch-service listing">
                  <ListingForm branches={data.branches.items} services={data.services.items} />
                  {data.branches.nextCursor && (
                    <a
                      className={admin.link}
                      href={pricingHref({
                        ...search,
                        branchAfter: data.branches.nextCursor,
                        code: undefined,
                      })}
                    >
                      More branches
                    </a>
                  )}
                  {data.services.nextCursor && (
                    <a
                      className={admin.link}
                      href={pricingHref({
                        ...search,
                        serviceAfter: data.services.nextCursor,
                        code: undefined,
                      })}
                    >
                      More canonical services
                    </a>
                  )}
                </Section>
              </>
            )}
            {data.selected && (
              <>
                <Section id="edit-listing" title="Edit availability">
                  <ListingForm
                    key={`listing-${data.selected.id}-${data.selected.revision}`}
                    existing={data.selected}
                  />
                </Section>
                <Section id="new-price" title="New price revision">
                  <p className="text-sm">
                    {data.selected.serviceName} at {data.selected.branchName}.{' '}
                    {data.selected.price
                      ? `Current price: BDT ${decimalBdt(data.selected.price.amountMinor)} · ${data.selected.price.status}`
                      : 'Current price unknown.'}
                  </p>
                  <PriceForm
                    key={`price-${data.selected.id}-${data.selected.revision}`}
                    listing={data.selected}
                    sources={sources}
                  />
                  <a
                    className={admin.link}
                    href={`/admin/catalog?service=${data.selected.serviceId}`}
                  >
                    Inspect published service
                  </a>
                </Section>
                <Section id="clear-price" title="Unknown current price">
                  <ClearPriceForm listing={data.selected} />
                </Section>
                <Section id="price-history" title="Retained price revisions">
                  {data.history.items.map((price) => (
                    <article
                      key={price.id}
                      className="grid gap-1 rounded-sm border border-border bg-surface-sunken p-4 text-sm"
                      aria-label={`Price revision ${price.id}`}
                    >
                      <h3 className="text-base font-bold text-ink">
                        BDT {decimalBdt(price.amountMinor)} · {price.status}
                      </h3>
                      <p>
                        {price.id === data.selected?.currentPriceId
                          ? 'Current revision'
                          : 'Retained revision'}{' '}
                        · {price.id}
                      </p>
                      <p>
                        Created: {price.createdAt}
                        <br />
                        Last website review: {price.verifiedAt ?? 'Unknown'}
                        <br />
                        Tariff effective date: {price.effectiveDate ?? 'Unknown'}
                        <br />
                        Source ID: {price.sourceId ?? 'Unknown'} · row{' '}
                        {price.sourceRow ?? 'unknown'}
                      </p>
                      {price.notes && <p>{price.notes}</p>}
                    </article>
                  ))}
                  {!data.history.items.length && <p>No retained prices yet.</p>}
                  {data.history.nextCursor && (
                    <a
                      className={admin.link}
                      href={pricingHref({
                        ...search,
                        historyAfter: data.history.nextCursor,
                        code: undefined,
                      })}
                    >
                      More price revisions
                    </a>
                  )}
                </Section>
              </>
            )}
          </>
        )
      )}
    </AdminLayout>
  );
}
