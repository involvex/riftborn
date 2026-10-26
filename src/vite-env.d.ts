/// <reference types="vite/client" />

import type { RiftbornApi } from './debug/RiftbornDebug';

declare global {
  interface Window {
    __RIFTBORN?: RiftbornApi;
  }
}

export {};
