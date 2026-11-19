import { Check, ExternalLink, Plus } from 'lucide-react';
import type { BranchService } from '../catalog/contracts';
import { Card } from '../../ui/Card';
import { Chip } from '../../ui/Chip';
import { StatTile } from '../../ui/StatTile';
import { StatusBadge } from '../../ui/Badge';
import { formatBdt, formatKm, type RouteResult, formatReviewDate } from './format';

const linkRow =
  'font-medium text-primary underline-offset-2 hover:underline inline-flex min-h-touch items-center';

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
    <Card
      as="article"
      id={`listing-${l.id}`}
      data-selected={selected ? 'true' : undefined}
      data-select-listing={l.id}
      onClick={(event) => {
        if (!onSelect) return;
        const target = event.target as HTMLElement | null;
        if (target?.closest('a, button')) return;
        onSelect();
      }}
      className={`flex flex-col gap-3 transition-all duration-fast ${
        onSelect ? 'cursor-pointer' : ''
      } ${
        selected
          ? 'border-primary bg-primary-soft shadow-card ring-2 ring-primary'
          : 'hover:border-border-strong hover:shadow-lift'
      }`}
    >
      <header>
        <h3 className="font-display text-h2 font-bold text-ink">
          {onSelect ? (
            <button
              type="button"
              aria-expanded={selected}
              onClick={onSelect}
              className="text-left font-display text-h2 font-bold text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {l.branch.provider.name}, {l.branch.name}
            </button>
          ) : (
            <>
              {l.branch.provider.name}, {l.branch.name}
            </>
          )}
        </h3>
        <p className="text-small text-muted">
          <a
            className="font-medium text-primary underline-offset-2 hover:underline"
            href={serviceHref}
            onClick={(event) => event.stopPropagation()}
          >
            {l.service.name}
          </a>
          {l.providerServiceName !== l.service.name && (
            <> · listed by the provider as {l.providerServiceName}</>
          )}
        </p>
        <p className="text-small text-muted">{l.branch.address}</p>
      </header>
      <dl className={`grid gap-2 ${route?.available ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <StatTile
          label="Price"
          value={
            <span className="text-price tabular-nums text-ink">
              {l.price ? formatBdt(l.price.amountBdt) : 'Unknown'}
            </span>
          }
        />
        <StatTile
          label="Straight-line"
          value={
            l.branch.coordinates
              ? typeof distanceKm === 'number'
                ? formatKm(distanceKm)
                : 'Not calculated'
              : 'Location not recorded'
          }
        />
        {route?.available && (
          <StatTile label="Road time" value={`${Math.round(route.minutes)} min`} />
        )}
      </dl>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small">
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
          <Chip
            pressed={compared}
            disabled={compareDisabled && !compared}
            icon={compared ? <Check aria-hidden size={16} /> : <Plus aria-hidden size={16} />}
            onClick={(event) => {
              event.stopPropagation();
              onToggleCompare();
            }}
          >
            {compared ? 'Remove from comparison' : 'Select for comparison'}
          </Chip>
        </div>
      )}
    </Card>
  );
}
