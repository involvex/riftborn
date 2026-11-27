import { settingsStore } from './SettingsStore';

/** Browser / Electron Fullscreen API helpers for desktop Settings + F11. */

export function isFullscreen(): boolean {
  return Boolean(document.fullscreenElement);
}

export async function setFullscreen(want: boolean): Promise<boolean> {
  try {
    if (want && !document.fullscreenElement) {
      const el = document.documentElement;
      if (typeof el.requestFullscreen === 'function') {
        await el.requestFullscreen();
      }
    } else if (!want && document.fullscreenElement) {
      if (typeof document.exitFullscreen === 'function') {
        await document.exitFullscreen();
      }
    }
  } catch {
    /* user gesture / policy — ignore */
  }
  return isFullscreen();
}

export async function toggleFullscreen(): Promise<boolean> {
  return setFullscreen(!isFullscreen());
}

/** Apply persisted setting once the document is interactive. */
export async function applyFullscreenSetting(): Promise<void> {
  const want = settingsStore.get().fullscreen;
  if (want && !isFullscreen()) {
    // requestFullscreen often requires a user gesture; F11 / Settings still work.
    await setFullscreen(true);
  }
}

/**
 * F11 toggles fullscreen and persists. Also syncs when the user exits
 * via Esc / OS chrome so Settings stays accurate.
 */
export function installFullscreenControls(): void {
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'F11') return;
    e.preventDefault();
    void toggleFullscreen().then((on) => {
      settingsStore.save({ fullscreen: on });
    });
  });

  document.addEventListener('fullscreenchange', () => {
    const on = isFullscreen();
    if (settingsStore.get().fullscreen !== on) {
      settingsStore.save({ fullscreen: on });
    }
  });
}
