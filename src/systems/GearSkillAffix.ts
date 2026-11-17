/**
 * Collect named skill affixes from equipped gear.
 */
import type { GearInstance, GearNamedAffix } from '../types/game';
import type { EquipmentSlots } from '../types/save';

function equippedGear(equipment: EquipmentSlots): GearInstance[] {
  const out: GearInstance[] = [];
  for (const slot of ['weapon', 'hat', 'chest', 'legs', 'feet'] as const) {
    const g = equipment[slot];
    if (g) out.push(g);
  }
  return out;
}

function affixesFor(
  equipment: EquipmentSlots,
  abilityId: string,
): GearNamedAffix[] {
  const hits: GearNamedAffix[] = [];
  for (const g of equippedGear(equipment)) {
    for (const a of g.affixes ?? []) {
      if (a.skillId === abilityId) hits.push(a);
    }
  }
  return hits;
}

export function namedAffixPower(
  equipment: EquipmentSlots,
  abilityId: string,
): number {
  return affixesFor(equipment, abilityId)
    .filter((a) => a.kind === 'power')
    .reduce((s, a) => s + a.value, 0);
}

export function namedAffixCooldown(
  equipment: EquipmentSlots,
  abilityId: string,
): number {
  return affixesFor(equipment, abilityId)
    .filter((a) => a.kind === 'cooldown')
    .reduce((s, a) => s + a.value, 0);
}

export function namedAffixTargets(
  equipment: EquipmentSlots,
  abilityId: string,
): number {
  return affixesFor(equipment, abilityId)
    .filter((a) => a.kind === 'targets')
    .reduce((s, a) => s + a.value, 0);
}
