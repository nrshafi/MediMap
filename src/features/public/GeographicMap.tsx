import type { Coordinates } from '../map/types';
export function GeographicMap({
  center,
  onSelect,
}: {
  center: Coordinates;
  onSelect: (value: Coordinates) => void;
}) {
  const z = 13,
    n = 2 ** z;
  const x = ((center.longitude + 180) / 360) * n;
  const r = (center.latitude * Math.PI) / 180;
  const y = ((1 - Math.asinh(Math.tan(r)) / Math.PI) / 2) * n;
  const left = Math.floor(x) - 1,
    top = Math.floor(y) - 1;
  return (
    <section aria-label="Geographic location selection">
      <p>
        Click the map to choose your search location. Coordinate controls provide a keyboard
        alternative.
      </p>
      <div
        className="geographic-map"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const tx = left + ((event.clientX - rect.left) / rect.width) * 3;
          const ty = top + ((event.clientY - rect.top) / rect.height) * 3;
          onSelect({
            longitude: (tx / n) * 360 - 180,
            latitude: (Math.atan(Math.sinh(Math.PI * (1 - (2 * ty) / n))) * 180) / Math.PI,
          });
        }}
      >
        {Array.from({ length: 9 }, (_, i) => (
          <img
            alt=""
            draggable={false}
            key={`${left}-${top}-${i}`}
            src={`https://tile.openstreetmap.org/${z}/${left + (i % 3)}/${top + Math.floor(i / 3)}.png`}
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
          />
        ))}
        <span
          className="map-center"
          style={{ left: `${((x - left) / 3) * 100}%`, top: `${((y - top) / 3) * 100}%` }}
        >
          Selected location
        </span>
      </div>
      <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>
    </section>
  );
}
