import { Check, ExternalLink, Plus } from 'lucide-react';
import type { BranchService } from '../catalog/contracts';
import { ui } from '../../ui/styles';
import { StatusBadge } from '../../ui/Badge';
import { formatBdt, formatKm, type RouteResult, formatReviewDate } from './format';

export { StatusBadge };

const linkRow = `${ui.link} inline-flex min-h-touch items-center`;

function roadValue(route: RouteResult | undefined) {
  if (!route) return 'Not requested';
  return route.available ? `${Math.round(route.minutes)} min` : 'Unavailable';
}

export function ListingCard({
  listing: l,
  area,
  distanceKm,
  route,
  selected,
  compared,
  compareDisabled,
  onSelect,
  onToggleCompare,
}: {
  listing: BranchService;
  area?: { lat: number; lng: number; radius: number };
  distanceKm?: number | null;
  route?: RouteResult;
  selected?: boolean;
  compared?: boolean;
  compareDisabled?: boolean;
  onSelect?: () => void;
  onToggleCompare?: () => void;
}) {
  const serviceHref = `/services/${l.service.id}${area ? `?${new URLSearchParams({ lat: String(area.lat), lng: String(area.lng), radius: String(area.radius) })}` : ''}`;
  return (
    <article
      id={`listing-${l.id}`}
      data-selected={selected ? 'true' : undefined}
      className={`${ui.card} flex flex-col gap-3 ${selected ? 'border-primary bg-primary-soft outline outline-2 outline-primary' : 'hover:border-border-strong'}`}
    >
      <header>
        <h3 className={ui.heading2}>
          {l.branch.provider.name}, {l.branch.name}
        </h3>
        <p className={ui.muted}>
          <a className={ui.link} href={serviceHref}>
            {l.service.name}
          </a>
          {l.providerServiceName !== l.service.name && (
            <> · listed by the provider as {l.providerServiceName}</>
          )}
        </p>
        <p className={ui.muted}>{l.branch.address}</p>
      </header>
      <dl className="grid grid-cols-3 gap-2">
        <div className={ui.tile}>
          <dt className={ui.tileLabel}>Price</dt>
          <dd className={ui.tileValue}>{l.price ? formatBdt(l.price.amountBdt) : 'Unknown'}</dd>
        </div>
        <div className={ui.tile}>
          <dt className={ui.tileLabel}>Straight-line</dt>
          <dd className={ui.tileValue}>
            {l.branch.coordinates
              ? typeof distanceKm === 'number'
                ? formatKm(distanceKm)
                : 'Not calculated'
              : 'Location not recorded'}
          </dd>
        </div>
        <div className={ui.tile}>
          <dt className={ui.tileLabel}>Road time</dt>
          <dd className={ui.tileValue}>{roadValue(route)}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0 text-sm">
        <StatusBadge price={l.price} />
        <span className="text-muted">Website review: {formatReviewDate(l.price?.verifiedAt)}</span>
        {l.price?.source && (
          <a
            className={`${linkRow} gap-1`}
            href={l.price.source.url}
            target="_blank"
            rel="noreferrer"
          >
            Official price source
            <ExternalLink aria-hidden size={14} />
          </a>
        )}
      </div>
      {(onSelect || onToggleCompare) && (
        <div className="flex flex-wrap gap-2">
          {onSelect && (
            <button
              type="button"
              data-select-listing={l.id}
              aria-pressed={selected}
              className={ui.chip}
              onClick={onSelect}
            >
              {selected ? 'Showing details' : 'Show details'}
            </button>
          )}
          {onToggleCompare && (
            <button
              type="button"
              aria-pressed={compared}
              disabled={compareDisabled && !compared}
              className={`${ui.chip} disabled:cursor-not-allowed disabled:opacity-60`}
              onClick={onToggleCompare}
            >
              {compared ? <Check aria-hidden size={16} /> : <Plus aria-hidden size={16} />}
              {compared ? 'Remove from comparison' : 'Select for comparison'}
            </button>
          )}
        </div>
      )}
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
    </article>
  );
}
