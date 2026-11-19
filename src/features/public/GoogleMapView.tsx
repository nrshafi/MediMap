/// <reference types="google.maps" />
import { useEffect, useRef, useState } from 'react';
import { AdvancedMarker, APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { MapPin } from 'lucide-react';
import { Notice } from '../../ui/Notice';
import type { Coordinates } from '../map/types';

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

export type MapPinData = {
  id: string;
  name: string;
  label: string;
  coordinates: Coordinates;
};

export function MapUnavailable() {
  return (
    <div className="m-4">
      <Notice kind="error" title="Map unavailable">
        The map could not load. Prices, branch details, and the location form still work. Use the
        address search, coordinates, or browser location to set your search location.
      </Notice>
    </div>
  );
}

export function MapPlaceholder() {
  return (
    <div
      role="status"
      className="flex h-full min-h-48 items-center justify-center bg-surface-sunken p-4 text-small text-muted"
    >
      <MapPin aria-hidden size={20} className="mr-2" />
      Map loads in your browser.
    </div>
  );
}

function RouteLine({ path }: { path: Coordinates[] }) {
  const map = useMap();
  const signature = `${path.length}:${path[0]?.latitude},${path[0]?.longitude}:${path.at(-1)?.latitude},${path.at(-1)?.longitude}`;
  useEffect(() => {
    if (!map || path.length < 2) return;
    const points = path.map((p) => ({ lat: p.latitude, lng: p.longitude }));
    // Two strokes: a wide light casing under a narrower route line keeps the route readable on any road colour.
    const casing = new google.maps.Polyline({
      path: points,
      strokeColor: '#ffffff',
      strokeOpacity: 1,
      strokeWeight: 8,
      clickable: false,
      zIndex: 1,
      map,
    });
    const line = new google.maps.Polyline({
      path: points,
      strokeColor:
        getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() ||
        '#0f746b',
      strokeOpacity: 1,
      strokeWeight: 5,
      clickable: false,
      zIndex: 2,
      map,
    });
    const bounds = new google.maps.LatLngBounds();
    for (const point of points) bounds.extend(point);
    map.fitBounds(bounds, 64);
    return () => {
      casing.setMap(null);
      line.setMap(null);
    };
  }, [map, signature]);
  return null;
}

function FitBounds({ center, pins }: { center: Coordinates; pins: MapPinData[] }) {
  const map = useMap();
  const fitted = useRef(false);
  const signature = `${center.latitude},${center.longitude}|${pins.map((p) => `${p.id}:${p.coordinates.latitude},${p.coordinates.longitude}`).join(';')}`;
  useEffect(() => {
    if (!map) return;
    const point = { lat: center.latitude, lng: center.longitude };
    if (!pins.length) {
      map.panTo(point);
      if (!fitted.current) map.setZoom(14);
      fitted.current = true;
      return;
    }
    const bounds = new google.maps.LatLngBounds(point);
    for (const pin of pins)
      bounds.extend({ lat: pin.coordinates.latitude, lng: pin.coordinates.longitude });
    if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
      map.setCenter(point);
      map.setZoom(15);
    } else map.fitBounds(bounds, 64);
    fitted.current = true;
  }, [map, signature]);
  return null;
}

export function GoogleMapView({
  apiKey,
  center,
  pins,
  selectedId,
  onSelect,
  onPickLocation,
  onUnavailable,
  showUser = true,
  route,
  livePosition,
}: {
  apiKey: string;
  center: Coordinates;
  pins: MapPinData[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  onPickLocation?: (value: Coordinates) => void;
  onUnavailable?: () => void;
  showUser?: boolean;
  /** Driving route from the search location to the selected branch. */
  route?: Coordinates[];
  /** The user's current browser position while live tracking is on. */
  livePosition?: Coordinates | null;
}) {
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState(false);
  const report = useRef(onUnavailable);
  report.current = onUnavailable;
  useEffect(() => {
    const previous = window.gm_authFailure;
    window.gm_authFailure = () => {
      setFailed(true);
      report.current?.();
    };
    return () => {
      window.gm_authFailure = previous;
    };
  }, []);
  if (failed) return <MapUnavailable />;
  return (
    <div className="relative h-full w-full">
      <APIProvider
        apiKey={apiKey}
        onError={() => {
          setFailed(true);
          report.current?.();
        }}
      >
        <Map
          mapId="DEMO_MAP_ID"
          defaultCenter={{ lat: center.latitude, lng: center.longitude }}
          defaultZoom={14}
          gestureHandling="greedy"
          disableDefaultUI
          zoomControl
          clickableIcons={false}
          style={{ width: '100%', height: '100%' }}
          onClick={(event) => {
            const point = event.detail.latLng;
            if (!onPickLocation || !point) return;
            setPicked(true);
            onPickLocation({ latitude: point.lat, longitude: point.lng });
          }}
        >
          {route && route.length > 1 ? (
            <RouteLine path={route} />
          ) : (
            <FitBounds center={center} pins={pins} />
          )}
          {livePosition && (
            <AdvancedMarker
              position={{ lat: livePosition.latitude, lng: livePosition.longitude }}
              title="Your current position"
              zIndex={4}
            >
              <div className="size-4 rounded-full border-2 border-on-primary bg-primary shadow-[0_0_0_6px_rgb(15_116_107/0.25)]" />
            </AdvancedMarker>
          )}
          {showUser && (
            <AdvancedMarker
              position={{ lat: center.latitude, lng: center.longitude }}
              title="Your search location"
              zIndex={1}
            >
              <div className="size-5 rounded-full border-2 border-on-ink bg-ink" />
            </AdvancedMarker>
          )}
          {pins.map((pin) => {
            const active = pin.id === selectedId;
            return (
              <AdvancedMarker
                key={pin.id}
                position={{ lat: pin.coordinates.latitude, lng: pin.coordinates.longitude }}
                title={onSelect ? `Select ${pin.name}` : pin.name}
                zIndex={active ? 10 : 2}
                onClick={() => onSelect?.(pin.id)}
              >
                <div className="flex min-h-touch min-w-touch items-center justify-center">
                  <div
                    className={`flex h-8 max-w-40 items-center rounded-full border px-2.5 text-label font-bold transition-all duration-fast ${
                      active
                        ? 'scale-110 border-primary bg-primary text-on-primary shadow-lift ring-2 ring-primary ring-offset-2'
                        : 'border-border-strong bg-surface text-ink shadow-card hover:border-primary hover:text-primary'
                    }`}
                  >
                    <span className="truncate">{pin.label}</span>
                  </div>
                </div>
              </AdvancedMarker>
            );
          })}
        </Map>
      </APIProvider>
      {onPickLocation && !picked && (
        <p className="absolute left-3 top-3 rounded-sm bg-ink px-2 py-2 text-label font-semibold text-on-ink shadow-overlay">
          Click the map to choose your search location
        </p>
      )}
    </div>
  );
}
