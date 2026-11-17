/**
 * Map ability ids → painted inventory icons for the touch skill bar.
 */
import type { ItemIconId } from '../render/ItemIcons';

const BY_ABILITY: Record<string, ItemIconId> = {
  war_leap: 'boots',
  war_cleave: 'axe',
  war_bash: 'shield',
  war_cry: 'scroll',
  war_whirl: 'sword',
  mys_pulse: 'gem_blue',
  mys_rift: 'dagger',
  mys_seal: 'scroll',
  mys_step: 'boots',
  mys_lance: 'dagger',
  mag_bolt: 'wand',
  mag_nova: 'potion_blue',
  mag_barrier: 'shield',
  mag_chain: 'gem_red',
  mag_meteor: 'gem_red',
};

const BY_CLASS_ATK: Record<string, ItemIconId> = {
  warrior: 'sword',
  mystic: 'dagger',
  mage: 'wand',
};

export function skillIconId(abilityId: string): ItemIconId {
  return BY_ABILITY[abilityId] ?? 'scroll';
}

export function attackIconId(classId: string): ItemIconId {
  return BY_CLASS_ATK[classId] ?? 'sword';
}
