import { ratingDimensions } from './contracts';

export interface RatingChartProps {
  dimensions: readonly number[];
  count: number;
  compact?: boolean;
  showCount?: boolean;
}

export function RatingChart({
  dimensions,
  count,
  compact = false,
  showCount = true,
}: RatingChartProps) {
  if (count <= 0 || dimensions.length !== ratingDimensions.length) return null;

  const countLabel = `Based on ${count} ${count === 1 ? 'review' : 'reviews'}`;

  return (
    // The sr-only table is absolutely positioned. Clip it inside this root so it does not widen the page.
    <div
      className={`relative overflow-hidden ${compact ? 'flex flex-col gap-1.5' : 'flex flex-col gap-2.5'}`}
    >
      {showCount && <p className="text-label text-muted">{countLabel}</p>}
      <div aria-hidden="true" className={compact ? 'flex flex-col gap-1.5' : 'flex flex-col gap-2'}>
        {ratingDimensions.map((name, index) => {
          const mean = dimensions[index] ?? 0;
          const clamped = Math.max(0, Math.min(5, mean));
          const widthPercent = `${((clamped / 5) * 100).toFixed(1)}%`;
          return (
            <div key={name} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={compact ? 'text-label text-ink' : 'text-small font-medium text-ink'}
                >
                  {name}
                </span>
                <span
                  className={
                    compact
                      ? 'text-label font-semibold tabular-nums text-ink'
                      : 'text-small font-semibold tabular-nums text-ink'
                  }
                >
                  {clamped.toFixed(1)}
                </span>
              </div>
              <div
                className={`${compact ? 'h-1.5' : 'h-2'} w-full overflow-hidden rounded-full bg-surface-sunken`}
              >
                <div className="h-full rounded-full bg-primary" style={{ width: widthPercent }} />
              </div>
            </div>
          );
        })}
      </div>
      <table className="sr-only">
        <caption>Rating averages across six dimensions ({countLabel})</caption>
        <thead>
          <tr>
            <th scope="col">Dimension</th>
            <th scope="col">Average rating out of 5</th>
          </tr>
        </thead>
        <tbody>
          {ratingDimensions.map((name, index) => {
            const clamped = Math.max(0, Math.min(5, dimensions[index] ?? 0));
            return (
              <tr key={name}>
                <th scope="row">{name}</th>
                <td>{clamped.toFixed(1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
