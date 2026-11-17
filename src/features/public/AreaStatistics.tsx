import type { BranchService } from '../catalog/contracts';
import type { Coordinates } from '../map/types';
import { ui } from '../../ui/styles';
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
    <section aria-label="Area price statistics" className={`${ui.card} flex flex-col gap-2 p-3`}>
      <h2 className="text-sm font-bold text-ink">Area price statistics</h2>
      <p className={ui.muted}>
        {value.count} eligible branches · {value.providers} providers · {radius} km straight-line
        radius
      </p>
      {value.enough ? (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(['lowest', 'highest', 'mean', 'median'] as const).map((key) => (
            <div key={key} className={ui.tile}>
              <dt className={ui.tileLabel}>{labels[key]}</dt>
              <dd className={ui.tileValue}>
                {value[key] == null ? 'Unknown' : formatBdt(value[key])}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className={ui.muted}>
          At least three eligible branches are required. Statistics are unavailable for this area.
        </p>
      )}
      <details className="text-sm text-muted">
        <summary className="flex min-h-touch cursor-pointer items-center font-semibold text-primary">
          How these numbers are calculated
        </summary>
        <p>
          Only current verified prices at recorded locations qualify. Prices do not expire because
          of age. Display filters do not change this population.
        </p>
      </details>
    </section>
  );
}
