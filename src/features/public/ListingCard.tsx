import { Check, ExternalLink, Plus } from 'lucide-react';
import type { BranchService } from '../catalog/contracts';
import { ui } from '../../ui/styles';
import { StatusBadge } from '../../ui/Badge';
import { formatBdt, formatKm, type RouteResult, formatReviewDate } from './format';

const linkRow = `${ui.link} inline-flex min-h-touch items-center`;

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
      data-select-listing={l.id}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (onSelect && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`${ui.card} flex flex-col gap-3 ${onSelect ? 'cursor-pointer' : ''} ${selected ? 'border-primary bg-primary-soft outline outline-2 outline-primary' : 'hover:border-border-strong'}`}
    >
      <header>
        <h3 className={ui.heading2}>
          {l.branch.provider.name}, {l.branch.name}
        </h3>
        <p className={ui.muted}>
          <a className={ui.link} href={serviceHref} onClick={(event) => event.stopPropagation()}>
            {l.service.name}
          </a>
          {l.providerServiceName !== l.service.name && (
            <> · listed by the provider as {l.providerServiceName}</>
          )}
        </p>
        <p className={ui.muted}>{l.branch.address}</p>
      </header>
      <dl className={`grid gap-2 ${route?.available ? 'grid-cols-3' : 'grid-cols-2'}`}>
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
        {route?.available && (
          <div className={ui.tile}>
            <dt className={ui.tileLabel}>Road time</dt>
            <dd className={ui.tileValue}>{`${Math.round(route.minutes)} min`}</dd>
          </div>
        )}
      </dl>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <StatusBadge price={l.price} />
        <span className="text-muted">{formatReviewDate(l.price?.verifiedAt)}</span>
        {l.price?.source && (
          <a
            className={`${linkRow} gap-1`}
            href={l.price.source.url}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
          >
            Source
            <ExternalLink aria-hidden size={14} />
          </a>
        )}
      </div>
      {onToggleCompare && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={compared}
            disabled={compareDisabled && !compared}
            className={`${ui.chip} disabled:cursor-not-allowed disabled:opacity-60`}
            onClick={(event) => {
              event.stopPropagation();
              onToggleCompare();
            }}
          >
            {compared ? <Check aria-hidden size={16} /> : <Plus aria-hidden size={16} />}
            {compared ? 'Remove from comparison' : 'Select for comparison'}
          </button>
        </div>
      )}
    </article>
  );
}
