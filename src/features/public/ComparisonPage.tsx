import { useState } from 'react';
import type { readComparison } from './comparison.functions';
import { publicRoute } from './catalog.functions';
import { dayHoursLabel, openingStatus } from '../providers/hours';
import './public.css';
function routeLabel(result: Awaited<ReturnType<typeof publicRoute>> | undefined) {
  return result?.available &&
    typeof result.roadKm === 'number' &&
    typeof result.minutes === 'number'
    ? `${result.roadKm.toFixed(1)} km · ${Math.round(result.minutes)} minutes`
    : 'Driving estimate unavailable';
}
export function ComparisonPage({ items }: { items: Awaited<ReturnType<typeof readComparison>> }) {
  const [routes, setRoutes] = useState<Record<string, Awaited<ReturnType<typeof publicRoute>>>>({});
  const [busy, setBusy] = useState(false);
  const maxPrice = Math.max(1, ...items.map((i) => i.listing.price?.amountBdt ?? 0));
  return (
    <main className="public-page">
      <a href={`/find?service=${items[0].listing.service.id}`}>Change selection</a>
      <h1>Compare {items[0].listing.service.name}</h1>
      <p>Selected branches only. These charts do not represent area-wide price statistics.</p>
      <div className="table-scroll">
        <table>
          <caption>Same-service branch comparison</caption>
          <thead>
            <tr>
              <th>Branch</th>
              <th>Price</th>
              <th>Verification</th>
              <th>Road travel</th>
              <th>Service rating</th>
              <th>Hours and contact</th>
            </tr>
          </thead>
          <tbody>
            {items.map(({ listing: l, rating }) => (
              <tr key={l.id}>
                <th>
                  <a href={`/branches/${l.branch.id}`}>
                    {l.branch.provider.name}, {l.branch.name}
                  </a>
                </th>
                <td>{l.price ? `BDT ${l.price.amountBdt.toFixed(2)}` : 'Unknown'}</td>
                <td>
                  {l.price?.status ?? 'Unknown'}
                  <br />
                  {l.price?.verifiedAt ?? 'Unknown review date'}
                  {l.price?.source && <a href={l.price.source.url}>Official source</a>}
                </td>
                <td>{routeLabel(routes[l.id])}</td>
                <td>
                  {rating?.count
                    ? `${rating.mean?.toFixed(2)} / 5 · ${rating.count} reviews`
                    : 'No reviews'}
                </td>
                <td>
                  {openingStatus(l.branch.openingHours, new Date())}
                  <br />
                  {l.branch.phone ?? 'Phone unknown'}
                  <br />
                  {l.branch.address}
                  {l.branch.openingHours && (
                    <details>
                      <summary>Weekly hours</summary>
                      {Object.entries(l.branch.openingHours.days).map(([day, periods]) => (
                        <p key={day}>
                          {day}: {dayHoursLabel(periods)}
                        </p>
                      ))}
                    </details>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Use your browser location to request driving estimates. Coordinates are sent to the routing
        provider.
      </p>
      <button
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
                setRoutes({});
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
      </button>
      <section aria-label="Selected branch charts">
        <h2>Selected branch charts</h2>
        {items.map(({ listing: l, rating }) => (
          <article key={l.id}>
            <h3>
              {l.branch.provider.name}, {l.branch.name}
            </h3>
            <label>
              Price {l.price ? `BDT ${l.price.amountBdt.toFixed(2)}` : 'unknown'}
              {l.price && <progress value={l.price.amountBdt} max={maxPrice} />}
            </label>
            <label>
              Service rating {rating?.mean?.toFixed(2) ?? 'unavailable'}
              {rating?.mean != null && <progress value={rating.mean} max={5} />}
            </label>
            <p>{routeLabel(routes[l.id])}</p>
            {routes[l.id]?.available && (
              <progress
                aria-label="Driving minutes"
                value={routes[l.id].minutes}
                max={Math.max(
                  1,
                  ...Object.values(routes).map((r) => (r.available ? r.minutes : 0)),
                )}
              />
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
