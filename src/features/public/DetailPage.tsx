import { useState } from 'react';
import { ClientOnly } from '@tanstack/react-router';
import { ArrowLeft, ExternalLink, Map as MapIcon, Phone } from 'lucide-react';
import { PageShell } from '../../ui/PageShell';
import { PageHeader } from '../../ui/PageHeader';
import { Card } from '../../ui/Card';
import { Button, ButtonLink } from '../../ui/Button';
import { Notice } from '../../ui/Notice';
import { EmptyState } from '../../ui/EmptyState';
import { dayHoursLabel, openingStatus } from '../providers/hours';
import { AreaStatistics } from './AreaStatistics';
import type { publicDetail } from './details.functions';
import { directionsUrl } from './format';
import { GoogleMapView, MapPlaceholder, MapUnavailable } from './GoogleMapView';
import { ListingCard } from './ListingCard';

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
      <Button
        type="button"
        variant="secondary"
        icon={<MapIcon aria-hidden size={16} />}
        onClick={() => setShown(true)}
      >
        Show on map
      </Button>
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
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
          <EmptyState
            title="Record not found"
            description="This record is unavailable or inactive."
            action={
              <ButtonLink href="/find" variant="primary">
                Browse services
              </ButtonLink>
            }
          />
        </main>
      </PageShell>
    );

  const isBranch = 'address' in entity;

  return (
    <PageShell>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
        {'category' in entity ? (
          <PageHeader
            title={entity.name}
            description={
              <div className="flex flex-col gap-1 text-small text-muted">
                <p>Category: {entity.category.name}</p>
                <p>
                  Also known as:{' '}
                  {entity.aliases.length
                    ? entity.aliases.map((a) => a.name).join(', ')
                    : 'No published aliases'}
                </p>
              </div>
            }
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <ButtonLink
                  variant="primary"
                  href={`/find?${new URLSearchParams({ service: entity.id, lat: String(area.lat), lng: String(area.lng), radius: String(area.radius) })}`}
                >
                  Find this service near a location
                </ButtonLink>
                <ButtonLink variant="secondary" href="/find">
                  Browse services
                </ButtonLink>
              </div>
            }
          />
        ) : (
          <PageHeader
            title={entity.name}
            description={
              <div className="flex flex-col gap-1 text-small text-muted">
                <p>Provider: {entity.provider.name}</p>
                {data.branchRating && (
                  <p>
                    Branch rating across services:{' '}
                    {data.branchRating.mean?.toFixed(2) ?? 'No ratings'} · {data.branchRating.count}{' '}
                    reviews.
                  </p>
                )}
                {data.providerRating && (
                  <p>
                    Provider rating across branches and services:{' '}
                    {data.providerRating.mean?.toFixed(2) ?? 'No ratings'} ·{' '}
                    {data.providerRating.count} reviews. These are separate from individual service
                    ratings.
                  </p>
                )}
              </div>
            }
            actions={
              <ButtonLink
                variant="secondary"
                href="/find"
                icon={<ArrowLeft aria-hidden size={16} />}
              >
                Browse services
              </ButtonLink>
            }
          />
        )}

        {isBranch && (
          <Card as="section" aria-label="Branch information" className="flex flex-col gap-4">
            <h2 className="font-display text-h2 font-bold text-ink">Contact and opening hours</h2>
            <p className="text-body font-medium text-ink">{entity.address}</p>
            {entity.coordinates ? (
              <BranchMap
                browserKey={browserKey}
                coordinates={entity.coordinates}
                name={entity.name}
              />
            ) : (
              <Notice kind="info">Map location unavailable. Branch coordinates are unknown.</Notice>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {entity.phone ? (
                <a
                  className="inline-flex min-h-touch items-center gap-1.5 text-small font-medium text-primary hover:underline"
                  href={`tel:${entity.phone}`}
                >
                  <Phone aria-hidden size={16} />
                  Call {entity.phone}
                </a>
              ) : (
                <p className="flex min-h-touch items-center text-small text-muted">
                  Telephone unknown
                </p>
              )}
              {entity.website && (
                <a
                  className="inline-flex min-h-touch items-center gap-1.5 text-small font-medium text-primary hover:underline"
                  href={entity.website}
                  target="_blank"
                  rel="noreferrer"
                >
                  Provider website
                  <ExternalLink aria-hidden size={14} />
                </a>
              )}
            </div>
            {entity.openingHours ? (
              <details className="rounded-sm border border-border p-3">
                <summary className="flex min-h-touch cursor-pointer items-center text-small font-semibold text-primary">
                  Opening hours: weekly schedule
                </summary>
                <ul className="mt-2 space-y-1 text-small text-muted">
                  {Object.entries(entity.openingHours.days).map(([day, hours]) => (
                    <li key={day}>
                      <span className="font-medium text-ink">{day}:</span> {dayHoursLabel(hours)}
                    </li>
                  ))}
                </ul>
              </details>
            ) : (
              <p className="text-small text-muted">Opening hours: Unknown</p>
            )}
            <p className="text-small text-muted">
              Current opening status in Dhaka:{' '}
              <span className="font-semibold text-ink">
                {openingStatus(entity.openingHours, new Date())}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <ButtonLink
                href={directionsUrl(entity)}
                target="_blank"
                rel="noreferrer"
                variant="secondary"
                icon={<ExternalLink aria-hidden size={14} />}
              >
                Get directions to this address
              </ButtonLink>
              <ButtonLink href={`/report?target=branch&id=${entity.id}`} variant="ghost">
                Report branch information
              </ButtonLink>
            </div>
          </Card>
        )}

        <section aria-label="Published services and prices" className="flex flex-col gap-4">
          <h2 className="font-display text-h2 font-bold text-ink">Published services and prices</h2>
          {data.kind === 'service' && (
            <>
              <p className="text-small text-muted">
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
                <ListingCard
                  key={l.id}
                  listing={l}
                  area={area}
                  showBranchLink={data.kind === 'service'}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No active published listings"
              description="There are currently no active published prices recorded for this selection."
            />
          )}
        </section>
      </main>
    </PageShell>
  );
}
