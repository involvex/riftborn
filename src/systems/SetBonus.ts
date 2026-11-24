import type { ArmorSetDef, CharacterClassId, GearStats } from '../types/game';
import type { EquipmentSlots, InventorySlot } from '../types/save';
import setsData from '../data/sets.json';
import { emptyGearStats } from './ItemGen';
import {
  classSetIds,
  missingSetSlots,
  ownedSetSlots,
  slotShortLabel,
  wornSetCount,
} from './SetChase';

const sets = setsData as Record<string, ArmorSetDef>;

export type ActiveSetBonus = {
  setId: string;
  name: string;
  color: string;
  pieces: number;
  labels: string[];
  stats: GearStats & { maxHp: number };
  skillFamily?: string[];
  skillFamilyMult?: number;
};

function empty(): GearStats & { maxHp: number } {
  return { ...emptyGearStats(), maxHp: 0 };
}

export function countSetPieces(equipment: EquipmentSlots): Map<string, number> {
  const counts = new Map<string, number>();
  for (const slot of ['hat', 'chest', 'legs', 'feet'] as const) {
    const item = equipment[slot];
    if (!item?.setId) continue;
    counts.set(item.setId, (counts.get(item.setId) ?? 0) + 1);
  }
  return counts;
}

export function resolveSetBonuses(equipment: EquipmentSlots): ActiveSetBonus[] {
  const counts = countSetPieces(equipment);
  const active: ActiveSetBonus[] = [];
  for (const [setId, pieces] of counts) {
    const def = sets[setId];
    if (!def || pieces < 2) continue;
    const stats = empty();
    const labels: string[] = [];
    if (pieces >= 2) {
      labels.push(`2pc: ${def.twoPiece.label}`);
      mergeBonus(stats, def.twoPiece);
    }
    let skillFamily: string[] | undefined;
    let skillFamilyMult: number | undefined;
    if (pieces >= 4) {
      labels.push(`4pc: ${def.fourPiece.label}`);
      mergeBonus(stats, def.fourPiece);
      skillFamily = def.fourPiece.skillFamily;
      skillFamilyMult = def.fourPiece.skillFamilyMult;
    }
    active.push({
      setId,
      name: def.name,
      color: def.color,
      pieces,
      labels,
      stats,
      skillFamily,
      skillFamilyMult,
    });
  }
  return active;
}

/** Extra skill damage from 4pc family match (0 if none). */
export function setSkillFamilyMult(
  equipment: EquipmentSlots,
  abilityId: string,
): number {
  let bonus = 0;
  for (const b of resolveSetBonuses(equipment)) {
    if (!b.skillFamily?.includes(abilityId)) continue;
    bonus += b.skillFamilyMult ?? 0;
  }
  return bonus;
}

function mergeBonus(
  stats: GearStats & { maxHp: number },
  bonus: {
    armor?: number;
    strength?: number;
    dexterity?: number;
    stamina?: number;
    intellect?: number;
    damage?: number;
    maxHp?: number;
    skillPower?: number;
  },
): void {
  stats.armor += bonus.armor ?? 0;
  stats.strength += bonus.strength ?? 0;
  stats.dexterity += bonus.dexterity ?? 0;
  stats.stamina += bonus.stamina ?? 0;
  stats.intellect += bonus.intellect ?? 0;
  stats.damage += bonus.damage ?? 0;
  stats.skillPower += bonus.skillPower ?? 0;
  stats.maxHp += bonus.maxHp ?? 0;
}

export function sumSetStats(
  equipment: EquipmentSlots,
): GearStats & { maxHp: number } {
  const total = empty();
  for (const bonus of resolveSetBonuses(equipment)) {
    total.armor += bonus.stats.armor;
    total.strength += bonus.stats.strength;
    total.dexterity += bonus.stats.dexterity;
    total.stamina += bonus.stats.stamina;
    total.intellect += bonus.stats.intellect;
    total.damage += bonus.stats.damage;
    total.skillPower += bonus.stats.skillPower;
    total.maxHp += bonus.stats.maxHp;
  }
  return total;
}

/**
 * Character (C) panel lines: both class kits with lit/dim 2pc·4pc,
 * plus any off-class set that is already worn at 2pc+.
 */
export function characterSetBonusLines(
  classId: CharacterClassId,
  equipment: EquipmentSlots,
  bag: InventorySlot[] = [],
): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();
  const order = [...classSetIds(classId)];
  for (const [setId, pieces] of countSetPieces(equipment)) {
    if (pieces >= 2 && !order.includes(setId)) order.push(setId);
  }
  for (const setId of order) {
    if (seen.has(setId)) continue;
    seen.add(setId);
    const def = sets[setId];
    if (!def) continue;
    const worn = wornSetCount(setId, equipment);
    const owned = ownedSetSlots(setId, equipment, bag);
    const missing = missingSetSlots(owned);
    let head = `${def.name} ${worn}/4`;
    if (missing.length) {
      head += ` · need ${missing.map(slotShortLabel).join(', ')}`;
    } else if (worn >= 4) {
      head += ' · complete';
    }
    lines.push(head);
    lines.push(
      worn >= 2
        ? `  ✓ 2pc: ${def.twoPiece.label}`
        : `  · 2pc: ${def.twoPiece.label}`,
    );
    lines.push(
      worn >= 4
        ? `  ✓ 4pc: ${def.fourPiece.label}`
        : `  · 4pc: ${def.fourPiece.label}`,
    );
  }
  return lines;
}
