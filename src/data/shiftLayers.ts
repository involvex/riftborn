/** World-shift layers for Game Off SHIFT theme. */

export type ShiftLayerId = 'ash' | 'shadow';

export type ShiftLayerDef = {
  id: ShiftLayerId;
  name: string;
  /** Cold violet tint for shadow; warm neutral for ash. */
  tileTint: number;
  propTint: number;
  overlayAlpha: number;
  hudColor: string;
};

export const SHIFT_LAYERS: Record<ShiftLayerId, ShiftLayerDef> = {
  ash: {
    id: 'ash',
    name: 'Asche',
    tileTint: 0xffffff,
    propTint: 0xffffff,
    overlayAlpha: 0,
    hudColor: '#c8a070',
  },
  shadow: {
    id: 'shadow',
    name: 'Schatten',
    tileTint: 0x9a8cff,
    propTint: 0xb0a0ff,
    overlayAlpha: 0.18,
    hudColor: '#a090ff',
  },
};

export function otherLayer(layer: ShiftLayerId): ShiftLayerId {
  return layer === 'ash' ? 'shadow' : 'ash';
}
