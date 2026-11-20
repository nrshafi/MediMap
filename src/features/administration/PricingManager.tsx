import { AdminLayout } from './AdminLayout';
import { SourceForm, ListingForm, PriceForm, ClearPriceForm, decimalBdt } from './PricingForms';
import { pricingMessages, pricingHref } from '../pricing/contracts';
import type { readPricing } from '../pricing/operations.server';
import { admin, Notice, Section, StateCard } from './adminUi';
import { ui } from '../../ui/styles';
import { PageHeader } from '../../ui/PageHeader';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { fieldControlStyles } from '../../ui/Field';

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
      <PageHeader
        title="Manage branch prices"
        description="Maintain diagnostic availability, standard BDT prices, and retained official source evidence."
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
              <Notice
                kind={search.code === 'saved' ? 'info' : 'error'}
                role={search.code === 'saved' ? 'status' : 'alert'}
              >
                <p>{feedback}</p>
                {search.code !== 'saved' && (
                  <a className={admin.link} href={pricingHref()}>
                    Reload prices
                  </a>
                )}
              </Notice>
            )}
            <Notice kind="info" role="none">
              Price corrections retain history. Unknown prices stay unknown. Disputed prices are
              excluded from default statistics, and prices do not expire by age.
            </Notice>
            <form method="get" action="/admin/prices" className={admin.filter}>
              <div className="grid min-w-0 flex-1 gap-1 sm:max-w-md">
                <label className="text-small font-semibold text-ink" htmlFor="pricing-provider">
                  Provider filter
                </label>
                <select
                  className={fieldControlStyles}
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
              <Button type="submit">Apply provider</Button>
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
              {data.listings.items.length ? (
                <div
                  className="min-w-0 max-h-96 overflow-auto rounded-sm border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  tabIndex={0}
                  role="region"
                  aria-label="Branch-service listings table"
                >
                  <table className={`${ui.table} min-w-[640px]`}>
                    <thead className="sticky top-0 z-10 border-b border-border bg-surface">
                      <tr>
                        <th scope="col" className="p-2 font-semibold text-ink">
                          Listing
                        </th>
                        <th scope="col" className="p-2 font-semibold text-ink">
                          Availability
                        </th>
                        <th scope="col" className="p-2 font-semibold text-ink text-right">
                          Standard price
                        </th>
                        <th scope="col" className="p-2 font-semibold text-ink text-right">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.listings.items.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-primary-soft/40 transition-colors duration-fast"
                        >
                          <td className="p-2">
                            <a className={admin.link} href={pricingHref({ listing: item.id })}>
                              {item.serviceName} at {item.providerName}, {item.branchName}
                            </a>
                          </td>
                          <td className="p-2">
                            <Badge tone={item.active ? 'verified' : 'neutral'}>
                              {item.active ? 'Active listing' : 'Inactive listing'}
                            </Badge>
                          </td>
                          <td className="p-2 text-right tabular-nums font-semibold text-ink">
                            {item.price
                              ? `BDT ${decimalBdt(item.price.amountMinor)}`
                              : 'Price unknown'}
                          </td>
                          <td className="p-2 text-right">
                            {item.price ? (
                              <Badge
                                tone={
                                  item.price.status === 'verified'
                                    ? 'verified'
                                    : item.price.status === 'disputed'
                                      ? 'disputed'
                                      : 'neutral'
                                }
                              >
                                {item.price.status}
                              </Badge>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No listings on this page.</p>
              )}
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
            {search.listing && !data.selected && (
              <Notice kind="error" role="alert">
                Listing not found.
              </Notice>
            )}
            {data.provider && (
              <>
                <Section id="source-snapshots" title="Official source snapshots">
                  {sources.length ? (
                    sources.map((source) => (
                      <Card
                        as="article"
                        variant="default"
                        key={source.id}
                        className="grid gap-1 bg-surface-sunken p-4 text-small"
                      >
                        <h3 className={ui.heading3}>{source.id}</h3>
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
                      </Card>
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
                  <p className="text-small">
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
                  <p className="text-small">
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
                    <Card
                      as="article"
                      variant="default"
                      key={price.id}
                      className="grid gap-1 bg-surface-sunken p-4 text-small"
                      aria-label={`Price revision ${price.id}`}
                    >
                      <h3 className={ui.heading3}>
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
                    </Card>
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
