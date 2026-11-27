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
import { Link } from '../../ui/Link';
import { SiteFooter, SiteHeader } from '../../ui/SiteChrome';
import { ui } from '../../ui/styles';
import { AreaStatistics } from './AreaStatistics';
import { DEFAULT_CENTER, DEFAULT_RADIUS_KM, RADIUS_PRESETS, parseBoundedNumber } from './defaults';
import {
  RATING_FILTER_OPTIONS,
  applyListingFilters,
  parsePriceFilter,
  type MinRatingFilter,
} from './filters';
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
const isPreset = (value: number) => RADIUS_PRESETS.some((preset) => preset === value);

type Context = {
  lat: number;
  lng: number;
  radius: number;
  sort: PublicSort;
  verified: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: MinRatingFilter;
};

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
    latitude: initial?.lat ?? DEFAULT_CENTER.latitude,
    longitude: initial?.lng ?? DEFAULT_CENTER.longitude,
  });
  const [centerLabel, setCenterLabel] = useState<string>();
  const [radius, setRadius] = useState(initial?.radius ?? DEFAULT_RADIUS_KM);
  const [radiusDraft, setRadiusDraft] = useState(String(initial?.radius ?? DEFAULT_RADIUS_KM));
  const [customRadius, setCustomRadius] = useState(!isPreset(initial?.radius ?? DEFAULT_RADIUS_KM));
  const [sort, setSort] = useState<PublicSort>(initial?.sort ?? 'price-asc');
  const [verified, setVerified] = useState(initial?.verified ?? 'all');
  const [minPrice, setMinPrice] = useState<number | undefined>(initial?.minPrice);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(initial?.maxPrice);
  const [minPriceDraft, setMinPriceDraft] = useState(
    initial?.minPrice !== undefined ? String(initial.minPrice) : '',
  );
  const [maxPriceDraft, setMaxPriceDraft] = useState(
    initial?.maxPrice !== undefined ? String(initial.maxPrice) : '',
  );
  const [minRating, setMinRating] = useState<MinRatingFilter | undefined>(initial?.minRating);
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
    setQuery(initialQuery ?? '');
  }, [initialQuery, service]);

  const initialKey = JSON.stringify(initial);
  useEffect(() => {
    if (initial && previousUrl.current !== initialKey) {
      previousUrl.current = initialKey;
      setCenter({ latitude: initial.lat, longitude: initial.lng });
      setRadius(initial.radius);
      setRadiusDraft(String(initial.radius));
      setCustomRadius(!isPreset(initial.radius));
      setSort(initial.sort);
      setVerified(initial.verified);
      setMinPrice(initial.minPrice);
      setMaxPrice(initial.maxPrice);
      setMinPriceDraft(initial.minPrice !== undefined ? String(initial.minPrice) : '');
      setMaxPriceDraft(initial.maxPrice !== undefined ? String(initial.maxPrice) : '');
      setMinRating(initial.minRating);
      return;
    }
    onContextChange?.({
      lat: center.latitude,
      lng: center.longitude,
      radius,
      sort,
      verified,
      minPrice,
      maxPrice,
      minRating,
    });
  }, [
    initialKey,
    center.latitude,
    center.longitude,
    radius,
    sort,
    verified,
    minPrice,
    maxPrice,
    minRating,
    onContextChange,
  ]);
  useEffect(() => {
    setComparison([]);
    setHighlight(undefined);
    setRoutes({});
  }, [service, query, center.latitude, center.longitude, radius]);

  function serviceHref(id: string) {
    const params = new URLSearchParams({
      service: id,
      lat: String(center.latitude),
      lng: String(center.longitude),
      radius: String(radius),
      sort,
      verified,
    });
    if (minPrice !== undefined) params.set('minPrice', String(minPrice));
    if (maxPrice !== undefined) params.set('maxPrice', String(maxPrice));
    if (minRating !== undefined) params.set('minRating', String(minRating));
    return `/find?${params}`;
  }
  function chooseLocation(coordinates: { latitude: number; longitude: number }, label?: string) {
    setCenter(coordinates);
    setCenterLabel(label);
  }

  const serviceCatalog = useMemo(
    () =>
      services.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category.name,
        aliases: s.aliases.map((a) => ({ alias: a.name, language: a.language })),
      })),
    [services],
  );
  const matches = useMemo(
    () => (query.trim() ? resolveDiagnosticQuery(query, serviceCatalog) : null),
    [query, serviceCatalog],
  );
  const selected = services.find((s) => s.id === service);
  const travel = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(routes).map(([id, route]) => [id, route.available ? route.minutes : null]),
      ),
    [routes],
  );
  const radiusAndVerified = query.trim()
    ? []
    : listings
        .filter(
          (l) =>
            !l.branch.coordinates ||
            calculateHaversineDistanceKm(center, l.branch.coordinates) <= radius,
        )
        .filter((l) => verified !== 'yes' || l.price?.status === 'verified');
  const filteredResult = applyListingFilters(radiusAndVerified, ratings, {
    minPrice,
    maxPrice,
    minRating,
  });
  const visible = sortListings(filteredResult.visible, sort, center, ratings, travel);
  const hasExtraFilters =
    minPrice !== undefined || maxPrice !== undefined || minRating !== undefined;
  const visibleIdsKey = visible.map((l) => l.id).join(',');

  useEffect(() => {
    const allowed = new Set(visible.map((l) => l.id));
    setComparison((previous) => {
      const next = previous.filter((id) => allowed.has(id));
      return next.length === previous.length ? previous : next;
    });
  }, [visibleIdsKey]);

  function clearExtraFilters() {
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setMinPriceDraft('');
    setMaxPriceDraft('');
    setMinRating(undefined);
  }

  const parsedMinDraft = minPriceDraft.trim() === '' ? undefined : parsePriceFilter(minPriceDraft);
  const parsedMaxDraft = maxPriceDraft.trim() === '' ? undefined : parsePriceFilter(maxPriceDraft);
  const minPriceError =
    minPriceDraft.trim() !== '' && parsedMinDraft === undefined
      ? 'Enter a whole BDT amount from 0 to 1,000,000.'
      : parsedMinDraft !== undefined &&
          parsedMaxDraft !== undefined &&
          parsedMinDraft > parsedMaxDraft
        ? 'Minimum price cannot exceed maximum price.'
        : undefined;
  const maxPriceError =
    maxPriceDraft.trim() !== '' && parsedMaxDraft === undefined
      ? 'Enter a whole BDT amount from 0 to 1,000,000.'
      : undefined;
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
                {matches.matches
                  .filter((m) => m.matchType !== 'typo_suggestion')
                  .map((m) => (
                    <Link
                      key={m.canonicalService.id}
                      className={`${ui.link} flex min-h-touch items-center`}
                      to={serviceHref(m.canonicalService.id)}
                      onClick={() => setQuery('')}
                    >
                      {m.canonicalService.name}
                    </Link>
                  ))}
                {matches.typoSuggestions?.map((m) => (
                  <p key={m.canonicalService.id} className="flex min-h-touch items-center gap-1">
                    Did you mean{' '}
                    <Link
                      className={ui.link}
                      to={serviceHref(m.canonicalService.id)}
                      onClick={() => setQuery('')}
                    >
                      {m.canonicalService.name}
                    </Link>
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
                    <Link
                      className={`${ui.link} flex min-h-touch items-center`}
                      to={serviceHref(s.id)}
                      onClick={() => setQuery('')}
                    >
                      {s.name}
                    </Link>
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
              {RADIUS_PRESETS.map((preset) => (
                <Chip
                  key={preset}
                  pressed={!customRadius && radius === preset}
                  onClick={() => {
                    setCustomRadius(false);
                    setRadius(preset);
                    setRadiusDraft(String(preset));
                  }}
                >
                  {preset} km
                </Chip>
              ))}
              <Chip
                pressed={customRadius}
                onClick={() => {
                  setCustomRadius(true);
                  setRadiusDraft(String(radius));
                }}
              >
                Custom
              </Chip>
            </div>

            {customRadius && (
              <Field
                label="Straight-line radius in km"
                error={
                  parseBoundedNumber(radiusDraft, 0.1, 100) === undefined
                    ? 'Enter a radius from 0.1 to 100 km.'
                    : undefined
                }
              >
                <input
                  className={fieldControlStyles}
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                  value={radiusDraft}
                  onChange={(e) => {
                    const next = e.target.value;
                    setRadiusDraft(next);
                    const parsed = parseBoundedNumber(next, 0.1, 100);
                    if (parsed !== undefined) setRadius(parsed);
                  }}
                />
              </Field>
            )}

            <div className="grid grid-cols-1 gap-2 border-t border-border pt-2 sm:grid-cols-2">
              <Field label="Minimum price (BDT)" error={minPriceError}>
                <input
                  className={fieldControlStyles}
                  type="text"
                  inputMode="numeric"
                  value={minPriceDraft}
                  onChange={(e) => {
                    const next = e.target.value;
                    setMinPriceDraft(next);
                    if (next.trim() === '') {
                      setMinPrice(undefined);
                      return;
                    }
                    const parsed = parsePriceFilter(next);
                    if (parsed !== undefined && (maxPrice === undefined || parsed <= maxPrice)) {
                      setMinPrice(parsed);
                    }
                  }}
                />
              </Field>
              <Field label="Maximum price (BDT)" error={maxPriceError}>
                <input
                  className={fieldControlStyles}
                  type="text"
                  inputMode="numeric"
                  value={maxPriceDraft}
                  onChange={(e) => {
                    const next = e.target.value;
                    setMaxPriceDraft(next);
                    if (next.trim() === '') {
                      setMaxPrice(undefined);
                      return;
                    }
                    const parsed = parsePriceFilter(next);
                    if (parsed !== undefined && (minPrice === undefined || parsed >= minPrice)) {
                      setMaxPrice(parsed);
                    }
                  }}
                />
              </Field>
            </div>

            <div
              role="group"
              aria-label="Minimum rating"
              className="flex flex-wrap items-center gap-1.5 border-t border-border pt-2"
            >
              <span className="mr-1 text-label font-semibold text-muted">Rating:</span>
              <Chip pressed={minRating === undefined} onClick={() => setMinRating(undefined)}>
                Any
              </Chip>
              {RATING_FILTER_OPTIONS.map((option) => (
                <Chip
                  key={option}
                  pressed={minRating === option}
                  onClick={() => setMinRating(option)}
                >
                  {option}+
                </Chip>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
              <label htmlFor="sort-listings" className="text-small font-semibold text-ink">
                Sort listings
              </label>
              <select
                id="sort-listings"
                className={`${fieldControlStyles} w-auto`}
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

            {hasExtraFilters && (
              <div className="flex justify-end border-t border-border pt-2">
                <Button variant="ghost" size="small" onClick={clearExtraFilters}>
                  Clear filters
                </Button>
              </div>
            )}
          </section>

          {selected &&
            (filteredResult.hiddenUnknownPrice > 0 || filteredResult.hiddenNoRating > 0) && (
              <div className="flex flex-col gap-1 text-small text-muted">
                {filteredResult.hiddenUnknownPrice > 0 && (
                  <p>
                    {filteredResult.hiddenUnknownPrice}{' '}
                    {filteredResult.hiddenUnknownPrice === 1 ? 'listing' : 'listings'} hidden
                    because the price is unknown.
                  </p>
                )}
                {filteredResult.hiddenNoRating > 0 && (
                  <p>
                    {filteredResult.hiddenNoRating}{' '}
                    {filteredResult.hiddenNoRating === 1 ? 'listing' : 'listings'} hidden because it
                    has no reviews.
                  </p>
                )}
              </div>
            )}

          {selected && (
            <AreaStatistics
              listings={listings}
              center={center}
              radius={radius}
              filtered={hasExtraFilters}
            />
          )}

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
                action={
                  hasExtraFilters ? (
                    <Button variant="secondary" onClick={clearExtraFilters}>
                      Clear filters
                    </Button>
                  ) : undefined
                }
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
