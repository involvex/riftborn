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
    overlayAlpha: 0.34,
    hudColor: '#a090ff',
  },
};

export function otherLayer(layer: ShiftLayerId): ShiftLayerId {
  return layer === 'ash' ? 'shadow' : 'ash';
}

/** Enemy default layer; 'both' always interactive. */
export type EnemyShiftLayer = ShiftLayerId | 'both';

export const ENEMY_SHIFT_LAYER: Record<string, EnemyShiftLayer> = {
  ash_scamp: 'ash',
  ash_scout: 'ash',
  ash_bat: 'ash',
  shade: 'shadow',
  crawler: 'shadow',
  wisp: 'both',
  rift_lord: 'both',
  // P2 biome boss variants (reskinned rift lords).
  crystal_lord: 'both',
  grove_alpha: 'both',
  // Rift biome foes (E1–E4): theme split keeps both layers dangerous.
  // Goblin + archer read as ash-side raiders; wolf + wraith as shadow stalkers.
  enemy_rift_goblin: 'ash',
  enemy_bone_archer: 'ash',
  enemy_shadow_wolf: 'shadow',
  enemy_rift_wraith: 'shadow',
};

export function enemyShiftLayer(defId: string): EnemyShiftLayer {
  return ENEMY_SHIFT_LAYER[defId] ?? 'both';
}

export function enemyActiveOnLayer(
  enemyLayer: EnemyShiftLayer,
  playerLayer: ShiftLayerId,
): boolean {
  return enemyLayer === 'both' || enemyLayer === playerLayer;
}
