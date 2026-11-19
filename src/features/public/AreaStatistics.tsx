import type { BranchService } from '../catalog/contracts';
import type { Coordinates } from '../map/types';
import { Card } from '../../ui/Card';
import { StatTile } from '../../ui/StatTile';
import { formatBdt } from './format';
import { areaStatistics } from './statistics';

const labels = { lowest: 'Lowest', highest: 'Highest', mean: 'Mean', median: 'Median' } as const;

export function AreaStatistics({
  listings,
  center,
  radius,
}: {
  listings: BranchService[];
  center: Coordinates;
  radius: number;
}) {
  const value = areaStatistics(listings, center, radius);
  return (
    <Card as="section" aria-label="Area price statistics" className="flex flex-col gap-2.5 p-3">
      <h2 className="text-small font-bold text-ink">Area price statistics</h2>
      <p className="text-small text-muted">
        {value.count} eligible branches · {value.providers} providers · {radius} km straight-line
        radius
      </p>
      {value.enough ? (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(['lowest', 'highest', 'mean', 'median'] as const).map((key) => (
            <StatTile
              key={key}
              label={labels[key]}
              value={value[key] == null ? 'Unknown' : formatBdt(value[key])}
            />
          ))}
        </dl>
      ) : (
        <p className="text-small text-muted">
          At least three eligible branches are required. Statistics are unavailable for this area.
        </p>
      )}
      <details className="text-small text-muted">
        <summary className="flex min-h-touch cursor-pointer items-center font-semibold text-primary">
          How these numbers are calculated
        </summary>
        <p className="mt-1 leading-relaxed">
          Only current verified prices at recorded locations qualify. Prices do not expire because
          of age. Display filters do not change this population.
        </p>
      </details>
    </Card>
  );
}
