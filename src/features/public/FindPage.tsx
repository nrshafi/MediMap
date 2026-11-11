import { useRef, useState } from 'react';
import type { Service, BranchService } from '../catalog/contracts';
import { resolveDiagnosticQuery } from '../search/resolutionEngine';
import { LocationSelector } from '../search/ui/LocationSelector';
import { GeographicMap } from './GeographicMap';
import { findLocation, publicRoute } from './catalog.functions';
import { calculateHaversineDistanceKm } from '../map/haversine';
import './public.css';

export function FindPage({
  services,
  listings,
  service,
}: {
  services: Service[];
  listings: BranchService[];
  service?: string;
}) {
  const [query, setQuery] = useState('');
  const [center, setCenter] = useState({ latitude: 23.8103, longitude: 90.4125 });
  const [radius, setRadius] = useState(3);
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<{
    places: { label: string; latitude: number; longitude: number }[];
    message: string;
  }>({
    places: [],
    message: '',
  });
  const generation = useRef(0);
  const matches = query.trim()
    ? resolveDiagnosticQuery(
        query,
        services.map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category.name,
          aliases: s.aliases.map((a) => ({ alias: a.name, language: a.language })),
        })),
      )
    : null;
  const selected = services.find((s) => s.id === service);
  const visible = listings.filter(
    (l) =>
      !l.branch.coordinates || calculateHaversineDistanceKm(center, l.branch.coordinates) <= radius,
  );
  return (
    <main className="public-page">
      <nav>
        <a href="/">MediMap</a>
        <a href="/account">Your account</a>
      </nav>
      <h1>Find a diagnostic service</h1>
      <p>Compare published branch prices and inspect their sources.</p>
      <label>
        Service name or abbreviation
        <input value={query} onChange={(e) => setQuery(e.target.value)} maxLength={256} />
      </label>
      {matches && (
        <section aria-label="Service suggestions">
          {matches.matches.map((m) => (
            <p key={m.canonicalService.id}>
              <a href={`/find?service=${m.canonicalService.id}`}>{m.canonicalService.name}</a>
            </p>
          ))}
          {matches.typoSuggestions?.map((m) => (
            <p key={m.canonicalService.id}>
              Did you mean{' '}
              <a href={`/find?service=${m.canonicalService.id}`}>{m.canonicalService.name}</a>?
            </p>
          ))}
          {!matches.matches.length && !matches.typoSuggestions?.length && (
            <p>No matching service.</p>
          )}
        </section>
      )}
      <details>
        <summary>Browse all {services.length} services</summary>
        {services.map((s) => (
          <p key={s.id}>
            <a href={`/find?service=${s.id}`}>{s.name}</a>
          </p>
        ))}
      </details>
      <h2>Choose your location</h2>
      <LocationSelector
        center={center}
        onSelect={(c) => {
          generation.current++;
          setCenter(c);
          setLocation({ places: [], message: '' });
        }}
      />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const current = ++generation.current;
          try {
            const result = await findLocation({ data: { query: address } });
            if (current === generation.current) setLocation(result);
          } catch {
            if (current === generation.current)
              setLocation({ places: [], message: 'Location lookup is unavailable.' });
          }
        }}
      >
        <label>
          Dhaka address
          <input
            value={address}
            onChange={(e) => {
              generation.current++;
              setAddress(e.target.value);
              setLocation({ places: [], message: '' });
            }}
            minLength={3}
            maxLength={160}
          />
        </label>
        <button>Find address</button>
      </form>
      <p role="status">{location.message}</p>
      {location.places.map((p) => (
        <button
          key={p.label}
          onClick={() => {
            generation.current++;
            setCenter(p);
            setLocation({ places: [], message: `Selected ${p.label}` });
          }}
        >
          {p.label}
        </button>
      ))}
      <GeographicMap
        center={center}
        onSelect={(c) => {
          generation.current++;
          setCenter(c);
        }}
      />
      <label>
        Straight-line radius in km
        <input
          type="number"
          min="0.1"
          max="100"
          step="0.1"
          value={radius}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (n >= 0.1 && n <= 100) setRadius(n);
          }}
        />
      </label>
      <h2>{selected?.name ?? 'Select a service to see prices'}</h2>
      <p>
        Branches without recorded coordinates appear separately and are not counted as inside your
        radius.
      </p>
      {selected && !visible.length && <p>No published listings match this service and area.</p>}
      <section aria-label="Published listings">
        {visible.map((l) => (
          <div key={l.id}>
            <ListingCard listing={l} />
            <RouteEstimate
              key={`${l.id}-${center.latitude}-${center.longitude}`}
              id={l.id}
              center={center}
            />
          </div>
        ))}
      </section>
    </main>
  );
}
export function ListingCard({ listing: l }: { listing: BranchService }) {
  return (
    <article>
      <h3>
        {l.branch.provider.name}, {l.branch.name}
      </h3>
      <p>
        <a href={`/services/${l.service.id}`}>{l.service.name}</a> ·{' '}
        <a href={`/branches/${l.branch.id}`}>Branch details</a>
      </p>
      <p>{l.branch.address}</p>
      <p>{l.price ? `BDT ${l.price.amountBdt.toFixed(2)} · ${l.price.status}` : 'Price unknown'}</p>
      <p>Website review: {l.price?.verifiedAt ?? 'Unknown'}</p>
      {l.price?.source && (
        <a href={l.price.source.url} target="_blank" rel="noreferrer">
          Official price source
        </a>
      )}
      <p>
        {l.branch.coordinates
          ? 'Recorded branch coordinates'
          : 'Location coordinates unknown; radius eligibility unavailable.'}
      </p>
      <a href={`/report?target=listing&id=${l.id}`}>Report incorrect information</a>
    </article>
  );
}

function RouteEstimate({
  id,
  center,
}: {
  id: string;
  center: { latitude: number; longitude: number };
}) {
  const [result, setResult] = useState<Awaited<ReturnType<typeof publicRoute>> | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <section aria-label="Road travel estimate">
      <button
        disabled={pending}
        onClick={async () => {
          setPending(true);
          try {
            setResult(await publicRoute({ data: { listing: id, from: center } }));
          } catch {
            setResult({
              available: false,
              message: 'Road distance and travel time are unavailable.',
            });
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? 'Finding route…' : 'Get driving estimate'}
      </button>
      <p role="status">
        {result?.available
          ? `Road distance ${result.roadKm.toFixed(1)} km · Estimated travel time ${Math.round(result.minutes)} minutes`
          : (result?.message ?? 'Travel estimates have not been requested.')}
      </p>
    </section>
  );
}
