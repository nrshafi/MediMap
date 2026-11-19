import { useState } from 'react';
import { ArrowLeft, Navigation } from 'lucide-react';
import type { readComparison } from './comparison.functions';
import { publicRoute } from './catalog.functions';
import { dayHoursLabel, openingStatus } from '../providers/hours';
import { PageShell } from '../../ui/PageShell';
import { ui } from '../../ui/styles';
import { formatBdt, formatKm, formatReviewDate } from './format';
import { StatusBadge } from './ListingCard';

function routeLabel(result: Awaited<ReturnType<typeof publicRoute>> | undefined) {
  if (!result) return 'Not requested yet';
  return result.available && typeof result.roadKm === 'number' && typeof result.minutes === 'number'
    ? `${formatKm(result.roadKm)} · ${Math.round(result.minutes)} minutes`
    : 'Driving estimate unavailable';
}
const linkRow = `${ui.link} inline-flex min-h-touch items-center gap-1`;

export function ComparisonPage({ items }: { items: Awaited<ReturnType<typeof readComparison>> }) {
  const [routes, setRoutes] = useState<Record<string, Awaited<ReturnType<typeof publicRoute>>>>({});
  const [busy, setBusy] = useState(false);
  const maxPrice = Math.max(1, ...items.map((i) => i.listing.price?.amountBdt ?? 0));
  return (
    <PageShell maps>
      <main className={`${ui.page} flex flex-col gap-6`}>
        <div className="flex flex-col gap-2">
          <a className={linkRow} href={`/find?service=${items[0].listing.service.id}`}>
            <ArrowLeft aria-hidden size={16} />
            Change selection
          </a>
          <h1 className={ui.heading1}>Compare {items[0].listing.service.name}</h1>
          <p className={ui.muted}>
            Selected branches only. These charts do not represent area-wide price statistics.
          </p>
        </div>
        <div
          className="overflow-x-auto rounded-md border border-border bg-surface"
          role="region"
          aria-label="Branch comparison table"
          tabIndex={0}
        >
          <table className={`${ui.table} min-w-3xl`}>
            <caption className="p-2 text-left text-sm font-semibold text-muted">
              Same-service branch comparison
            </caption>
            <thead className="bg-surface-sunken text-xs uppercase text-muted">
              <tr>
                <th scope="col">Branch</th>
                <th scope="col">Price</th>
                <th scope="col">Verification</th>
                <th scope="col">Road travel</th>
                <th scope="col">Service rating</th>
                <th scope="col">Hours and contact</th>
              </tr>
            </thead>
            <tbody>
              {items.map(({ listing: l, rating }) => (
                <tr key={l.id}>
                  <th scope="row" className="border-t border-border font-semibold">
                    <a className={ui.link} href={`/branches/${l.branch.id}`}>
                      {l.branch.provider.name}, {l.branch.name}
                    </a>
                  </th>
                  <td className="font-bold">
                    {l.price ? formatBdt(l.price.amountBdt) : 'Unknown'}
                  </td>
                  <td>
                    <div className="flex flex-col items-start gap-1">
                      <StatusBadge price={l.price} />
                      <span>
                        {l.price?.verifiedAt
                          ? `Reviewed ${formatReviewDate(l.price.verifiedAt)}`
                          : 'Unknown review date'}
                      </span>
                      {l.price?.source && (
                        <a className={ui.link} href={l.price.source.url}>
                          Official source
                        </a>
                      )}
                    </div>
                  </td>
                  <td>{routeLabel(routes[l.id])}</td>
                  <td>
                    {rating?.count
                      ? `${rating.mean?.toFixed(2)} / 5 · ${rating.count} reviews`
                      : 'No reviews'}
                  </td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <span>{openingStatus(l.branch.openingHours, new Date())}</span>
                      <span>{l.branch.phone ?? 'Phone unknown'}</span>
                      <span>{l.branch.address}</span>
                      {l.branch.openingHours && (
                        <details>
                          <summary className="flex min-h-touch cursor-pointer items-center font-semibold text-primary">
                            Weekly hours
                          </summary>
                          {Object.entries(l.branch.openingHours.days).map(([day, periods]) => (
                            <p key={day}>
                              {day}: {dayHoursLabel(periods)}
                            </p>
                          ))}
                        </details>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <section aria-label="Driving estimates" className={`${ui.card} flex flex-col gap-2`}>
          <p className={ui.muted}>
            Use your browser location to request driving estimates. Coordinates are sent to Google
            Maps to calculate the route.
          </p>
          <button
            type="button"
            className={`${ui.buttonPrimary} self-start`}
            disabled={busy}
            onClick={() => {
              if (!navigator.geolocation) return;
              setBusy(true);
              navigator.geolocation.getCurrentPosition(
                async (position) => {
                  try {
                    const entries = await Promise.all(
                      items.map(
                        async ({ listing }) =>
                          [
                            listing.id,
                            await publicRoute({
                              data: {
                                listing: listing.id,
                                from: {
                                  latitude: position.coords.latitude,
                                  longitude: position.coords.longitude,
                                },
                              },
                            }),
                          ] as const,
                      ),
                    );
                    setRoutes(Object.fromEntries(entries));
                  } catch {
                    setRoutes(
                      Object.fromEntries(
                        items.map(({ listing }) => [
                          listing.id,
                          {
                            available: false as const,
                            message: 'Route lookup failed. Published prices remain available.',
                          },
                        ]),
                      ),
                    );
                  } finally {
                    setBusy(false);
                  }
                },
                () => {
                  setBusy(false);
                },
                { timeout: 10000 },
              );
            }}
          >
            <Navigation aria-hidden size={16} />
            {busy ? 'Finding estimates…' : 'Get driving estimates from my location'}
          </button>
        </section>
        <section aria-label="Selected branch charts" className="flex flex-col gap-3">
          <h2 className={ui.heading2}>Selected branch charts</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {items.map(({ listing: l, rating }) => {
              const route = routes[l.id];
              return (
                <article key={l.id} className={`${ui.card} flex flex-col gap-3`}>
                  <h3 className={ui.heading3}>
                    {l.branch.provider.name}, {l.branch.name}
                  </h3>
                  <label className="flex flex-col gap-1 text-sm font-semibold">
                    Price {l.price ? formatBdt(l.price.amountBdt) : 'unknown'}
                    {l.price && (
                      <progress
                        className="h-2 w-full appearance-none overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-surface-sunken [&::-webkit-progress-value]:bg-primary"
                        value={l.price.amountBdt}
                        max={maxPrice}
                      />
                    )}
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-semibold">
                    Service rating {rating?.mean?.toFixed(2) ?? 'unavailable'}
                    {rating?.mean != null && (
                      <progress
                        className="h-2 w-full appearance-none overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-surface-sunken [&::-webkit-progress-value]:bg-primary"
                        value={rating.mean}
                        max={5}
                      />
                    )}
                  </label>
                  <p className={ui.muted}>{routeLabel(route)}</p>
                  {route?.available && (
                    <progress
                      className="h-2 w-full appearance-none overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-surface-sunken [&::-webkit-progress-value]:bg-primary"
                      aria-label="Driving minutes"
                      value={route.minutes}
                      max={Math.max(
                        1,
                        ...Object.values(routes).map((r) => (r.available ? r.minutes : 0)),
                      )}
                    />
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </PageShell>
  );
}
