import { useEffect, useId, useRef, useState } from 'react';
import { isValidCoordinate } from '../../map/coordinates';
import type { Coordinates } from '../../map/types';
import { DHAKA_LOCATION_PRESETS } from '../discoveryData';

interface LocationSelectorProps {
  readonly center: Coordinates;
  readonly onSelect: (coordinates: Coordinates) => void;
  readonly variant?: 'full' | 'compact';
}

export function LocationSelector({ center, onSelect, variant = 'full' }: LocationSelectorProps) {
  const compact = variant === 'compact';
  const id = useId();
  const [latitude, setLatitude] = useState(String(center.latitude));
  const [longitude, setLongitude] = useState(String(center.longitude));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [invalid, setInvalid] = useState(false);
  const request = useRef(0);
  const select = useRef(onSelect);

  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    setLatitude(String(center.latitude));
    setLongitude(String(center.longitude));
    setPending(false);
    setMessage(`Search center: ${center.latitude}, ${center.longitude}.`);
    setInvalid(false);
    return () => {
      request.current += 1;
    };
  }, [center.latitude, center.longitude]);

  function choose(coordinates: Coordinates) {
    request.current += 1;
    setPending(false);
    setInvalid(false);
    setMessage('Search location updated.');
    setLatitude(String(coordinates.latitude));
    setLongitude(String(coordinates.longitude));
    select.current(coordinates);
  }

  function locate() {
    const current = ++request.current;
    setInvalid(false);
    if (!window.isSecureContext || !navigator.geolocation) {
      setMessage('Browser location is unavailable. Use a preset or enter coordinates.');
      return;
    }
    setPending(true);
    setMessage('Waiting for browser location.');
    function fail(message: string) {
      if (request.current !== current) return;
      request.current += 1;
      setPending(false);
      setMessage(message);
    }
    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (request.current !== current) return;
          const coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          if (!isValidCoordinate(coordinates)) {
            fail('The browser returned invalid coordinates. Use a preset or enter coordinates.');
            return;
          }
          choose(coordinates);
        },
        (error) => {
          fail(
            error.code === 1
              ? 'Location permission was denied. Use a preset or enter coordinates.'
              : error.code === 3
                ? 'Location request timed out. Retry, use a preset, or enter coordinates.'
                : 'Your location could not be determined. Retry, use a preset, or enter coordinates.',
          );
        },
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 0 },
      );
    } catch {
      fail('Browser location is unavailable. Use a preset or enter coordinates.');
    }
  }

  const button =
    'medimap-preset-btn inline-flex min-h-touch items-center justify-center rounded-sm border border-border-strong bg-surface px-3 text-sm font-semibold text-ink hover:bg-primary-soft disabled:cursor-wait disabled:opacity-60 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-on-primary';
  const field =
    'min-h-touch w-full rounded-sm border border-border-strong bg-surface px-2.5 text-base text-ink aria-[invalid=true]:border-error';
  const labelClass = 'flex flex-1 flex-col gap-1 text-sm font-semibold';
  const presets = (
    <div
      className="medimap-preset-buttons grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
      role="group"
      aria-label="Dhaka landmark location presets"
    >
      {DHAKA_LOCATION_PRESETS.map((preset) => {
        const active =
          preset.coordinates.latitude === center.latitude &&
          preset.coordinates.longitude === center.longitude;
        return (
          <button
            key={preset.id}
            type="button"
            className={`${button} ${active ? 'is-active' : ''}`}
            aria-pressed={active}
            aria-label={`Set location to ${preset.name} (${preset.area})`}
            onClick={() => choose(preset.coordinates)}
          >
            {preset.name}
          </button>
        );
      })}
    </div>
  );
  const actions = (
    <div className="medimap-location-actions flex flex-wrap gap-2">
      <button
        type="button"
        className={button}
        disabled={pending}
        aria-describedby={`${id}-privacy`}
        onClick={locate}
      >
        Use my location
      </button>
      {pending && (
        <button
          type="button"
          className={button}
          onClick={() => {
            request.current += 1;
            setPending(false);
            setMessage('Location request cancelled. Your search location has not changed.');
          }}
        >
          Cancel location request
        </button>
      )}
    </div>
  );
  const form = (
    <form
      className="medimap-coordinate-form flex flex-col gap-3 sm:flex-row sm:items-end"
      noValidate
      aria-label="Manual coordinates"
      aria-describedby={`${id}-bounds ${id}-privacy`}
      onSubmit={(event) => {
        event.preventDefault();
        const coordinates = { latitude: Number(latitude), longitude: Number(longitude) };
        if (!latitude.trim() || !longitude.trim() || !isValidCoordinate(coordinates)) {
          setInvalid(true);
          setMessage(
            'Enter latitude from -90 to 90 and longitude from -180 to 180. Both values are required.',
          );
          return;
        }
        choose(coordinates);
      }}
    >
      <label htmlFor={`${id}-lat`} className={labelClass}>
        Latitude
        <input
          id={`${id}-lat`}
          className={field}
          type="number"
          step="any"
          min="-90"
          max="90"
          required
          value={latitude}
          aria-invalid={invalid}
          aria-describedby={`${id}-bounds ${id}-status`}
          onChange={(event) => setLatitude(event.target.value)}
        />
      </label>
      <label htmlFor={`${id}-lng`} className={labelClass}>
        Longitude
        <input
          id={`${id}-lng`}
          className={field}
          type="number"
          step="any"
          min="-180"
          max="180"
          required
          value={longitude}
          aria-invalid={invalid}
          aria-describedby={`${id}-bounds ${id}-status`}
          onChange={(event) => setLongitude(event.target.value)}
        />
      </label>
      <button type="submit" className={button}>
        Apply coordinates
      </button>
    </form>
  );
  const bounds = (
    <p id={`${id}-bounds`} className="medimap-location-hint text-sm text-muted">
      Latitude: -90 to 90. Longitude: -180 to 180.
    </p>
  );
  const privacy = (
    <p id={`${id}-privacy`} className="medimap-location-hint text-sm text-muted">
      Choose an area, use your browser location, or enter coordinates. Coordinates appear in this
      page&apos;s URL and any link you share.
    </p>
  );
  const status = (
    <p
      id={`${id}-status`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="medimap-location-status text-sm empty:hidden"
    >
      {message}
    </p>
  );

  if (compact)
    return (
      <section className="flex flex-col gap-3" aria-label="Search center location">
        {actions}
        <details className="rounded-md border border-border bg-surface-sunken">
          <summary className="flex min-h-touch cursor-pointer items-center px-3 text-sm font-semibold text-primary">
            More location options
          </summary>
          <div className="flex flex-col gap-3 px-3 pb-3">
            {privacy}
            {presets}
            {form}
            {bounds}
          </div>
        </details>
        {status}
      </section>
    );
  return (
    <section
      className="medimap-preset-selector flex flex-col gap-3 rounded-md border border-border bg-surface p-4"
      aria-label="Search center location"
    >
      <h3 className="medimap-preset-title text-sm font-semibold text-ink">
        Select center location
      </h3>
      {privacy}
      {presets}
      {actions}
      {form}
      {bounds}
      {status}
    </section>
  );
}
