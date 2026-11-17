import { useState } from 'react';
import { ClientOnly } from '@tanstack/react-router';
import { ExternalLink, Map as MapIcon, Phone } from 'lucide-react';
import { PageShell } from '../../ui/PageShell';
import { ui } from '../../ui/styles';
import { dayHoursLabel, openingStatus } from '../providers/hours';
import { AreaStatistics } from './AreaStatistics';
import type { publicDetail } from './details.functions';
import { directionsUrl } from './format';
import { GoogleMapView, MapPlaceholder, MapUnavailable } from './GoogleMapView';
import { ListingCard } from './ListingCard';

const linkRow = `${ui.link} inline-flex min-h-touch items-center gap-1`;

function BranchMap({
  browserKey,
  coordinates,
  name,
}: {
  browserKey: string | null;
  coordinates: { latitude: number; longitude: number };
  name: string;
}) {
  const [shown, setShown] = useState(false);
  if (!shown)
    return (
      <button type="button" className={ui.buttonSecondary} onClick={() => setShown(true)}>
        <MapIcon aria-hidden size={16} />
        Show on map
      </button>
    );
  return (
    <div className="h-72 overflow-hidden rounded-md border border-border bg-surface-sunken">
      {browserKey === null ? (
        <MapUnavailable />
      ) : (
        <ClientOnly fallback={<MapPlaceholder />}>
          <GoogleMapView
            apiKey={browserKey}
            center={coordinates}
            showUser={false}
            pins={[{ id: 'branch', name, label: name, coordinates }]}
          />
        </ClientOnly>
      )}
    </div>
  );
}

export function DetailPage({
  data,
  area = { lat: 23.8103, lng: 90.4125, radius: 3 },
  browserKey = null,
}: {
  data: Awaited<ReturnType<typeof publicDetail>>;
  area?: { lat: number; lng: number; radius: number };
  browserKey?: string | null;
}) {
  const entity = data.entity;
  if (!entity)
    return (
      <PageShell>
        <main className={`${ui.page} flex flex-col gap-3`}>
          <h1 className={ui.heading1}>Record not found</h1>
          <p className={ui.muted}>This record is unavailable or inactive.</p>
          <a className={linkRow} href="/find">
            Browse services
          </a>
        </main>
      </PageShell>
    );
  const isBranch = 'address' in entity;
  return (
    <PageShell maps={isBranch}>
      <main className={`${ui.page} flex flex-col gap-6`}>
        <div className="flex flex-col gap-2">
          <a className={linkRow} href="/find">
            Browse services
          </a>
          <h1 className={ui.heading1}>{entity.name}</h1>
          {'aliases' in entity && (
            <div className={`${ui.muted} flex flex-col gap-1`}>
              <p>Category: {entity.category.name}</p>
              <p>
                Also known as:{' '}
                {entity.aliases.length
                  ? entity.aliases.map((a) => a.name).join(', ')
                  : 'No published aliases'}
              </p>
            </div>
          )}
          {data.branchRating && (
            <p className={ui.muted}>
              Branch rating across services: {data.branchRating.mean?.toFixed(2) ?? 'No ratings'} ·{' '}
              {data.branchRating.count} reviews.
            </p>
          )}
          {data.providerRating && (
            <p className={ui.muted}>
              Provider rating across branches and services:{' '}
              {data.providerRating.mean?.toFixed(2) ?? 'No ratings'} · {data.providerRating.count}{' '}
              reviews. These are separate from individual service ratings.
            </p>
          )}
        </div>

        {isBranch && (
          <section aria-label="Branch information" className={`${ui.card} flex flex-col gap-3`}>
            <p>{entity.address}</p>
            {entity.coordinates ? (
              <BranchMap
                browserKey={browserKey}
                coordinates={entity.coordinates}
                name={entity.name}
              />
            ) : (
              <p className={ui.notice}>Map location unavailable. Branch coordinates are unknown.</p>
            )}
            <p className={ui.muted}>Provider: {entity.provider.name}</p>
            <div className="flex flex-wrap gap-x-4">
              {entity.phone ? (
                <a className={linkRow} href={`tel:${entity.phone}`}>
                  <Phone aria-hidden size={16} />
                  Call {entity.phone}
                </a>
              ) : (
                <p className={`${ui.muted} flex min-h-touch items-center`}>Telephone unknown</p>
              )}
              {entity.website && (
                <a className={linkRow} href={entity.website} target="_blank" rel="noreferrer">
                  Provider website
                  <ExternalLink aria-hidden size={14} />
                </a>
              )}
            </div>
            {entity.openingHours ? (
              <details>
                <summary className="flex min-h-touch cursor-pointer items-center text-sm font-semibold text-primary">
                  Opening hours: weekly schedule
                </summary>
                <ul className="text-sm">
                  {Object.entries(entity.openingHours.days).map(([day, hours]) => (
                    <li key={day}>
                      {day}: {dayHoursLabel(hours)}
                    </li>
                  ))}
                </ul>
              </details>
            ) : (
              <p className="text-sm">Opening hours: Unknown</p>
            )}
            <p className="text-sm">
              Current opening status in Dhaka: {openingStatus(entity.openingHours, new Date())}
            </p>
            <div className="flex flex-wrap gap-x-4">
              <a className={linkRow} href={directionsUrl(entity)} target="_blank" rel="noreferrer">
                Get directions to this address
                <ExternalLink aria-hidden size={14} />
              </a>
              <a className={linkRow} href={`/report?target=branch&id=${entity.id}`}>
                Report branch information
              </a>
            </div>
          </section>
        )}

        {data.kind === 'service' && (
          <a
            className={`${ui.buttonPrimary} self-start`}
            href={`/find?${new URLSearchParams({ service: entity.id, lat: String(area.lat), lng: String(area.lng), radius: String(area.radius) })}`}
          >
            Find this service near a location
          </a>
        )}

        <section aria-label="Published services and prices" className="flex flex-col gap-3">
          <h2 className={ui.heading2}>Published services and prices</h2>
          {data.kind === 'service' && (
            <>
              <p className={ui.muted}>
                Selected area: {area.radius} km from {area.lat.toFixed(4)}, {area.lng.toFixed(4)}.
                Choose another location through service discovery.
              </p>
              <AreaStatistics
                listings={data.listings}
                center={{ latitude: area.lat, longitude: area.lng }}
                radius={area.radius}
              />
            </>
          )}
          {data.listings.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {data.listings.map((l) => (
                <ListingCard key={l.id} listing={l} area={area} />
              ))}
            </div>
          ) : (
            <p className={ui.notice}>No active published listings.</p>
          )}
        </section>
      </main>
    </PageShell>
  );
}
