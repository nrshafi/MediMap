import { GlobalWindow } from 'happy-dom';

const win = new GlobalWindow({ url: 'http://localhost:3000' });

// Assign window and DOM properties to globalThis BEFORE any React DOM modules are imported
Object.assign(globalThis, {
  window: win,
  document: win.document,
  navigator: win.navigator,
  HTMLElement: win.HTMLElement,
  HTMLInputElement: win.HTMLInputElement,
  HTMLButtonElement: win.HTMLButtonElement,
  Event: win.Event,
  CustomEvent: win.CustomEvent,
  KeyboardEvent: win.KeyboardEvent,
  MouseEvent: win.MouseEvent,
  requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(cb, 0),
  cancelAnimationFrame: (id: number) => clearTimeout(id),
  IS_REACT_ACT_ENVIRONMENT: true,
});

export { win };
