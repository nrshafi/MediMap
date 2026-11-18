import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ExternalLink,
  LocateFixed,
  Map as MapIcon,
  Navigation,
  Plus,
  X,
} from 'lucide-react';
import type { Coordinates } from '../map/types';
import type { BranchService } from '../catalog/contracts';
import { ui } from '../../ui/styles';
import { publicRoute } from './catalog.functions';
import {
  directionsUrl,
  formatBdt,
  formatKm,
  formatMeters,
  type RouteResult,
  formatReviewDate,
} from './format';
import type { LivePosition } from './useLivePosition';
import { StatusBadge } from './ListingCard';

const linkRow = `${ui.link} inline-flex min-h-touch items-center gap-1`;

function RouteEstimate({
  listing,
  center,
  result,
  onResult,
}: {
  listing: string;
  center: Coordinates;
  result: RouteResult | undefined;
  onResult: (value: RouteResult) => void;
}) {
  const [pending, setPending] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return (
    <section aria-label="Road travel estimate" className="flex flex-col gap-2">
      <button
        type="button"
        className={ui.buttonPrimary}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          try {
            const estimate = await publicRoute({ data: { listing, from: center, path: true } });
            if (mounted.current) onResult(estimate);
          } catch {
            if (mounted.current)
              onResult({
                available: false,
                message: 'Road distance and travel time are unavailable.',
              });
          } finally {
            if (mounted.current) setPending(false);
          }
        }}
      >
        <Navigation aria-hidden size={16} />
        {pending ? 'Finding route…' : result?.available ? 'Update route' : 'Show route'}
      </button>
      <p role="status" className={ui.muted}>
        {result?.available
          ? `Road distance ${formatKm(result.roadKm)} · Estimated travel time ${Math.round(result.minutes)} minutes, without live traffic. Route from Google Maps.`
          : (result?.message ?? 'The driving route has not been requested.')}
      </p>
      {result?.available && result.steps && result.steps.length > 0 && (
        <details className="rounded-sm border border-border p-2">
          <summary className="min-h-touch cursor-pointer content-center text-sm font-semibold">
            Driving steps ({result.steps.length})
          </summary>
          <ol className="mt-2 flex list-decimal flex-col gap-2 pl-5 text-sm">
            {result.steps.map((step, index) => (
              <li key={index}>
                {step.instruction}
                {step.distanceMeters !== null && (
                  <span className="text-muted"> · {formatMeters(step.distanceMeters)}</span>
                )}
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-muted">Directions from Google Maps.</p>
        </details>
      )}
    </section>
  );
}

export function ListingPanel({
  listing: l,
  center,
  distanceKm,
  route,
  onRoute,
  compared,
  compareDisabled,
  onToggleCompare,
  onClose,
  live,
  onShowMap,
}: {
  listing: BranchService;
  center: Coordinates;
  distanceKm: number | null;
  route: RouteResult | undefined;
  onRoute: (value: RouteResult) => void;
  compared: boolean;
  compareDisabled: boolean;
  onToggleCompare: () => void;
  onClose: () => void;
  live?: LivePosition;
  /** Shows the map view on narrow screens. Absent when the map is already visible. */
  onShowMap?: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [l.id]);
  return (
    <section
      aria-label="Listing details"
      className="flex flex-col gap-3 p-4"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 ref={heading} tabIndex={-1} className={ui.heading2}>
            {l.branch.provider.name}, {l.branch.name}
          </h2>
          <p className={ui.muted}>{l.service.name}</p>
        </div>
        <button
          type="button"
          aria-label="Close listing details"
          className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-sm text-primary hover:bg-primary-soft"
          onClick={onClose}
        >
          <X aria-hidden size={20} />
        </button>
      </div>
      <p className={ui.muted}>{l.branch.address}</p>
      <div className="flex flex-col gap-1">
        <p className={ui.price}>{l.price ? formatBdt(l.price.amountBdt) : 'Price unknown'}</p>
        <div className="flex flex-wrap items-center gap-x-3 text-sm">
          <StatusBadge price={l.price} />
          <span className="text-muted">
            Website review: {formatReviewDate(l.price?.verifiedAt)}
          </span>
        </div>
        {l.price?.source && (
          <a className={linkRow} href={l.price.source.url} target="_blank" rel="noreferrer">
            Official price source
            <ExternalLink aria-hidden size={14} />
          </a>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-2">
        <div className={ui.tile}>
          <dt className={ui.tileLabel}>Straight-line distance</dt>
          <dd className={ui.tileValue}>
            {l.branch.coordinates
              ? distanceKm === null
                ? 'Not calculated'
                : formatKm(distanceKm)
              : 'Location not recorded'}
          </dd>
        </div>
        <div className={ui.tile}>
          <dt className={ui.tileLabel}>Road travel time</dt>
          <dd className={ui.tileValue}>
            {route?.available
              ? `${Math.round(route.minutes)} min`
              : route
                ? 'Unavailable'
                : 'Not requested'}
          </dd>
        </div>
      </dl>
      {!l.branch.coordinates && (
        <p className={ui.notice}>
          Location not recorded. This branch has no pin on the map. Prices and branch details stay
          available.
        </p>
      )}
      <RouteEstimate
        key={`${l.id}-${center.latitude}-${center.longitude}`}
        listing={l.id}
        center={center}
        result={route}
        onResult={onRoute}
      />
      {route?.available && route.path && onShowMap && (
        <button type="button" className={`${ui.buttonSecondary} lg:hidden`} onClick={onShowMap}>
          <MapIcon aria-hidden size={16} />
          View route on map
        </button>
      )}
      {route?.available && route.path && live && (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            aria-pressed={live.active}
            className={ui.buttonSecondary}
            onClick={live.active ? live.stop : live.start}
          >
            <LocateFixed aria-hidden size={16} />
            {live.active ? 'Stop showing my position' : 'Show my position on the route'}
          </button>
          <p className="text-sm text-muted" aria-live="polite">
            {live.message ??
              (live.active
                ? live.position
                  ? 'Your position updates on the map. It stays in this browser.'
                  : 'Waiting for your position…'
                : 'Your position stays in this browser and does not change the route.')}
          </p>
        </div>
      )}
      <a
        className={ui.buttonSecondary}
        href={directionsUrl(l.branch)}
        target="_blank"
        rel="noreferrer"
      >
        <ExternalLink aria-hidden size={16} />
        Open directions in Google Maps
      </a>
      <button
        type="button"
        aria-pressed={compared}
        disabled={compareDisabled && !compared}
        className={ui.buttonSecondary}
        onClick={onToggleCompare}
      >
        {compared ? <Check aria-hidden size={16} /> : <Plus aria-hidden size={16} />}
        {compared ? 'Remove from comparison' : 'Select for comparison'}
      </button>
      <p className="flex flex-wrap gap-x-4 text-sm">
        <a className={linkRow} href={`/branches/${l.branch.id}`}>
          Branch details
        </a>
        <a className={linkRow} href={`/reviews?listing=${l.id}`}>
          Service reviews
        </a>
        <a className={linkRow} href={`/report?target=listing&id=${l.id}`}>
          Report incorrect information
        </a>
      </p>
    </section>
  );
}
