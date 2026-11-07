import { currentGraphicsProfile } from '../core/GraphicsQuality';
import { settingsStore } from '../core/SettingsStore';

/** Short camera punch on layer shift — no hitstop, no extra input lag. */
export const SHIFT_SHAKE_MS = 100;
export const SHIFT_SHAKE_INTENSITY = 0.005;

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function shiftShakeParams(
  fxIntensity: number,
  opts?: { screenShake?: boolean; juiceScale?: number },
): { ms: number; intensity: number } {
  const screenShake = opts?.screenShake ?? settingsStore.get().screenShake;
  const juiceScale = opts?.juiceScale ?? currentGraphicsProfile().juiceScale;
  const i = clamp01(fxIntensity);
  if (!screenShake || i <= 0) return { ms: 0, intensity: 0 };
  return {
    ms: Math.round(SHIFT_SHAKE_MS * juiceScale * i),
    intensity: SHIFT_SHAKE_INTENSITY * Math.min(1, juiceScale + 0.25) * i,
  };
}
