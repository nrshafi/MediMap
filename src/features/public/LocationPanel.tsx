import { useRef, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import type { Coordinates } from '../map/types';
import { DHAKA_LOCATION_PRESETS } from '../search/discoveryData';
import { LocationSelector } from '../search/ui/LocationSelector';
import { Button } from '../../ui/Button';
import { Field, fieldControlStyles } from '../../ui/Field';
import { Notice } from '../../ui/Notice';
import { findLocation, selectLocation } from './catalog.functions';

type Suggestion = { placeId: string; label: string };
type NoticeState = { kind: 'error' | 'info'; text: string };

export function locationLabel(center: Coordinates, custom?: string) {
  if (custom) return custom;
  const preset = DHAKA_LOCATION_PRESETS.find(
    (p) =>
      p.coordinates.latitude === center.latitude && p.coordinates.longitude === center.longitude,
  );
  return preset?.name ?? `${center.latitude.toFixed(4)}, ${center.longitude.toFixed(4)}`;
}

export function LocationPanel({
  center,
  label,
  onSelect,
  showAttribution,
}: {
  center: Coordinates;
  label?: string;
  onSelect: (coordinates: Coordinates, label?: string) => void;
  showAttribution: boolean;
}) {
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [pending, setPending] = useState(false);
  const generation = useRef(0);
  const token = useRef<string | null>(null);

  function reset() {
    generation.current++;
    setSuggestions([]);
    setNotice(null);
    setPending(false);
  }

  return (
    <section aria-label="Choose your location" className="flex flex-col gap-3">
      <h2 className="font-display text-h2 font-bold text-ink">Your location</h2>
      <p className="flex items-center gap-2 text-small text-ink">
        <MapPin aria-hidden size={16} className="shrink-0 text-primary" />
        <span>
          Searching near <strong>{locationLabel(center, label)}</strong>
        </span>
      </p>
      <form
        className="flex flex-col gap-2.5"
        onSubmit={async (event) => {
          event.preventDefault();
          const current = ++generation.current;
          token.current ??= crypto.randomUUID();
          setPending(true);
          setSuggestions([]);
          setNotice(null);
          try {
            const result = await findLocation({
              data: { query: address, sessionToken: token.current },
            });
            if (current !== generation.current) return;
            setSuggestions(result.suggestions);
            if (result.message) {
              setNotice({
                kind: result.suggestions.length > 0 ? 'info' : 'error',
                text: result.message,
              });
            }
          } catch {
            if (current !== generation.current) return;
            setNotice({
              kind: 'error',
              text: 'Address lookup is unavailable. Your previous location is unchanged.',
            });
          } finally {
            if (current === generation.current) setPending(false);
          }
        }}
      >
        <Field label="Dhaka address" required>
          <input
            className={fieldControlStyles}
            value={address}
            minLength={3}
            maxLength={160}
            required
            autoComplete="off"
            onChange={(event) => {
              reset();
              token.current = null;
              setAddress(event.target.value);
            }}
          />
        </Field>
        <Button
          type="submit"
          variant="primary"
          pending={pending}
          icon={<Search aria-hidden size={16} />}
        >
          {pending ? 'Finding address…' : 'Find address'}
        </Button>
      </form>
      <div data-testid="address-message" className="empty:hidden" aria-live="polite">
        {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-col gap-1">
          <ul className="flex flex-col gap-1">
            {suggestions.map((suggestion) => (
              <li key={suggestion.placeId}>
                <Button
                  variant="secondary"
                  className="w-full justify-start text-left"
                  onClick={async () => {
                    const current = ++generation.current;
                    const sessionToken = token.current ?? crypto.randomUUID();
                    try {
                      const result = await selectLocation({
                        data: { placeId: suggestion.placeId, sessionToken },
                      });
                      if (current !== generation.current) return;
                      token.current = null;
                      if (result.place) {
                        setSuggestions([]);
                        setNotice({ kind: 'info', text: `Selected ${result.place.label}` });
                        onSelect(
                          { latitude: result.place.latitude, longitude: result.place.longitude },
                          result.place.label,
                        );
                      } else {
                        setNotice({ kind: 'error', text: result.message });
                      }
                    } catch {
                      if (current !== generation.current) return;
                      setNotice({
                        kind: 'error',
                        text: 'That address could not be loaded. Your previous location is unchanged.',
                      });
                    }
                  }}
                >
                  {suggestion.label}
                </Button>
              </li>
            ))}
          </ul>
          {showAttribution && <p className="text-label font-semibold text-muted">Google Maps</p>}
        </div>
      )}
      <LocationSelector
        variant="compact"
        center={center}
        onSelect={(coordinates) => {
          reset();
          onSelect(coordinates);
        }}
      />
    </section>
  );
}
