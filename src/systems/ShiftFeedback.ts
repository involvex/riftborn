import type { ShiftLayerId } from '../data/shiftLayers';
import { SHIFT_LAYERS } from '../data/shiftLayers';

/** Short label shown when the player shifts layers. */
export function shiftLayerLabel(layer: ShiftLayerId): string {
  return SHIFT_LAYERS[layer].name;
}

/** Transition text for toast/banner, e.g. "Asche → Schatten". */
export function shiftTransitionText(
  previous: ShiftLayerId,
  layer: ShiftLayerId,
): string {
  return `${shiftLayerLabel(previous)} → ${shiftLayerLabel(layer)}`;
}

/** HUD accent color for the layer. */
export function shiftLayerColor(layer: ShiftLayerId): string {
  return SHIFT_LAYERS[layer].hudColor;
}

/** First time shift energy crosses the cast threshold. */
export function shiftReadyToastText(shiftLabel: string): string {
  return `Energy ready — ${shiftLabel} shifts layer (gates unlock paths)`;
}

/** Why a shift attempt failed (energy vs cooldown). */
export function shiftFailToastText(
  reason: 'energy' | 'cooldown',
  shiftLabel: string,
): string {
  if (reason === 'cooldown') {
    return `${shiftLabel} cooling down — wait a moment`;
  }
  return `Need more kill energy for ${shiftLabel}`;
}

/** Pure: did canShift flip from false → true? */
export function shouldAnnounceShiftReady(
  wasReady: boolean,
  isReady: boolean,
  alreadyAnnounced: boolean,
): boolean {
  return !alreadyAnnounced && !wasReady && isReady;
}
