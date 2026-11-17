import type { ReactNode } from 'react';
import type { BranchService, CatalogResult, Page, Service } from '../catalog/contracts';
import { AdminLayout } from './AdminLayout';
import { admin, Notice, PageTitle, StateCard } from './adminUi';
import type { authFailure } from '../authentication/server/access.server';
import { dayHoursLabel, weekDays } from '../providers/hours';
import { statusBadge, ui } from '../../ui/styles';

export type InspectorData = {
  catalog: Page<Service>;
  listings: Page<BranchService>;
  selectedService: Service | null;
};

function dateLabel(value: string | null) {
  return value === null
    ? 'Unknown'
    : new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'Asia/Dhaka' }).format(
        new Date(value),
      );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className={admin.dt}>{label}</dt>
      <dd className={admin.dd}>{children}</dd>
    </div>
  );
}

function Listing({ listing }: { listing: BranchService }) {
  const { branch, price, service } = listing;
  return (
    <article className={admin.record} aria-label={`${service.name} at ${branch.provider.name}`}>
      <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {service.category.name}
          </p>
          <h2 className={`${ui.heading2} mt-1`}>{service.name}</h2>
          <p className={`${ui.muted} mt-1`}>Provider label: {listing.providerServiceName}</p>
        </div>
        <div className="catalog-price shrink-0 text-xl font-bold tabular-nums text-ink sm:text-right">
          {price
            ? new Intl.NumberFormat('en-BD', {
                style: 'currency',
                currency: 'BDT',
                maximumFractionDigits: 2,
              }).format(price.amountBdt)
            : 'Price unknown'}
          <span className="block text-xs font-normal text-muted">Standard price</span>
        </div>
      </div>
      <dl className="grid gap-x-8 gap-y-4 p-5 sm:grid-cols-2">
        <Fact label="Hospital and branch">
          {branch.provider.name}
          <br />
          {branch.name}
        </Fact>
        <Fact label="Address">{branch.address}</Fact>
        <Fact label="Price status">
          <span className={statusBadge[price?.status ?? 'unknown'] ?? statusBadge.unknown}>
            {price?.status === 'verified'
              ? 'Verified on official website'
              : (price?.status ?? 'Unknown')}
          </span>
        </Fact>
        <Fact label="Last website review">{dateLabel(price?.verifiedAt ?? null)}</Fact>
        <Fact label="Tariff effective date">{dateLabel(price?.effectiveDate ?? null)}</Fact>
        <Fact label="Source updated">{dateLabel(price?.source?.sourceUpdatedDate ?? null)}</Fact>
        <Fact label="Opening hours">
          {branch.openingHours ? (
            <>
              <p>Usual weekly hours · Asia/Dhaka</p>
              <ul className="mt-1">
                {weekDays.map((day) => (
                  <li key={day}>
                    {day}: {dayHoursLabel(branch.openingHours?.days[day] ?? null)}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            'Unknown'
          )}
        </Fact>
        <Fact label="Coordinates">
          {branch.coordinates
            ? `${branch.coordinates.latitude}, ${branch.coordinates.longitude}`
            : 'Unknown'}
        </Fact>
        <Fact label="Telephone">{branch.phone ?? 'Unknown'}</Fact>
        {branch.alternativePhone && (
          <Fact label="Alternative telephone">{branch.alternativePhone}</Fact>
        )}
        {branch.website && (
          <Fact label="Branch website">
            <a className={ui.link} href={branch.website} rel="noreferrer" target="_blank">
              Open branch website
            </a>
          </Fact>
        )}
        {branch.provider.website && (
          <Fact label="Provider website">
            <a className={ui.link} href={branch.provider.website} rel="noreferrer" target="_blank">
              Open provider website
            </a>
          </Fact>
        )}
        {branch.provider.phone && <Fact label="Provider telephone">{branch.provider.phone}</Fact>}
      </dl>
      <div className="grid gap-1 border-t border-border bg-surface-sunken p-5">
        <h3 className="text-sm font-bold text-ink">Source evidence</h3>
        <p className="text-sm">
          {price?.source ? (
            <a className={ui.link} href={price.source.url} target="_blank" rel="noreferrer">
              Official tariff · row {price.sourceRow ?? 'unknown'}
            </a>
          ) : (
            'Price source unknown'
          )}
        </p>
        <p className="text-sm">
          {branch.contactSource ? (
            <a className={ui.link} href={branch.contactSource.url} target="_blank" rel="noreferrer">
              Official branch contact page
            </a>
          ) : (
            'Location source unknown'
          )}
        </p>
        <p className={ui.muted}>
          Website review checks the published tariff. Contact the hospital to confirm the price and
          availability.
        </p>
      </div>
    </article>
  );
}

export function CatalogInspector({
  result,
  serviceId,
  moreHref,
  catalogMoreHref,
}: {
  result: CatalogResult<InspectorData> | ReturnType<typeof authFailure>;
  serviceId: string;
  moreHref?: string;
  catalogMoreHref?: string;
}) {
  return (
    <AdminLayout activeHref="/admin/catalog">
      <PageTitle eyebrow="Source-backed records" title="Catalog inspector">
        Inspect published services, branch details, and the evidence behind each current price.
      </PageTitle>
      <Notice>Read-only catalog. Use the source links to check the published details.</Notice>
      {!result.ok && ['unauthenticated', 'expired', 'forbidden'].includes(result.code) ? (
        <StateCard
          title={
            result.code === 'forbidden'
              ? 'Administrator access required'
              : result.code === 'expired'
                ? 'Session expired'
                : 'Sign in to continue'
          }
        >
          <p>{result.message}</p>
          <a
            className={admin.link}
            href={
              result.code === 'forbidden'
                ? '/account'
                : `/sign-in?returnTo=%2Fadmin%2Fcatalog&reason=${result.code === 'expired' ? 'expired' : 'required'}`
            }
          >
            {result.code === 'forbidden' ? 'Open your account' : 'Sign in with Google'}
          </a>
        </StateCard>
      ) : !result.ok ? (
        <StateCard
          title={
            result.code === 'invalid_request' ? 'Invalid catalog request' : 'Catalog unavailable'
          }
        >
          <p>{result.message}</p>
          <a className={admin.link} href="/admin/catalog">
            Reload catalog
          </a>
        </StateCard>
      ) : (
        <>
          <form className={admin.filter} method="get" action="/admin/catalog">
            <div className="grid min-w-0 flex-1 gap-1 sm:max-w-md">
              <label className="text-sm font-semibold text-ink" htmlFor="catalog-service">
                Canonical service
              </label>
              <select
                className={admin.input}
                id="catalog-service"
                name="service"
                defaultValue={serviceId}
              >
                <option value="">All services</option>
                {result.data.selectedService &&
                  !result.data.catalog.items.some(
                    (item) => item.id === result.data.selectedService?.id,
                  ) && (
                    <option value={result.data.selectedService.id}>
                      {result.data.selectedService.name}
                    </option>
                  )}
                {serviceId && !result.data.selectedService && (
                  <option value={serviceId}>Unknown service</option>
                )}
                {result.data.catalog.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <button className={ui.buttonPrimary} type="submit">
              Apply service
            </button>
          </form>
          {catalogMoreHref && (
            <p>
              <a className={admin.link} href={catalogMoreHref}>
                More services
              </a>
            </p>
          )}
          {result.data.selectedService && (
            <StateCard title="Selected canonical service" label="Selected catalog record">
              <p>{result.data.selectedService.name}</p>
              <p className={ui.muted}>Stable ID: {result.data.selectedService.id}</p>
              <ul className="list-inside list-disc text-sm">
                {result.data.selectedService.aliases.map((alias) => (
                  <li key={`${alias.language}-${alias.name}`} lang={alias.language}>
                    {alias.name} · {alias.language === 'bn' ? 'Bangla' : 'English'}
                  </li>
                ))}
              </ul>
              {!result.data.selectedService.aliases.length && <p>No active aliases.</p>}
            </StateCard>
          )}
          <p className={ui.muted} role="status">
            {result.data.listings.items.length}{' '}
            {result.data.listings.items.length === 1 ? 'listing' : 'listings'} on this page
          </p>
          {result.data.listings.items.length ? (
            result.data.listings.items.map((listing) => (
              <Listing key={listing.id} listing={listing} />
            ))
          ) : (
            <StateCard title="No published listings" plain>
              <p>No active branch listings match this service.</p>
              <a className={admin.link} href="/admin/catalog">
                Show all services
              </a>
            </StateCard>
          )}
          {moreHref && (
            <p>
              <a className={admin.link} href={moreHref}>
                More listings
              </a>
            </p>
          )}
        </>
      )}
    </AdminLayout>
  );
}
