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
