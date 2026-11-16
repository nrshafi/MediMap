import { useRef, useState, useEffect } from 'react';
import type { Service, BranchService } from '../catalog/contracts';
import { resolveDiagnosticQuery } from '../search/resolutionEngine';
import { LocationSelector } from '../search/ui/LocationSelector';
import { GeographicMap } from './GeographicMap';
import { findLocation, publicRoute } from './catalog.functions';
import { calculateHaversineDistanceKm } from '../map/haversine';
import './public.css';
import { AreaStatistics } from './AreaStatistics';
import { sortListings, sortChoices, type PublicSort } from './sorting';

export function FindPage({
  services,
  listings,
  service,
  ratings = {},
  initial,
  onContextChange,
}: {
  services: Service[];
  listings: BranchService[];
  service?: string;
  ratings?: Record<string, number | null>;
  initial?: { lat: number; lng: number; radius: number; sort: PublicSort; verified: string };
  onContextChange?: (value: {
    lat: number;
    lng: number;
    radius: number;
    sort: PublicSort;
    verified: string;
  }) => void;
}) {
  const [query, setQuery] = useState('');
  const [comparison, setComparison] = useState<string[]>([]);
  const [highlight, setHighlight] = useState<string>();
  const [center, setCenter] = useState({
    latitude: initial?.lat ?? 23.8103,
    longitude: initial?.lng ?? 90.4125,
  });
  const [radius, setRadius] = useState(initial?.radius ?? 3);
  const [sort, setSort] = useState<PublicSort>(initial?.sort ?? 'price-asc');
  const [verified, setVerified] = useState(initial?.verified ?? 'all');
  const [travel, setTravel] = useState<Record<string, number | null>>({});
  const previousUrl = useRef('');
  useEffect(() => {
    const url = JSON.stringify(initial);
    if (initial && previousUrl.current !== url) {
      previousUrl.current = url;
      setCenter({ latitude: initial.lat, longitude: initial.lng });
      setRadius(initial.radius);
      setSort(initial.sort);
      setVerified(initial.verified);
      return;
    }
    onContextChange?.({ lat: center.latitude, lng: center.longitude, radius, sort, verified });
  }, [
    initial?.lat,
    initial?.lng,
    initial?.radius,
    initial?.sort,
    initial?.verified,
    center.latitude,
    center.longitude,
    radius,
    sort,
    verified,
  ]);
  useEffect(() => {
    setComparison([]);
    setHighlight(undefined);
    setTravel({});
  }, [service, query, center.latitude, center.longitude, radius]);
  function serviceHref(id: string) {
    return `/find?${new URLSearchParams({ service: id, lat: String(center.latitude), lng: String(center.longitude), radius: String(radius), sort, verified })}`;
  }
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
  const visible = query.trim()
    ? []
    : sortListings(
        listings
          .filter(
            (l) =>
              !l.branch.coordinates ||
              calculateHaversineDistanceKm(center, l.branch.coordinates) <= radius,
          )
          .filter((l) => verified !== 'yes' || l.price?.status === 'verified'),
        sort,
        center,
        ratings,
        travel,
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
              <a href={serviceHref(m.canonicalService.id)}>{m.canonicalService.name}</a>
            </p>
          ))}
          {matches.typoSuggestions?.map((m) => (
            <p key={m.canonicalService.id}>
              Did you mean{' '}
              <a href={serviceHref(m.canonicalService.id)}>{m.canonicalService.name}</a>?
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
            <a href={serviceHref(s.id)}>{s.name}</a>
          </p>
        ))}
      </details>
      <h2>Choose your location</h2>
      <p>
        Address lookup and driving estimates are{' '}
        <a href="https://www.geoapify.com/">powered by Geoapify</a>. Requests share a daily
        application budget.
      </p>
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
        branches={visible.map((l) => ({
          id: l.id,
          name: l.branch.name,
          coordinates: l.branch.coordinates,
        }))}
        selected={highlight}
        onBranchSelect={(id) => {
          setHighlight(id);
          document
            .getElementById(`listing-${id}`)
            ?.scrollIntoView({ block: 'center', behavior: 'auto' });
        }}
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
      {selected && <AreaStatistics listings={listings} center={center} radius={radius} />}
      <p>
        Branches without recorded coordinates appear separately and are not counted as inside your
        radius.
      </p>
      {selected && !visible.length && <p>No published listings match this service and area.</p>}
      <section aria-label="Published listings">
        <label>
          Sort listings
          <select value={sort} onChange={(e) => setSort(e.target.value as PublicSort)}>
            {sortChoices.map((value) => (
              <option value={value} key={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Price verification
          <select value={verified} onChange={(e) => setVerified(e.target.value)}>
            <option value="all">All published listings</option>
            <option value="yes">Verified prices only</option>
          </select>
        </label>
        <p>
          {comparison.length} of 4 selected for comparison. Selection clears when the service, area,
          or page changes.
        </p>
        <button onClick={() => setComparison([])}>Clear comparison</button>
        {comparison.length >= 2 && (
          <a href={`/compare?ids=${comparison.join(',')}`}>Compare selected branches</a>
        )}
        {visible.map((l) => (
          <div key={l.id} id={`listing-${l.id}`} data-selected={highlight === l.id}>
            <button
              disabled={!l.branch.coordinates}
              aria-pressed={highlight === l.id}
              onClick={() => setHighlight(l.id)}
            >
              Highlight branch on map
            </button>
            <button
              aria-pressed={comparison.includes(l.id)}
              disabled={comparison.length === 4 && !comparison.includes(l.id)}
              onClick={() =>
                setComparison((previous) =>
                  previous.includes(l.id)
                    ? previous.filter((id) => id !== l.id)
                    : [...previous, l.id],
                )
              }
            >
              {comparison.includes(l.id) ? 'Remove from comparison' : 'Select for comparison'}
            </button>
            <ListingCard
              listing={l}
              area={{ lat: center.latitude, lng: center.longitude, radius }}
            />
            <RouteEstimate
              key={`${l.id}-${center.latitude}-${center.longitude}`}
              id={l.id}
              center={center}
              onEstimate={(minutes) => setTravel((previous) => ({ ...previous, [l.id]: minutes }))}
            />
          </div>
        ))}
      </section>
    </main>
  );
}
export function ListingCard({
  listing: l,
  area,
}: {
  listing: BranchService;
  area?: { lat: number; lng: number; radius: number };
}) {
  return (
    <article>
      <h3>
        {l.branch.provider.name}, {l.branch.name}
      </h3>
      <p>
        <a
          href={`/services/${l.service.id}${area ? `?${new URLSearchParams({ lat: String(area.lat), lng: String(area.lng), radius: String(area.radius) })}` : ''}`}
        >
          {l.service.name}
        </a>{' '}
        · <a href={`/branches/${l.branch.id}`}>Branch details</a>
      </p>
      <a href={`/reviews?listing=${l.id}`}>Service reviews</a>
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
  onEstimate,
}: {
  id: string;
  center: { latitude: number; longitude: number };
  onEstimate: (minutes: number | null) => void;
}) {
  const [result, setResult] = useState<Awaited<ReturnType<typeof publicRoute>> | null>(null);
  const [pending, setPending] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return (
    <section aria-label="Road travel estimate">
      <button
        disabled={pending}
        onClick={async () => {
          setPending(true);
          try {
            const estimate = await publicRoute({ data: { listing: id, from: center } });
            if (!mounted.current) return;
            setResult(estimate);
            onEstimate(estimate.available ? estimate.minutes : null);
          } catch {
            if (!mounted.current) return;
            setResult({
              available: false,
              message: 'Road distance and travel time are unavailable.',
            });
          } finally {
            if (mounted.current) setPending(false);
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
