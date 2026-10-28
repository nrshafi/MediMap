import type { BranchService, CatalogResult, Page, Service } from '../catalog/contracts';
import { AdminLayout } from './AdminLayout';
import type { authFailure } from '../authentication/server/access.server';

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

function Listing({ listing }: { listing: BranchService }) {
  const { branch, price, service } = listing;
  return (
    <article className="catalog-record" aria-label={`${service.name} at ${branch.provider.name}`}>
      <div className="catalog-record-heading">
        <div>
          <p className="admin-eyebrow">{service.category.name}</p>
          <h2>{service.name}</h2>
          <p className="admin-muted">Provider label: {listing.providerServiceName}</p>
        </div>
        <div className="catalog-price">
          {price
            ? new Intl.NumberFormat('en-BD', {
                style: 'currency',
                currency: 'BDT',
                maximumFractionDigits: 2,
              }).format(price.amountBdt)
            : 'Price unknown'}
          <span>Standard price</span>
        </div>
      </div>
      <dl className="catalog-fields">
        <div>
          <dt>Hospital and branch</dt>
          <dd>
            {branch.provider.name}
            <br />
            {branch.name}
          </dd>
        </div>
        <div>
          <dt>Address</dt>
          <dd>{branch.address}</dd>
        </div>
        <div>
          <dt>Price status</dt>
          <dd>
            {price?.status === 'verified'
              ? 'Verified on official website'
              : (price?.status ?? 'Unknown')}
          </dd>
        </div>
        <div>
          <dt>Last website review</dt>
          <dd>{dateLabel(price?.verifiedAt ?? null)}</dd>
        </div>
        <div>
          <dt>Tariff effective date</dt>
          <dd>{dateLabel(price?.effectiveDate ?? null)}</dd>
        </div>
        <div>
          <dt>Source updated</dt>
          <dd>{dateLabel(price?.source?.sourceUpdatedDate ?? null)}</dd>
        </div>
        <div>
          <dt>Opening hours</dt>
          <dd>{branch.openingHours ?? 'Unknown'}</dd>
        </div>
        <div>
          <dt>Coordinates</dt>
          <dd>
            {branch.coordinates
              ? `${branch.coordinates.latitude}, ${branch.coordinates.longitude}`
              : 'Unknown'}
          </dd>
        </div>
        <div>
          <dt>Telephone</dt>
          <dd>{branch.phone ?? 'Unknown'}</dd>
        </div>
      </dl>
      <div className="catalog-evidence">
        <h3>Source evidence</h3>
        <p>
          {price?.source ? (
            <a href={price.source.url} target="_blank" rel="noreferrer">
              Official tariff · row {price.sourceRow ?? 'unknown'}
            </a>
          ) : (
            'Price source unknown'
          )}
        </p>
        <p>
          {branch.contactSource ? (
            <a href={branch.contactSource.url} target="_blank" rel="noreferrer">
              Official branch contact page
            </a>
          ) : (
            'Location source unknown'
          )}
        </p>
        <p className="admin-muted">
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
      <div className="admin-title">
        <p className="admin-eyebrow">Source-backed records</p>
        <h1>Catalog inspector</h1>
        <p>
          Inspect published services, branch details, and the evidence behind each current price.
        </p>
      </div>
      <p className="admin-notice">
        Read-only catalog. Use the source links to check the published details.
      </p>
      {!result.ok && ['unauthenticated', 'expired', 'forbidden'].includes(result.code) ? (
        <section className="catalog-state" role="alert">
          <h2>
            {result.code === 'forbidden'
              ? 'Administrator access required'
              : result.code === 'expired'
                ? 'Session expired'
                : 'Sign in to continue'}
          </h2>
          <p>{result.message}</p>
          <a
            href={
              result.code === 'forbidden'
                ? '/account'
                : `/sign-in?returnTo=%2Fadmin%2Fcatalog&reason=${result.code === 'expired' ? 'expired' : 'required'}`
            }
          >
            {result.code === 'forbidden' ? 'Open your account' : 'Sign in with Google'}
          </a>
        </section>
      ) : !result.ok ? (
        <section className="catalog-state" role="alert">
          <h2>
            {result.code === 'invalid_request' ? 'Invalid catalog request' : 'Catalog unavailable'}
          </h2>
          <p>{result.message}</p>
          <a href="/admin/catalog">Reload catalog</a>
        </section>
      ) : (
        <>
          <form className="catalog-filter" method="get" action="/admin/catalog">
            <div>
              <label htmlFor="catalog-service">Canonical service</label>
              <select id="catalog-service" name="service" defaultValue={serviceId}>
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
            <button type="submit">Apply service</button>
          </form>
          {catalogMoreHref && (
            <p>
              <a href={catalogMoreHref}>More services</a>
            </p>
          )}
          {result.data.selectedService && (
            <section className="catalog-state" aria-label="Selected catalog record">
              <h2>Selected canonical service</h2>
              <p>{result.data.selectedService.name}</p>
              <p className="admin-muted">Stable ID: {result.data.selectedService.id}</p>
              <ul>
                {result.data.selectedService.aliases.map((alias) => (
                  <li key={`${alias.language}-${alias.name}`} lang={alias.language}>
                    {alias.name} · {alias.language === 'bn' ? 'Bangla' : 'English'}
                  </li>
                ))}
              </ul>
              {!result.data.selectedService.aliases.length && <p>No active aliases.</p>}
            </section>
          )}
          <p className="admin-muted" role="status">
            {result.data.listings.items.length}{' '}
            {result.data.listings.items.length === 1 ? 'listing' : 'listings'} on this page
          </p>
          {result.data.listings.items.length ? (
            result.data.listings.items.map((listing) => (
              <Listing key={listing.id} listing={listing} />
            ))
          ) : (
            <section className="catalog-state">
              <h2>No published listings</h2>
              <p>No active branch listings match this service.</p>
              <a href="/admin/catalog">Show all services</a>
            </section>
          )}
          {moreHref && (
            <p>
              <a href={moreHref}>More listings</a>
            </p>
          )}
        </>
      )}
    </AdminLayout>
  );
}
