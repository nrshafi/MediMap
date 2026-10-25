import './setupDom';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, it } from 'node:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { LocationSelector } from '../LocationSelector';
import type { Coordinates } from '../../../map/types';

let root: Root | undefined;
let success: PositionCallback | undefined;
let container: HTMLDivElement;
let calls: Coordinates[];
const geoDescriptor = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
const secureDescriptor = Object.getOwnPropertyDescriptor(window, 'isSecureContext');
const center = { latitude: 23.7383, longitude: 90.3957 };
const position: GeolocationPosition = {
  coords: {
    latitude: 23.7946, longitude: 90.4143, accuracy: 20,
    altitude: null, altitudeAccuracy: null, heading: null, speed: null,
    toJSON: () => ({}),
  },
  timestamp: 0,
  toJSON: () => ({}),
};

function render(coordinates = center) {
  act(() => root?.render(<LocationSelector center={coordinates} onSelect={(value) => calls.push(value)} />));
}

beforeEach(() => {
  calls = [];
  success = undefined;
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: (callback: PositionCallback) => { success = callback; } },
  });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  render();
  assert.equal(success, undefined);
  const button = Array.from(container.querySelectorAll('button')).find((element) => element.textContent === 'Use my location');
  assert.ok(button);
  act(() => button.click());
  assert.ok(success);
});

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  container.remove();
  if (geoDescriptor) Object.defineProperty(navigator, 'geolocation', geoDescriptor);
  else Reflect.deleteProperty(navigator, 'geolocation');
  if (secureDescriptor) Object.defineProperty(window, 'isSecureContext', secureDescriptor);
  else Reflect.deleteProperty(window, 'isSecureContext');
});

it('ignores a location callback after the component is removed', () => {
  act(() => root?.unmount());
  root = undefined;
  act(() => success?.(position));
  assert.deepEqual(calls, []);
});

it('ignores a location callback after an external center change and synchronizes manual fields', () => {
  render({ latitude: 24, longitude: 91 });
  act(() => success?.(position));
  assert.deepEqual(calls, []);
  const inputs = container.querySelectorAll('input');
  assert.equal(inputs[0]?.value, '24');
  assert.equal(inputs[1]?.value, '91');
  assert.doesNotMatch(container.textContent ?? '', /Waiting for browser location/);
});

it('rejects invalid browser coordinates without changing the center', () => {
  act(() => success?.({ ...position, coords: { ...position.coords, latitude: NaN } }));
  assert.deepEqual(calls, []);
  assert.match(container.querySelector('[role="status"]')?.textContent ?? '', /invalid coordinates/);
});
