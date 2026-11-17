/// <reference types="google.maps" />
import { useEffect, useRef, useState } from 'react';
import { AdvancedMarker, APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { MapPin } from 'lucide-react';
import { ui } from '../../ui/styles';
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
    <div role="status" className={`${ui.alertError} m-4`}>
      <p className="font-semibold">Map unavailable</p>
      <p>
        The map could not load. Prices, branch details, and the location form still work. Use the
        address search, coordinates, or browser location to set your search location.
      </p>
    </div>
  );
}

export function MapPlaceholder() {
  return (
    <div
      role="status"
      className="flex h-full min-h-48 items-center justify-center bg-surface-sunken p-4 text-sm text-muted"
    >
      <MapPin aria-hidden size={20} className="mr-2" />
      Map loads in your browser.
    </div>
  );
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
}: {
  apiKey: string;
  center: Coordinates;
  pins: MapPinData[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  onPickLocation?: (value: Coordinates) => void;
  onUnavailable?: () => void;
  showUser?: boolean;
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
          <FitBounds center={center} pins={pins} />
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
                zIndex={active ? 3 : 2}
                onClick={() => onSelect?.(pin.id)}
              >
                <div className="flex min-h-touch min-w-touch items-center justify-center">
                  <div
                    className={`flex h-8 max-w-40 items-center rounded-full border px-2 text-xs font-semibold ${active ? 'border-primary bg-primary text-on-primary' : 'border-border-strong bg-surface text-ink'}`}
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
        <p className="absolute left-3 top-3 rounded-sm bg-ink px-2 py-2 text-xs font-semibold text-on-ink shadow-[0_8px_24px_rgb(20_61_60/0.16)]">
          Click the map to choose your search location
        </p>
      )}
    </div>
  );
}
