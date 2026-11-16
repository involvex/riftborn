import type { CharacterClassId, GearInstance, GearSlot } from '../types/game';
import type { EquipmentSlots, InventorySlot } from '../types/save';
import setsData from '../data/sets.json';

const sets = setsData as Record<
  string,
  { id: string; name: string; color: string; classId: CharacterClassId }
>;

/** Armor slots that make up a four-piece set. */
export const SET_ARMOR_SLOTS: GearSlot[] = ['hat', 'chest', 'legs', 'feet'];

export type SetChaseStatus = {
  setId: string;
  name: string;
  color: string;
  /** Unique slots owned in bag + equipment. */
  owned: number;
  /** Pieces currently worn. */
  worn: number;
  missing: GearSlot[];
  nextNeed: GearSlot | null;
  /** e.g. "Ashen 1/4 · need Chest" */
  line: string;
};

/** Class → set id (Bone / Ashen / Riftbound). */
export function classSetId(classId: CharacterClassId): string {
  for (const def of Object.values(sets)) {
    if (def.classId === classId) return def.id;
  }
  return 'ashen';
}

export function slotShortLabel(slot: GearSlot): string {
  switch (slot) {
    case 'hat':
      return 'Hat';
    case 'chest':
      return 'Chest';
    case 'legs':
      return 'Legs';
    case 'feet':
      return 'Feet';
    case 'weapon':
      return 'Weapon';
  }
}

/** Unique set slots held in bag and/or equipment. */
export function ownedSetSlots(
  setId: string,
  equipment: EquipmentSlots,
  bag: InventorySlot[] = [],
): Set<GearSlot> {
  const owned = new Set<GearSlot>();
  for (const slot of SET_ARMOR_SLOTS) {
    if (equipment[slot]?.setId === setId) owned.add(slot);
  }
  for (const entry of bag) {
    if (entry.kind !== 'gear') continue;
    const g = entry.item;
    if (g.setId === setId && SET_ARMOR_SLOTS.includes(g.slot)) {
      owned.add(g.slot);
    }
  }
  return owned;
}

export function missingSetSlots(owned: Set<GearSlot>): GearSlot[] {
  return SET_ARMOR_SLOTS.filter((s) => !owned.has(s));
}

export function wornSetCount(setId: string, equipment: EquipmentSlots): number {
  let n = 0;
  for (const slot of SET_ARMOR_SLOTS) {
    if (equipment[slot]?.setId === setId) n += 1;
  }
  return n;
}

/**
 * Progress toward a set using bag + equipment. Returns null when nothing
 * owned yet (HUD stays quiet until the first piece drops).
 */
export function setChaseStatus(
  setId: string,
  equipment: EquipmentSlots,
  bag: InventorySlot[] = [],
): SetChaseStatus | null {
  const def = sets[setId];
  if (!def) return null;
  const ownedSlots = ownedSetSlots(setId, equipment, bag);
  const owned = ownedSlots.size;
  if (owned <= 0) return null;
  const missing = missingSetSlots(ownedSlots);
  const nextNeed = missing[0] ?? null;
  const worn = wornSetCount(setId, equipment);
  let line = `${def.name} ${owned}/4`;
  if (nextNeed) {
    line += ` · need ${slotShortLabel(nextNeed)}`;
  } else if (worn >= 4) {
    line += ' · complete';
  } else if (owned >= 4 && worn < 4) {
    line += ' · equip for bonus';
  }
  return {
    setId,
    name: def.name,
    color: def.color,
    owned,
    worn,
    missing,
    nextNeed,
    line,
  };
}

/** Class set chase for HUD / drop bias. */
export function classSetChase(
  classId: CharacterClassId,
  equipment: EquipmentSlots,
  bag: InventorySlot[] = [],
): SetChaseStatus | null {
  return setChaseStatus(classSetId(classId), equipment, bag);
}

/**
 * HUD lines: class chase from 1pc (bag counts), plus any other worn 2pc+.
 */
export function hudSetChaseLines(
  classId: CharacterClassId,
  equipment: EquipmentSlots,
  bag: InventorySlot[] = [],
): { text: string; color: string }[] {
  const lines: { text: string; color: string }[] = [];
  const seen = new Set<string>();
  const primary = classSetChase(classId, equipment, bag);
  if (primary) {
    lines.push({ text: primary.line, color: primary.color });
    seen.add(primary.setId);
  }
  for (const slot of SET_ARMOR_SLOTS) {
    const id = equipment[slot]?.setId;
    if (!id || seen.has(id)) continue;
    const chase = setChaseStatus(id, equipment, bag);
    if (!chase || chase.worn < 2) continue;
    lines.push({ text: chase.line, color: chase.color });
    seen.add(id);
  }
  return lines;
}

/**
 * After hypothetically adding `item` to the bag, return a chase line when
 * it advances the set (new slot or progress toast).
 */
export function chaseLineAfterGain(
  item: GearInstance,
  equipment: EquipmentSlots,
  bag: InventorySlot[],
): string | null {
  if (!item.setId) return null;
  const virtual: InventorySlot[] = [...bag, { kind: 'gear', item }];
  // If the slot was already owned, still show progress (upgrade path).
  const status = setChaseStatus(item.setId, equipment, virtual);
  return status?.line ?? null;
}

/** Drop-roll bias toward missing class-set slots. */
export function setChaseDropBias(
  classId: CharacterClassId,
  equipment: EquipmentSlots,
  bag: InventorySlot[] = [],
): { preferSetId?: string; preferSlots?: GearSlot[] } {
  const setId = classSetId(classId);
  const missing = missingSetSlots(ownedSetSlots(setId, equipment, bag));
  if (!missing.length) return {};
  return { preferSetId: setId, preferSlots: missing };
}
