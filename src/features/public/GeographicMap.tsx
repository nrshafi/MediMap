import type { Coordinates } from '../map/types';
export function GeographicMap({
  center,
  onSelect,
  branches = [],
  selected,
  onBranchSelect,
}: {
  center: Coordinates;
  onSelect?: (value: Coordinates) => void;
  branches?: { id: string; name: string; coordinates: Coordinates | null }[];
  selected?: string;
  onBranchSelect?: (id: string) => void;
}) {
  const z = 13,
    n = 2 ** z;
  const x = ((center.longitude + 180) / 360) * n;
  const r = (Math.max(-85, Math.min(85, center.latitude)) * Math.PI) / 180;
  const y = ((1 - Math.asinh(Math.tan(r)) / Math.PI) / 2) * n;
  const left = Math.floor(x) - 1,
    top = Math.floor(y) - 1;
  return (
    <section aria-label={onSelect ? 'Geographic location selection' : 'Recorded branch location'}>
      {onSelect && (
        <p>
          Click the map to choose your search location. Coordinate controls provide a keyboard
          alternative.
        </p>
      )}
      <div
        className="geographic-map"
        onClick={(event) => {
          if (!onSelect) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const tx = left + ((event.clientX - rect.left) / rect.width) * 3;
          const ty = top + ((event.clientY - rect.top) / rect.height) * 3;
          onSelect({
            longitude: (((((tx / n) * 360) % 360) + 360) % 360) - 180,
            latitude: (Math.atan(Math.sinh(Math.PI * (1 - (2 * ty) / n))) * 180) / Math.PI,
          });
        }}
      >
        {Array.from({ length: 9 }, (_, i) => (
          <img
            alt=""
            draggable={false}
            key={`${left}-${top}-${i}`}
            src={
              top + Math.floor(i / 3) < 0 || top + Math.floor(i / 3) >= n
                ? undefined
                : `https://tile.openstreetmap.org/${z}/${(left + (i % 3) + n) % n}/${top + Math.floor(i / 3)}.png`
            }
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
          />
        ))}
        {branches
          .filter((b) => b.coordinates)
          .map((branch) => {
            const point = branch.coordinates;
            if (!point) return null;
            const px = ((point.longitude + 180) / 360) * n;
            const py =
              ((1 - Math.asinh(Math.tan((point.latitude * Math.PI) / 180)) / Math.PI) / 2) * n;
            if (px < left || px > left + 3 || py < top || py > top + 3) return null;
            return (
              <button
                className="branch-map-pin"
                aria-pressed={selected === branch.id}
                aria-label={`Select ${branch.name}`}
                key={branch.id}
                style={{ left: `${((px - left) / 3) * 100}%`, top: `${((py - top) / 3) * 100}%` }}
                onClick={(event) => {
                  event.stopPropagation();
                  onBranchSelect?.(branch.id);
                }}
              >
                {branch.name}
              </button>
            );
          })}
        <span
          className="map-center"
          style={{ left: `${((x - left) / 3) * 100}%`, top: `${((y - top) / 3) * 100}%` }}
        >
          {onSelect ? 'Selected location' : 'Recorded branch location'}
        </span>
      </div>
      <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>
    </section>
  );
}
