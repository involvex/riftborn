/// <reference types="vite/client" />

import type { RiftbornApi } from './debug/RiftbornDebug';

declare global {
  /** Injected by Vite `define` from package.json version. */
  const __APP_VERSION__: string;
  interface Window {
    __RIFTBORN?: RiftbornApi;
  }
}

export {};
