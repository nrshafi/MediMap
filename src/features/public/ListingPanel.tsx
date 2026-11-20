import { useEffect, useRef, useState } from 'react';
import { ExternalLink, LocateFixed, Map as MapIcon, Navigation, X } from 'lucide-react';
import type { Coordinates } from '../map/types';
import type { BranchService } from '../catalog/contracts';
import { Button, ButtonLink } from '../../ui/Button';
import { Notice } from '../../ui/Notice';
import { Skeleton } from '../../ui/Skeleton';
import { StatTile } from '../../ui/StatTile';
import { StatusBadge } from '../../ui/Badge';
import { Link } from '../../ui/Link';
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

const linkRow =
  'font-medium text-primary underline-offset-2 hover:underline inline-flex min-h-touch items-center gap-1';

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
      <Button
        variant="primary"
        pending={pending}
        icon={<Navigation aria-hidden size={16} />}
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
        {pending ? 'Finding route…' : result?.available ? 'Update route' : 'Show route'}
      </Button>
      {pending && (
        <div className="py-1">
          <Skeleton role="presentation" aria-hidden="true" variant="text" lines={2} />
        </div>
      )}
      <p role="status" className={pending ? 'sr-only' : 'text-small text-muted'}>
        {result?.available
          ? `Road distance ${formatKm(result.roadKm)} · Estimated travel time ${Math.round(result.minutes)} minutes, without live traffic. Route from Google Maps.`
          : (result?.message ?? 'The driving route has not been requested.')}
      </p>
      {result?.available && result.steps && result.steps.length > 0 && (
        <details className="rounded-sm border border-border p-2">
          <summary className="min-h-touch cursor-pointer content-center text-small font-semibold text-ink">
            Driving steps ({result.steps.length})
          </summary>
          <ol className="mt-2 flex list-decimal flex-col gap-2 pl-5 text-small">
            {result.steps.map((step, index) => (
              <li key={index}>
                {step.instruction}
                {step.distanceMeters !== null && (
                  <span className="text-muted"> · {formatMeters(step.distanceMeters)}</span>
                )}
              </li>
            ))}
          </ol>
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
  onClose,
  live,
  onShowMap,
  isBottomSheet,
}: {
  listing: BranchService;
  center: Coordinates;
  distanceKm: number | null;
  route: RouteResult | undefined;
  onRoute: (value: RouteResult) => void;
  onClose: () => void;
  live?: LivePosition;
  /** Shows the map view on narrow screens. Absent when the map is already visible. */
  onShowMap?: () => void;
  isBottomSheet?: boolean;
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
      {isBottomSheet && (
        <div className="flex justify-center pb-1 lg:hidden" aria-hidden="true">
          <div className="h-1 w-12 rounded-full bg-border-strong/60" />
        </div>
      )}
      <header className="flex flex-col gap-2 border-b border-border pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2
              ref={heading}
              tabIndex={-1}
              className="font-display text-h2 font-bold text-ink outline-none"
            >
              {l.branch.provider.name}, {l.branch.name}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close listing details"
            className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-sm text-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            onClick={onClose}
          >
            <X aria-hidden size={20} />
          </button>
        </div>
        <div className="text-small text-muted">
          <p className="font-medium text-ink">{l.service.name}</p>
          <p>{l.branch.address}</p>
        </div>
      </header>

      <div className="flex flex-col gap-1.5">
        <p className="text-price tabular-nums text-ink">
          {l.price ? formatBdt(l.price.amountBdt) : 'Price unknown'}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 text-small">
          <StatusBadge price={l.price} />
          <span className="text-muted">{formatReviewDate(l.price?.verifiedAt)}</span>
          {l.price?.source && (
            <a className={linkRow} href={l.price.source.url} target="_blank" rel="noreferrer">
              Source
              <ExternalLink aria-hidden size={14} />
            </a>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-2">
        <StatTile
          label="Straight-line distance"
          value={
            l.branch.coordinates
              ? distanceKm === null
                ? 'Not calculated'
                : formatKm(distanceKm)
              : 'Unknown'
          }
        />
      </dl>

      {!l.branch.coordinates && (
        <Notice kind="info">
          Location not recorded. This branch has no pin on the map. Prices and branch details stay
          available.
        </Notice>
      )}

      <RouteEstimate
        key={`${l.id}-${center.latitude}-${center.longitude}`}
        listing={l.id}
        center={center}
        result={route}
        onResult={onRoute}
      />

      {route?.available && route.path && onShowMap && (
        <Button
          variant="secondary"
          className="lg:hidden"
          icon={<MapIcon aria-hidden size={16} />}
          onClick={onShowMap}
        >
          View route on map
        </Button>
      )}

      {route?.available && route.path && live && (
        <div className="flex flex-col gap-1">
          <Button
            variant="secondary"
            aria-pressed={live.active}
            icon={<LocateFixed aria-hidden size={16} />}
            onClick={live.active ? live.stop : live.start}
          >
            {live.active ? 'Stop showing my position' : 'Show my position on the route'}
          </Button>
          <p className="text-small text-muted" aria-live="polite">
            {live.message ??
              (live.active
                ? live.position
                  ? 'Your position updates on the map. It stays in this browser.'
                  : 'Waiting for your position…'
                : 'Your position stays in this browser and does not change the route.')}
          </p>
        </div>
      )}

      <ButtonLink
        variant="secondary"
        href={directionsUrl(l.branch)}
        target="_blank"
        rel="noreferrer"
        icon={<ExternalLink aria-hidden size={16} />}
      >
        Open directions in Google Maps
      </ButtonLink>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3 text-small">
        <Link className={linkRow} to={`/branches/${l.branch.id}`}>
          Branch details
        </Link>
        <Link className={linkRow} to={`/reviews?listing=${l.id}`}>
          Service reviews
        </Link>
        <Link className={linkRow} to={`/report?target=listing&id=${l.id}`}>
          Report incorrect information
        </Link>
      </div>
    </section>
  );
}
