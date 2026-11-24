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

/** Starter / primary chase set per class (not the alternate kit). */
const PRIMARY_CLASS_SET: Record<CharacterClassId, string> = {
  warrior: 'bone',
  mystic: 'ashen',
  mage: 'riftbound',
};

/** Class → primary set id (Bone / Ashen / Riftbound). */
export function classSetId(classId: CharacterClassId): string {
  return PRIMARY_CLASS_SET[classId] ?? 'ashen';
}

/** Sets available to a class (primary + alternate). */
export function classSetIds(classId: CharacterClassId): string[] {
  return Object.values(sets)
    .filter((d) => d.classId === classId)
    .map((d) => d.id);
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
 * HUD lines: every owned class set from 1pc (bag counts), then other worn 2pc+.
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
  for (const setId of classSetIds(classId)) {
    if (seen.has(setId)) continue;
    const chase = setChaseStatus(setId, equipment, bag);
    if (!chase) continue;
    lines.push({ text: chase.line, color: chase.color });
    seen.add(setId);
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

/**
 * Ground-drop toast when a set piece lands — names the set, slot, and chase.
 * e.g. "Grove · Legs · 2/4 · need Feet"
 */
export function setDropToastLine(
  item: GearInstance,
  equipment: EquipmentSlots,
  bag: InventorySlot[] = [],
): string | null {
  if (!item.setId) return null;
  const def = sets[item.setId];
  if (!def) return null;
  const virtual: InventorySlot[] = [...bag, { kind: 'gear', item }];
  const status = setChaseStatus(item.setId, equipment, virtual);
  if (!status) return null;
  const slot = slotShortLabel(item.slot);
  let line = `${def.name} · ${slot} · ${status.owned}/4`;
  if (status.nextNeed) {
    line += ` · need ${slotShortLabel(status.nextNeed)}`;
  } else if (status.owned >= 4) {
    line += ' · complete';
  }
  return line;
}

/**
 * Drop-roll bias toward the incomplete set with the most owned pieces.
 * Falls back to the primary class set; preferUpgrade once a set is full.
 */
export function setChaseDropBias(
  classId: CharacterClassId,
  equipment: EquipmentSlots,
  bag: InventorySlot[] = [],
): {
  preferSetId?: string;
  preferSlots?: GearSlot[];
  preferUpgrade?: boolean;
} {
  const ids = classSetIds(classId);
  let bestIncomplete: {
    setId: string;
    owned: number;
    missing: GearSlot[];
  } | null = null;
  let bestComplete: string | null = null;

  for (const setId of ids) {
    const ownedSlots = ownedSetSlots(setId, equipment, bag);
    const owned = ownedSlots.size;
    if (owned <= 0) continue;
    const missing = missingSetSlots(ownedSlots);
    if (!missing.length) {
      if (!bestComplete) bestComplete = setId;
      continue;
    }
    if (!bestIncomplete || owned > bestIncomplete.owned) {
      bestIncomplete = { setId, owned, missing };
    }
  }

  if (bestIncomplete) {
    return {
      preferSetId: bestIncomplete.setId,
      preferSlots: bestIncomplete.missing,
    };
  }

  if (bestComplete) {
    return { preferSetId: bestComplete, preferUpgrade: true };
  }

  const primary = classSetId(classId);
  return {
    preferSetId: primary,
    preferSlots: missingSetSlots(ownedSetSlots(primary, equipment, bag)),
  };
}

/** Hub Mira / Bram / bounty target — next missing class-set slot. */
export type HubSetSinkTarget = {
  setId: string;
  setName: string;
  slot: GearSlot;
  slotLabel: string;
};

/**
 * Pick one missing set slot for town sinks. Prefers the incomplete kit
 * with the most owned pieces; falls back to any incomplete class set.
 */
export function hubSetSinkTarget(
  classId: CharacterClassId,
  equipment: EquipmentSlots,
  bag: InventorySlot[] = [],
): HubSetSinkTarget | null {
  const primary = classSetId(classId);
  let best: {
    setId: string;
    owned: number;
    missing: GearSlot[];
  } | null = null;
  for (const setId of classSetIds(classId)) {
    const ownedSlots = ownedSetSlots(setId, equipment, bag);
    const missing = missingSetSlots(ownedSlots);
    if (!missing.length) continue;
    const owned = ownedSlots.size;
    if (
      !best ||
      owned > best.owned ||
      (owned === best.owned && setId === primary)
    ) {
      best = { setId, owned, missing };
    }
  }
  if (!best) return null;
  const slot = best.missing[0]!;
  const def = sets[best.setId];
  if (!def) return null;
  return {
    setId: best.setId,
    setName: def.name,
    slot,
    slotLabel: slotShortLabel(slot),
  };
}
