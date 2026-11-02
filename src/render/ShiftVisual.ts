import { SHIFT_LAYERS, type ShiftLayerId } from '../data/shiftLayers';

/** Max screen flash / wave duration (phase: ≤300ms). */
export const SHIFT_TRANSITION_MS = 280;

function channel(n: number, shift: number): number {
  return (n >> shift) & 0xff;
}

/** Linear blend of two 0xRRGGBB colors. t in 0..1. */
export function blendTint(from: number, to: number, t: number): number {
  const u = Math.min(1, Math.max(0, t));
  const r = Math.round(
    channel(from, 16) + (channel(to, 16) - channel(from, 16)) * u,
  );
  const g = Math.round(
    channel(from, 8) + (channel(to, 8) - channel(from, 8)) * u,
  );
  const b = Math.round(
    channel(from, 0) + (channel(to, 0) - channel(from, 0)) * u,
  );
  return (r << 16) | (g << 8) | b;
}

/** Tile tint for a layer; intensity 0 = no effect (white). */
export function layerTileTint(layer: ShiftLayerId, intensity: number): number {
  const target = SHIFT_LAYERS[layer].tileTint;
  return blendTint(0xffffff, target, intensity);
}

export function layerPropTint(layer: ShiftLayerId, intensity: number): number {
  const target = SHIFT_LAYERS[layer].propTint;
  return blendTint(0xffffff, target, intensity);
}

export function layerOverlayAlpha(
  layer: ShiftLayerId,
  intensity: number,
): number {
  return SHIFT_LAYERS[layer].overlayAlpha * Math.min(1, Math.max(0, intensity));
}

/**
 * Triangle flash envelope over normalized progress 0..1.
 * Peak at mid for a sharp layer snap without blur.
 */
export function transitionFlashAlpha(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  if (p <= 0 || p >= 1) return 0;
  return p < 0.5 ? p * 2 * 0.55 : (1 - p) * 2 * 0.55;
}
