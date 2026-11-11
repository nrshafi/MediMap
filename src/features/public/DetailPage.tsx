import { ListingCard } from './FindPage';
import type { publicDetail } from './details.functions';
import './public.css';
export function DetailPage({ data }: { data: Awaited<ReturnType<typeof publicDetail>> }) {
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
      {'address' in entity && (
        <section>
          <p>{entity.address}</p>
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
              ? Object.entries(entity.openingHours)
                  .map(
                    ([day, hours]) =>
                      `${day}: ${hours === null ? 'Unknown' : JSON.stringify(hours)}`,
                  )
                  .join(' · ')
              : 'Unknown'}
          </p>
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
        <a href={`/find?service=${entity.id}`}>Find this service near a location</a>
      )}
      <h2>Published services and prices</h2>
      {data.listings.length ? (
        data.listings.map((l) => <ListingCard key={l.id} listing={l} />)
      ) : (
        <p>No active published listings.</p>
      )}
    </main>
  );
}
