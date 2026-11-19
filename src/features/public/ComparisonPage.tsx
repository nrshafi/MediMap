import { useState } from 'react';
import { ArrowLeft, Navigation } from 'lucide-react';
import type { readComparison } from './comparison.functions';
import { publicRoute } from './catalog.functions';
import { dayHoursLabel, openingStatus } from '../providers/hours';
import { PageShell } from '../../ui/PageShell';
import { PageHeader } from '../../ui/PageHeader';
import { Card } from '../../ui/Card';
import { Button, ButtonLink } from '../../ui/Button';
import { ui } from '../../ui/styles';
import { formatBdt, formatKm, formatReviewDate } from './format';
import { StatusBadge } from '../../ui/Badge';

function routeLabel(result: Awaited<ReturnType<typeof publicRoute>> | undefined) {
  if (!result) return 'Not requested yet';
  return result.available && typeof result.roadKm === 'number' && typeof result.minutes === 'number'
    ? `${formatKm(result.roadKm)} · ${Math.round(result.minutes)} minutes`
    : 'Driving estimate unavailable';
}

export function ComparisonPage({ items }: { items: Awaited<ReturnType<typeof readComparison>> }) {
  const [routes, setRoutes] = useState<Record<string, Awaited<ReturnType<typeof publicRoute>>>>({});
  const [busy, setBusy] = useState(false);
  const maxPrice = Math.max(1, ...items.map((i) => i.listing.price?.amountBdt ?? 0));

  return (
    <PageShell>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
        <PageHeader
          title={`Compare ${items[0].listing.service.name}`}
          description="Selected branches only. These charts do not represent area-wide price statistics."
          actions={
            <ButtonLink
              variant="secondary"
              href={`/find?service=${items[0].listing.service.id}`}
              icon={<ArrowLeft aria-hidden size={16} />}
            >
              Change selection
            </ButtonLink>
          }
        />

        <div
          className="w-full max-w-full overflow-x-auto rounded-md border border-border bg-surface"
          role="region"
          aria-label="Branch comparison table"
        >
          <table className={`${ui.table} min-w-[700px]`}>
            <caption className="p-3 text-left text-small font-semibold text-muted">
              Same-service branch comparison
            </caption>
            <thead className="bg-surface-sunken text-label uppercase text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-semibold">
                  Branch
                </th>
                <th scope="col" className="px-3 py-2 text-left font-semibold">
                  Price
                </th>
                <th scope="col" className="px-3 py-2 text-left font-semibold">
                  Verification
                </th>
                <th scope="col" className="px-3 py-2 text-left font-semibold">
                  Road travel
                </th>
                <th scope="col" className="px-3 py-2 text-left font-semibold">
                  Service rating
                </th>
                <th scope="col" className="px-3 py-2 text-left font-semibold">
                  Hours and contact
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-small text-ink">
              {items.map(({ listing: l, rating }) => (
                <tr key={l.id}>
                  <th scope="row" className="px-3 py-3 text-left font-semibold">
                    <a
                      className="font-semibold text-primary hover:underline"
                      href={`/branches/${l.branch.id}`}
                    >
                      {l.branch.provider.name}, {l.branch.name}
                    </a>
                  </th>
                  <td className="px-3 py-3">
                    <span className="font-bold text-price tabular-nums text-ink">
                      {l.price ? formatBdt(l.price.amountBdt) : 'Unknown'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <StatusBadge price={l.price} />
                      <span className="text-small text-muted">
                        {l.price?.verifiedAt
                          ? `Reviewed ${formatReviewDate(l.price.verifiedAt)}`
                          : 'Unknown review date'}
                      </span>
                      {l.price?.source && (
                        <a
                          className="inline-flex min-h-touch items-center text-small font-medium text-primary hover:underline"
                          href={l.price.source.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Official source
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-small">{routeLabel(routes[l.id])}</td>
                  <td className="px-3 py-3 text-small">
                    {rating?.count
                      ? `${rating.mean?.toFixed(2)} / 5 · ${rating.count} reviews`
                      : 'No reviews'}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1 text-small">
                      <span className="font-medium text-ink">
                        {openingStatus(l.branch.openingHours, new Date())}
                      </span>
                      <span className="text-muted">{l.branch.phone ?? 'Phone unknown'}</span>
                      <span className="text-muted">{l.branch.address}</span>
                      {l.branch.openingHours && (
                        <details className="mt-1">
                          <summary className="flex min-h-touch cursor-pointer items-center font-semibold text-primary">
                            Weekly hours
                          </summary>
                          <div className="mt-1 space-y-0.5 text-muted">
                            {Object.entries(l.branch.openingHours.days).map(([day, periods]) => (
                              <p key={day}>
                                <span className="font-medium text-ink">{day}:</span>{' '}
                                {dayHoursLabel(periods)}
                              </p>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Card as="section" aria-label="Driving estimates" className="flex flex-col gap-3">
          <h2 className="font-display text-h2 font-bold text-ink">Driving estimates</h2>
          <p className="text-small text-muted">
            Use your browser location to request driving estimates. Coordinates are sent to Google
            Maps to calculate the route.
          </p>
          <Button
            type="button"
            variant="primary"
            pending={busy}
            disabled={busy}
            icon={<Navigation aria-hidden size={16} />}
            className="self-start"
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
            {busy ? 'Finding estimates…' : 'Get driving estimates from my location'}
          </Button>
        </Card>

        <section aria-label="Selected branch charts" className="flex flex-col gap-4">
          <h2 className="font-display text-h2 font-bold text-ink">Selected branch charts</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {items.map(({ listing: l, rating }) => {
              const route = routes[l.id];
              return (
                <Card as="article" key={l.id} className="flex flex-col gap-3">
                  <h3 className="font-display text-h3 font-semibold text-ink">
                    {l.branch.provider.name}, {l.branch.name}
                  </h3>
                  <label className="flex flex-col gap-1 text-small font-semibold text-ink">
                    Price {l.price ? formatBdt(l.price.amountBdt) : 'unknown'}
                    {l.price && (
                      <progress
                        className="h-2 w-full appearance-none overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-surface-sunken [&::-webkit-progress-value]:bg-primary"
                        value={l.price.amountBdt}
                        max={maxPrice}
                      />
                    )}
                  </label>
                  <label className="flex flex-col gap-1 text-small font-semibold text-ink">
                    Service rating {rating?.mean?.toFixed(2) ?? 'unavailable'}
                    {rating?.mean != null && (
                      <progress
                        className="h-2 w-full appearance-none overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-surface-sunken [&::-webkit-progress-value]:bg-primary"
                        value={rating.mean}
                        max={5}
                      />
                    )}
                  </label>
                  <p className="text-small text-muted">{routeLabel(route)}</p>
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
                </Card>
              );
            })}
          </div>
        </section>
      </main>
    </PageShell>
  );
}
