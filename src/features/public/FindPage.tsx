import { useEffect, useMemo, useRef, useState } from 'react';
import { ClientOnly } from '@tanstack/react-router';
import { BadgeCheck, List, Map as MapIcon, Search } from 'lucide-react';
import type { Service, BranchService } from '../catalog/contracts';
import { resolveDiagnosticQuery } from '../search/resolutionEngine';
import { calculateHaversineDistanceKm } from '../map/haversine';
import { EmptyState } from '../../ui/EmptyState';
import { Field, fieldControlStyles } from '../../ui/Field';
import { Button, ButtonLink } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { SiteFooter, SiteHeader } from '../../ui/SiteChrome';
import { ui } from '../../ui/styles';
import { AreaStatistics } from './AreaStatistics';
import { formatBdt, type RouteResult } from './format';
import { GoogleMapView, MapPlaceholder, MapUnavailable, type MapPinData } from './GoogleMapView';
import { ListingCard } from './ListingCard';
import { ListingPanel } from './ListingPanel';
import { LocationPanel } from './LocationPanel';
import { sortListings, sortChoices, type PublicSort } from './sorting';
import { useLivePosition } from './useLivePosition';

const sortLabels: Record<PublicSort, string> = {
  'price-asc': 'Price, lowest first',
  'price-desc': 'Price, highest first',
  nearest: 'Nearest straight-line distance',
  'travel-time': 'Shortest road time',
  rating: 'Highest rated',
  'verification-date': 'Most recently reviewed',
};
const radiusPresets = [1, 3, 5] as const;
const isPreset = (value: number) => radiusPresets.some((preset) => preset === value);

type Context = { lat: number; lng: number; radius: number; sort: PublicSort; verified: string };

export function FindPage({
  services,
  listings,
  service,
  ratings = {},
  browserKey = null,
  initialQuery = '',
  initial,
  onContextChange,
}: {
  services: Service[];
  listings: BranchService[];
  service?: string;
  ratings?: Record<string, number | null>;
  browserKey?: string | null;
  initialQuery?: string;
  initial?: Context;
  onContextChange?: (value: Context) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [comparison, setComparison] = useState<string[]>([]);
  const [highlight, setHighlight] = useState<string>();
  const [center, setCenter] = useState({
    latitude: initial?.lat ?? 23.8103,
    longitude: initial?.lng ?? 90.4125,
  });
  const [centerLabel, setCenterLabel] = useState<string>();
  const [radius, setRadius] = useState(initial?.radius ?? 3);
  const [customRadius, setCustomRadius] = useState(!isPreset(initial?.radius ?? 3));
  const [sort, setSort] = useState<PublicSort>(initial?.sort ?? 'price-asc');
  const [verified, setVerified] = useState(initial?.verified ?? 'all');
  const [routes, setRoutes] = useState<Record<string, RouteResult>>({});
  const [view, setView] = useState<'list' | 'map'>('list');
  const [desktop, setDesktop] = useState<boolean | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const live = useLivePosition();
  const previousUrl = useRef('');

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

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
    setRoutes({});
  }, [service, query, center.latitude, center.longitude, radius]);

  function serviceHref(id: string) {
    return `/find?${new URLSearchParams({ service: id, lat: String(center.latitude), lng: String(center.longitude), radius: String(radius), sort, verified })}`;
  }
  function chooseLocation(coordinates: { latitude: number; longitude: number }, label?: string) {
    setCenter(coordinates);
    setCenterLabel(label);
  }

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
  const travel = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(routes).map(([id, route]) => [id, route.available ? route.minutes : null]),
      ),
    [routes],
  );
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
  const distanceOf = (l: BranchService) =>
    l.branch.coordinates ? calculateHaversineDistanceKm(center, l.branch.coordinates) : null;
  const pins: MapPinData[] = visible.flatMap((l) =>
    l.branch.coordinates
      ? [
          {
            id: l.id,
            name: `${l.branch.provider.name}, ${l.branch.name}`,
            label: l.price ? formatBdt(l.price.amountBdt) : l.branch.name,
            coordinates: l.branch.coordinates,
          },
        ]
      : [],
  );
  const open = visible.find((l) => l.id === highlight);
  const openRoute = open ? routes[open.id] : undefined;
  const routePath = openRoute?.available ? openRoute.path : undefined;
  const stopLive = live.stop;
  useEffect(() => {
    if (!routePath) stopLive();
  }, [routePath]);
  const mapWanted = desktop === true || view === 'map';
  const mapVisible = mapWanted && browserKey !== null && !mapFailed;

  function toggleCompare(id: string) {
    setComparison((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id],
    );
  }
  function closePanel() {
    const id = highlight;
    setHighlight(undefined);
    if (id)
      requestAnimationFrame(() =>
        document
          .getElementById(`listing-${id}`)
          ?.querySelector<HTMLButtonElement>('h3 button')
          ?.focus(),
      );
  }

  const panelShared =
    'z-30 bg-surface text-ink shadow-overlay lg:absolute lg:inset-auto lg:right-4 lg:top-4 lg:m-0 lg:max-h-[calc(100%-1rem-var(--spacing-attribution))] lg:w-panel lg:overflow-y-auto lg:rounded-lg lg:border lg:border-border';

  const panelViewClass =
    view === 'map'
      ? 'm-4 rounded-lg border border-border'
      : 'fixed inset-x-0 bottom-0 max-h-[55svh] overflow-y-auto rounded-t-lg rounded-b-none border-t border-x border-border';

  const panelClass = `${panelShared} ${panelViewClass}`;
  const hideOnMobile = (hidden: boolean) => (hidden ? 'hidden lg:block' : '');

  return (
    <div className="flex min-h-svh flex-col lg:h-svh">
      <SiteHeader />
      <main className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
        <div
          className={`flex flex-col gap-4 p-4 lg:w-sidebar lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-border ${open && view === 'list' ? 'pb-[55svh] lg:pb-4' : ''}`}
        >
          <div>
            <h1 className="font-display text-h1 font-bold text-ink">Find a diagnostic service</h1>
            <p className="text-small text-muted">
              Compare published branch prices and inspect their sources.
            </p>
          </div>

          <section aria-label="Choose a service" className="flex flex-col gap-2">
            <Field label="Service name or abbreviation">
              {(fieldProps) => (
                <div className="relative">
                  <Search
                    aria-hidden
                    size={18}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                  />
                  <input
                    {...fieldProps}
                    className={`${fieldControlStyles} pl-10`}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    maxLength={256}
                  />
                </div>
              )}
            </Field>
            {matches && (
              <section aria-label="Service suggestions" className="flex flex-col">
                {matches.matches.map((m) => (
                  <a
                    key={m.canonicalService.id}
                    className={`${ui.link} flex min-h-touch items-center`}
                    href={serviceHref(m.canonicalService.id)}
                  >
                    {m.canonicalService.name}
                  </a>
                ))}
                {matches.typoSuggestions?.map((m) => (
                  <p key={m.canonicalService.id} className="flex min-h-touch items-center gap-1">
                    Did you mean{' '}
                    <a className={ui.link} href={serviceHref(m.canonicalService.id)}>
                      {m.canonicalService.name}
                    </a>
                    ?
                  </p>
                ))}
                {!matches.matches.length && !matches.typoSuggestions?.length && (
                  <p className="text-small text-muted">No matching service.</p>
                )}
              </section>
            )}
            <details>
              <summary className="flex min-h-touch cursor-pointer items-center text-small font-semibold text-primary">
                Browse all {services.length} services
              </summary>
              <ul className="flex flex-col">
                {services.map((s) => (
                  <li key={s.id}>
                    <a
                      className={`${ui.link} flex min-h-touch items-center`}
                      href={serviceHref(s.id)}
                    >
                      {s.name}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          </section>

          <LocationPanel
            center={center}
            label={centerLabel}
            onSelect={chooseLocation}
            showAttribution={!mapVisible}
          />

          <section
            aria-label="Filters"
            className="flex flex-col gap-3 rounded-md border border-border bg-surface p-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-small font-bold text-ink">Filters and sort</h2>
              <Chip
                pressed={verified === 'yes'}
                icon={<BadgeCheck aria-hidden size={16} />}
                onClick={() => setVerified(verified === 'yes' ? 'all' : 'yes')}
              >
                Verified prices only
              </Chip>
            </div>

            <div
              role="group"
              aria-label="Straight-line radius"
              className="flex flex-wrap items-center gap-1.5"
            >
              <span className="mr-1 text-label font-semibold text-muted">Radius:</span>
              {radiusPresets.map((preset) => (
                <Chip
                  key={preset}
                  pressed={!customRadius && radius === preset}
                  onClick={() => {
                    setCustomRadius(false);
                    setRadius(preset);
                  }}
                >
                  {preset} km
                </Chip>
              ))}
              <Chip pressed={customRadius} onClick={() => setCustomRadius(true)}>
                Custom
              </Chip>
            </div>

            {customRadius && (
              <Field label="Straight-line radius in km">
                <input
                  className={fieldControlStyles}
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
              </Field>
            )}

            <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
              <label htmlFor="sort-listings" className="text-small font-semibold text-ink">
                Sort listings
              </label>
              <select
                id="sort-listings"
                className="min-h-touch rounded-sm border border-border-strong bg-surface px-2.5 py-1 text-small text-ink focus-visible:outline-focus"
                value={sort}
                onChange={(e) => setSort(e.target.value as PublicSort)}
              >
                {sortChoices.map((value) => (
                  <option value={value} key={value}>
                    {sortLabels[value]}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {selected && <AreaStatistics listings={listings} center={center} radius={radius} />}

          <div role="group" aria-label="Results view" className="grid grid-cols-2 gap-2 lg:hidden">
            <Chip
              className="justify-center"
              pressed={view === 'list'}
              icon={<List aria-hidden size={16} />}
              onClick={() => setView('list')}
            >
              List
            </Chip>
            <Chip
              className="justify-center"
              pressed={view === 'map'}
              icon={<MapIcon aria-hidden size={16} />}
              onClick={() => setView('map')}
            >
              Map
            </Chip>
          </div>

          <div className={`flex flex-col gap-3 ${hideOnMobile(view === 'map')}`}>
            <h2 className="font-display text-h2 font-bold text-ink">
              {selected?.name ?? 'Select a service to see prices'}
            </h2>
            <p className="text-small text-muted">
              Branches without recorded coordinates appear in the list with “Location not recorded”.
              They are not counted as inside your radius.
            </p>
            {selected && !visible.length && (
              <EmptyState
                title="No published listings"
                description="No published listings match this service and area."
              />
            )}
            <section aria-label="Published listings" className="flex flex-col gap-3">
              {visible.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  area={{ lat: center.latitude, lng: center.longitude, radius }}
                  distanceKm={distanceOf(l)}
                  route={routes[l.id]}
                  selected={highlight === l.id}
                  compared={comparison.includes(l.id)}
                  compareDisabled={comparison.length >= 4}
                  onSelect={() => setHighlight(highlight === l.id ? undefined : l.id)}
                  onToggleCompare={() => toggleCompare(l.id)}
                />
              ))}
            </section>
          </div>

          {comparison.length === 1 && (
            <p className="text-small text-muted">
              1 of 4 selected for comparison. Select one more to compare.
            </p>
          )}
          {comparison.length >= 2 && (
            <section
              aria-label="Comparison"
              className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3 shadow-overlay"
            >
              <p className="text-small font-semibold text-ink">{comparison.length} of 4 selected</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setComparison([])}>
                  Clear comparison
                </Button>
                <ButtonLink variant="primary" href={`/compare?ids=${comparison.join(',')}`}>
                  Compare selected branches
                </ButtonLink>
              </div>
            </section>
          )}
          <div className="hidden lg:block">
            <SiteFooter />
          </div>
        </div>

        <section aria-label="Map" className="relative lg:min-w-0 lg:flex-1">
          <div className={`h-[60svh] bg-surface-sunken lg:h-full ${hideOnMobile(view === 'list')}`}>
            {browserKey === null ? (
              <MapUnavailable />
            ) : mapWanted ? (
              <ClientOnly fallback={<MapPlaceholder />}>
                <GoogleMapView
                  apiKey={browserKey}
                  center={center}
                  pins={pins}
                  selectedId={highlight}
                  onSelect={(id) => {
                    setHighlight(id);
                    document
                      .getElementById(`listing-${id}`)
                      ?.scrollIntoView({ block: 'center', behavior: 'auto' });
                  }}
                  onPickLocation={desktop ? (c) => chooseLocation(c) : undefined}
                  onUnavailable={() => setMapFailed(true)}
                  route={routePath}
                  livePosition={live.position}
                />
              </ClientOnly>
            ) : (
              <MapPlaceholder />
            )}
          </div>
          {open && (
            <div className={panelClass}>
              <ListingPanel
                listing={open}
                center={center}
                distanceKm={distanceOf(open)}
                route={routes[open.id]}
                onRoute={(result) => setRoutes((previous) => ({ ...previous, [open.id]: result }))}
                onClose={closePanel}
                live={browserKey !== null && !mapFailed ? live : undefined}
                onShowMap={
                  view === 'list' && browserKey !== null && !mapFailed
                    ? () => setView('map')
                    : undefined
                }
                isBottomSheet={view === 'list'}
              />
            </div>
          )}
        </section>
      </main>
      <div className="lg:hidden">
        <SiteFooter />
      </div>
    </div>
  );
}
