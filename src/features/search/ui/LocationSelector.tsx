import { useEffect, useId, useRef, useState } from 'react';
import { isValidCoordinate } from '../../map/coordinates';
import type { Coordinates } from '../../map/types';
import { DHAKA_LOCATION_PRESETS } from '../discoveryData';

interface LocationSelectorProps {
  readonly center: Coordinates;
  readonly onSelect: (coordinates: Coordinates) => void;
}

export function LocationSelector({ center, onSelect }: LocationSelectorProps) {
  const id = useId();
  const [latitude, setLatitude] = useState(String(center.latitude));
  const [longitude, setLongitude] = useState(String(center.longitude));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [invalid, setInvalid] = useState(false);
  const request = useRef(0);
  const select = useRef(onSelect);

  useEffect(() => { select.current = onSelect; }, [onSelect]);
  useEffect(() => {
    setLatitude(String(center.latitude));
    setLongitude(String(center.longitude));
    setPending(false);
    setMessage(`Search center: ${center.latitude}, ${center.longitude}.`);
    setInvalid(false);
    return () => { request.current += 1; };
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
      navigator.geolocation.getCurrentPosition((position) => {
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
      }, (error) => {
        fail(error.code === 1
          ? 'Location permission was denied. Use a preset or enter coordinates.'
          : error.code === 3
            ? 'Location request timed out. Retry, use a preset, or enter coordinates.'
            : 'Your location could not be determined. Retry, use a preset, or enter coordinates.');
      }, { enableHighAccuracy: false, timeout: 10_000, maximumAge: 0 });
    } catch {
      fail('Browser location is unavailable. Use a preset or enter coordinates.');
    }
  }

  return (
    <section className="medimap-preset-selector" aria-label="Search center location">
      <h3 className="medimap-preset-title">Select center location</h3>
      <p id={`${id}-privacy`} className="medimap-location-hint">
        Choose an area, use your browser location, or enter coordinates.
        Coordinates appear in this page&apos;s URL and any link you share.
      </p>
      <div className="medimap-preset-buttons" role="group" aria-label="Dhaka landmark location presets">
        {DHAKA_LOCATION_PRESETS.map((preset) => (
          <button key={preset.id} type="button"
            className={`medimap-preset-btn ${preset.coordinates.latitude === center.latitude && preset.coordinates.longitude === center.longitude ? 'is-active' : ''}`}
            aria-pressed={preset.coordinates.latitude === center.latitude && preset.coordinates.longitude === center.longitude}
            aria-label={`Set location to ${preset.name} (${preset.area})`}
            onClick={() => choose(preset.coordinates)}>{preset.name}</button>
        ))}
      </div>
      <div className="medimap-location-actions">
        <button type="button" className="medimap-preset-btn" disabled={pending}
          aria-describedby={`${id}-privacy`} onClick={locate}>Use my location</button>
        {pending && <button type="button" className="medimap-preset-btn" onClick={() => {
          request.current += 1;
          setPending(false);
          setMessage('Location request cancelled. Your search location has not changed.');
        }}>Cancel location request</button>}
      </div>
      <form className="medimap-coordinate-form" noValidate aria-label="Manual coordinates"
        aria-describedby={`${id}-bounds ${id}-privacy`} onSubmit={(event) => {
          event.preventDefault();
          const coordinates = { latitude: Number(latitude), longitude: Number(longitude) };
          if (!latitude.trim() || !longitude.trim() || !isValidCoordinate(coordinates)) {
            setInvalid(true);
            setMessage('Enter latitude from -90 to 90 and longitude from -180 to 180. Both values are required.');
            return;
          }
          choose(coordinates);
        }}>
        <label htmlFor={`${id}-lat`}>Latitude
          <input id={`${id}-lat`} type="number" step="any" min="-90" max="90" required
            value={latitude} aria-invalid={invalid} aria-describedby={`${id}-bounds ${id}-status`}
            onChange={(event) => setLatitude(event.target.value)} />
        </label>
        <label htmlFor={`${id}-lng`}>Longitude
          <input id={`${id}-lng`} type="number" step="any" min="-180" max="180" required
            value={longitude} aria-invalid={invalid} aria-describedby={`${id}-bounds ${id}-status`}
            onChange={(event) => setLongitude(event.target.value)} />
        </label>
        <button type="submit" className="medimap-preset-btn">Apply coordinates</button>
      </form>
      <p id={`${id}-bounds`} className="medimap-location-hint">Latitude: -90 to 90. Longitude: -180 to 180.</p>
      <p id={`${id}-status`} role="status" aria-live="polite" aria-atomic="true" className="medimap-location-status">{message}</p>
    </section>
  );
}
