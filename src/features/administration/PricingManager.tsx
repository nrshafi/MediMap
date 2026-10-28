import { AdminLayout } from './AdminLayout';
import { SourceForm, ListingForm, PriceForm, ClearPriceForm, decimalBdt } from './PricingForms';
import { pricingMessages, pricingHref } from '../pricing/contracts';
import type { readPricing } from '../pricing/operations.server';
import './catalogManager.css';
import './pricingManager.css';

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
      <div className="admin-title">
        <p className="admin-eyebrow">Prices and evidence</p>
        <h1>Manage branch prices</h1>
        <p>
          Maintain diagnostic availability, standard BDT prices, and retained official source
          evidence.
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
                  : 'Pricing unavailable'}
          </h2>
          <p>{result.message}</p>
          <a
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
        </section>
      ) : (
        data && (
          <>
            {feedback && (
              <div className="admin-notice" role={search.code === 'saved' ? 'status' : 'alert'}>
                <p>{feedback}</p>
                {search.code !== 'saved' && <a href={pricingHref()}>Reload prices</a>}
              </div>
            )}
            <p className="admin-notice">
              Price corrections retain history. Unknown prices stay unknown. Disputed prices are
              excluded from default statistics, and prices do not expire by age.
            </p>
            <form method="get" action="/admin/prices" className="catalog-filter">
              <div>
                <label htmlFor="pricing-provider">Provider filter</label>
                <select
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
              <button type="submit">Apply provider</button>
            </form>
            {data.providers.nextCursor && (
              <a
                href={pricingHref({
                  ...search,
                  providerAfter: data.providers.nextCursor,
                  code: undefined,
                })}
              >
                More providers
              </a>
            )}
            <section className="catalog-edit-card" aria-labelledby="price-listings">
              <h2 id="price-listings">Branch-service listings</h2>
              <ul className="pricing-list">
                {data.listings.items.map((item) => (
                  <li key={item.id}>
                    <a href={pricingHref({ listing: item.id })}>
                      {item.serviceName} at {item.providerName}, {item.branchName}
                    </a>
                    <p>
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
                  href={pricingHref({
                    ...search,
                    after: data.listings.nextCursor,
                    code: undefined,
                  })}
                >
                  More listings
                </a>
              )}
            </section>
            {search.listing && !data.selected && <p role="alert">Listing not found.</p>}
            {data.provider && (
              <>
                <section className="catalog-edit-card" aria-labelledby="source-snapshots">
                  <h2 id="source-snapshots">Official source snapshots</h2>
                  {sources.length ? (
                    sources.map((source) => (
                      <article key={source.id} className="pricing-source">
                        <h3>{source.id}</h3>
                        <a href={source.url} target="_blank" rel="noreferrer">
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
                        <p className="admin-muted">
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
                      href={pricingHref({
                        ...search,
                        sourceAfter: data.sources.nextCursor,
                        code: undefined,
                      })}
                    >
                      More sources
                    </a>
                  )}
                </section>
                <section className="catalog-edit-card" aria-labelledby="new-source">
                  <h2 id="new-source">Add source snapshot</h2>
                  <p>
                    Record actual collection details. Create a new snapshot to correct evidence. A
                    URL alone does not establish a verified price.
                  </p>
                  <SourceForm provider={data.provider} />
                </section>
                <section className="catalog-edit-card" aria-labelledby="new-listing">
                  <h2 id="new-listing">Add branch-service listing</h2>
                  <ListingForm branches={data.branches.items} services={data.services.items} />
                  {data.branches.nextCursor && (
                    <a
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
                      href={pricingHref({
                        ...search,
                        serviceAfter: data.services.nextCursor,
                        code: undefined,
                      })}
                    >
                      More canonical services
                    </a>
                  )}
                </section>
              </>
            )}
            {data.selected && (
              <>
                <section className="catalog-edit-card" aria-labelledby="edit-listing">
                  <h2 id="edit-listing">Edit availability</h2>
                  <ListingForm
                    key={`listing-${data.selected.id}-${data.selected.revision}`}
                    existing={data.selected}
                  />
                </section>
                <section className="catalog-edit-card" aria-labelledby="new-price">
                  <h2 id="new-price">New price revision</h2>
                  <p>
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
                  <a href={`/admin/catalog?service=${data.selected.serviceId}`}>
                    Inspect published service
                  </a>
                </section>
                <section className="catalog-edit-card" aria-labelledby="clear-price">
                  <h2 id="clear-price">Unknown current price</h2>
                  <ClearPriceForm listing={data.selected} />
                </section>
                <section className="catalog-edit-card" aria-labelledby="price-history">
                  <h2 id="price-history">Retained price revisions</h2>
                  {data.history.items.map((price) => (
                    <article
                      key={price.id}
                      className="pricing-source"
                      aria-label={`Price revision ${price.id}`}
                    >
                      <h3>
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
                      href={pricingHref({
                        ...search,
                        historyAfter: data.history.nextCursor,
                        code: undefined,
                      })}
                    >
                      More price revisions
                    </a>
                  )}
                </section>
              </>
            )}
          </>
        )
      )}
    </AdminLayout>
  );
}
