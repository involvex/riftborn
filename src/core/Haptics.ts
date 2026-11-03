import { settingsStore } from './SettingsStore';

/** Short pad tap vibration when the platform + setting allow it. */
export function hapticTap(ms = 12): void {
  try {
    if (!settingsStore.get().haptics) return;
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    if (!nav || typeof nav.vibrate !== 'function') return;
    nav.vibrate(ms);
  } catch {
    /* ignore — vibrate is best-effort */
  }
}
