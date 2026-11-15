import type { BranchService } from '../catalog/contracts';
import type { Coordinates } from '../map/types';
import { areaStatistics } from './statistics';
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
    <section aria-label="Area price statistics">
      <h2>Area price statistics</h2>
      <p>
        {value.count} eligible branches · {value.providers} providers · {radius} km straight-line
        radius
      </p>
      <p>
        Only current verified prices at recorded locations qualify. Prices do not expire because of
        age. Display filters do not change this population.
      </p>
      {value.enough ? (
        <dl>
          {(['lowest', 'highest', 'mean', 'median'] as const).map((key) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>BDT {value[key]?.toFixed(2)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p>
          At least three eligible branches are required. Statistics are unavailable for this area.
        </p>
      )}
    </section>
  );
}
