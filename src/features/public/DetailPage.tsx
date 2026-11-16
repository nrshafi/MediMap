import { ListingCard } from './FindPage';
import { GeographicMap } from './GeographicMap';
import type { publicDetail } from './details.functions';
import './public.css';
import { AreaStatistics } from './AreaStatistics';
import { dayHoursLabel, openingStatus } from '../providers/hours';
export function DetailPage({
  data,
  area = { lat: 23.8103, lng: 90.4125, radius: 3 },
}: {
  data: Awaited<ReturnType<typeof publicDetail>>;
  area?: { lat: number; lng: number; radius: number };
}) {
  const entity = data.entity;
  if (!entity)
    return (
      <main className="public-page">
        <h1>Record not found</h1>
        <p>This record is unavailable or inactive.</p>
        <a href="/find">Browse services</a>
      </main>
    );
  return (
    <main className="public-page">
      <nav>
        <a href="/find">Browse services</a>
        <a href="/account">Your account</a>
      </nav>
      <h1>{entity.name}</h1>
      {'aliases' in entity && (
        <section>
          <p>Category: {entity.category.name}</p>
          <p>
            Also known as:{' '}
            {entity.aliases.length
              ? entity.aliases.map((a) => a.name).join(', ')
              : 'No published aliases'}
          </p>
        </section>
      )}
      {data.branchRating && (
        <p>
          Branch rating across services: {data.branchRating.mean?.toFixed(2) ?? 'No ratings'} ·{' '}
          {data.branchRating.count} reviews.
        </p>
      )}
      {data.providerRating && (
        <p>
          Provider rating across branches and services:{' '}
          {data.providerRating.mean?.toFixed(2) ?? 'No ratings'} · {data.providerRating.count}{' '}
          reviews. These are separate from individual service ratings.
        </p>
      )}
      {'address' in entity && (
        <section>
          <p>{entity.address}</p>
          {entity.coordinates ? (
            <GeographicMap center={entity.coordinates} />
          ) : (
            <p>Map location unavailable. Branch coordinates are unknown.</p>
          )}
          <p>Provider: {entity.provider.name}</p>
          {entity.phone ? (
            <a href={`tel:${entity.phone}`}>Call {entity.phone}</a>
          ) : (
            <p>Telephone unknown</p>
          )}
          {entity.website && (
            <a href={entity.website} target="_blank" rel="noreferrer">
              Provider website
            </a>
          )}
          <p>
            Opening hours:{' '}
            {entity.openingHours
              ? Object.entries(entity.openingHours.days)
                  .map(([day, hours]) => `${day}: ${dayHoursLabel(hours)}`)
                  .join(' · ')
              : 'Unknown'}
          </p>
          <p>Current opening status in Dhaka: {openingStatus(entity.openingHours, new Date())}</p>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(entity.address)}`}
            target="_blank"
            rel="noreferrer"
          >
            Get directions to this address
          </a>
          <a href={`/report?target=branch&id=${entity.id}`}>Report branch information</a>
        </section>
      )}
      {data.kind === 'service' && (
        <a
          href={`/find?${new URLSearchParams({ service: entity.id, lat: String(area.lat), lng: String(area.lng), radius: String(area.radius) })}`}
        >
          Find this service near a location
        </a>
      )}
      <h2>Published services and prices</h2>
      {data.kind === 'service' && (
        <>
          <p>
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
        data.listings.map((l) => <ListingCard key={l.id} listing={l} area={area} />)
      ) : (
        <p>No active published listings.</p>
      )}
    </main>
  );
}
