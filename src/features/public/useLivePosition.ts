import { useEffect, useState } from 'react';
import type { Coordinates } from '../map/types';

export type LivePosition = {
  active: boolean;
  position: Coordinates | null;
  message: string | null;
  start: () => void;
  stop: () => void;
};

/**
 * Follows the browser position after a user action. The position stays in this
 * browser: it is not sent to the server, put in the URL, or used to request routes.
 */
export function useLivePosition(): LivePosition {
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!active) return;
    if (!('geolocation' in navigator)) {
      setMessage('This browser cannot share its location.');
      setActive(false);
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (event) => {
        setPosition({ latitude: event.coords.latitude, longitude: event.coords.longitude });
        setMessage(null);
      },
      (error) => {
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied. The route stays on the map.'
            : 'Your current position is unavailable. The route stays on the map.',
        );
        setActive(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [active]);
  return {
    active,
    position: active ? position : null,
    message,
    start: () => {
      setMessage(null);
      setActive(true);
    },
    stop: () => {
      setActive(false);
      setPosition(null);
    },
  };
}
