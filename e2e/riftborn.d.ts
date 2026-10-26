import type { RiftbornApi } from '../src/debug/RiftbornDebug';

declare global {
  interface Window {
    __RIFTBORN?: RiftbornApi;
  }
}

export {};
