import { Events, gameEvents } from '../core/EventBus';
import { settingsStore } from '../core/SettingsStore';
import type {
  CharacterClassId,
  GearInstance,
  GearRarity,
  GearStats,
  ItemDef,
} from '../types/game';
import type { EquipmentSlots, InventorySlot } from '../types/save';
import itemsData from '../data/items.json';
import { gearSellValue, isJunkGear } from './Economy';
import {
  emptyGearStats,
  migrateGearInstance,
  resolveGearClass,
} from './ItemGen';
import { sumSetStats } from './SetBonus';

const RARITY_RANK: Record<GearRarity, number> = {
  common: 0,
  magic: 1,
  rare: 2,
  legendary: 3,
};

const items = itemsData as Record<string, ItemDef>;

export function getItemDef(id: string): ItemDef | undefined {
  return items[id];
}

export function emptyEquipment(): EquipmentSlots {
  return {
    weapon: null,
    hat: null,
    chest: null,
    legs: null,
    feet: null,
    tool: null,
  };
}

function migrateGear(item: GearInstance): GearInstance {
  return migrateGearInstance(item);
}

export class InventorySystem {
  slots: InventorySlot[] = [];
  equipment: EquipmentSlots = emptyEquipment();
  /** Big bag: 8×6 grid. */
  readonly capacity = 48;
  readonly bagCols = 8;
  readonly bagRows = 6;

  load(slots: InventorySlot[], equipment: EquipmentSlots): void {
    this.slots = slots.map((s) =>
      s.kind === 'stack'
        ? { ...s }
        : { kind: 'gear', item: migrateGear(s.item) },
    );
    this.equipment = {
      weapon: equipment.weapon ? migrateGear(equipment.weapon) : null,
      hat: equipment.hat ? migrateGear(equipment.hat) : null,
      chest: equipment.chest ? migrateGear(equipment.chest) : null,
      legs: equipment.legs ? migrateGear(equipment.legs) : null,
      feet: equipment.feet ? migrateGear(equipment.feet) : null,
      tool: equipment.tool,
    };
  }

  freeSlots(): number {
    return this.capacity - this.slots.length;
  }

  count(itemId: string): number {
    return this.slots
      .filter(
        (s): s is Extract<InventorySlot, { kind: 'stack' }> =>
          s.kind === 'stack' && s.itemId === itemId,
      )
      .reduce((n, s) => n + s.qty, 0);
  }

  canAdd(itemId: string, qty: number): boolean {
    const def = items[itemId];
    if (!def) return false;
    let remaining = qty;
    for (const slot of this.slots) {
      if (slot.kind !== 'stack' || slot.itemId !== itemId) continue;
      remaining -= Math.max(0, def.stack - slot.qty);
      if (remaining <= 0) return true;
    }
    const stacksNeeded = Math.ceil(remaining / def.stack);
    return this.freeSlots() >= stacksNeeded;
  }

  canAddGear(): boolean {
    return this.freeSlots() >= 1;
  }

  add(itemId: string, qty: number): boolean {
    const def = items[itemId];
    if (!def || qty <= 0) return false;
    let remaining = qty;
    for (const slot of this.slots) {
      if (slot.kind !== 'stack' || slot.itemId !== itemId) continue;
      const space = def.stack - slot.qty;
      if (space <= 0) continue;
      const take = Math.min(space, remaining);
      slot.qty += take;
      remaining -= take;
      if (remaining <= 0) break;
    }
    while (remaining > 0) {
      if (this.slots.length >= this.capacity) return false;
      const take = Math.min(def.stack, remaining);
      this.slots.push({ kind: 'stack', itemId, qty: take });
      remaining -= take;
    }
    gameEvents.emit(Events.ITEM_ADDED, { itemId, qty });
    return true;
  }

  /**
   * Add gear to the bag. When `allowAutosell` (default true) and settings
   * auto-sell junk, common pieces convert to gold instead.
   */
  addGear(item: GearInstance, opts: { allowAutosell?: boolean } = {}): boolean {
    const allowAutosell = opts.allowAutosell !== false;
    if (allowAutosell && settingsStore.get().autoSellJunk && isJunkGear(item)) {
      const gold = gearSellValue(item);
      this.add('gold', gold);
      gameEvents.emit(Events.JUNK_SOLD, { item, gold, auto: true });
      return true;
    }
    if (!this.canAddGear()) return false;
    this.slots.push({ kind: 'gear', item });
    gameEvents.emit(Events.ITEM_ADDED, { gear: item });
    return true;
  }

  /** Sort bag: gear (rarity↓, slot, name) then stacks (name). */
  sortBag(): void {
    const gear = this.slots.filter(
      (s): s is Extract<InventorySlot, { kind: 'gear' }> => s.kind === 'gear',
    );
    const stacks = this.slots.filter(
      (s): s is Extract<InventorySlot, { kind: 'stack' }> => s.kind === 'stack',
    );
    gear.sort((a, b) => {
      const rd = RARITY_RANK[b.item.rarity] - RARITY_RANK[a.item.rarity];
      if (rd !== 0) return rd;
      const sd = a.item.slot.localeCompare(b.item.slot);
      if (sd !== 0) return sd;
      return a.item.name.localeCompare(b.item.name);
    });
    stacks.sort((a, b) => {
      const na = items[a.itemId]?.name ?? a.itemId;
      const nb = items[b.itemId]?.name ?? b.itemId;
      const kd = (items[a.itemId]?.kind ?? '').localeCompare(
        items[b.itemId]?.kind ?? '',
      );
      if (kd !== 0) return kd;
      return na.localeCompare(nb);
    });
    this.slots = [...gear, ...stacks];
    gameEvents.emit(Events.ITEM_ADDED, { sorted: true });
  }

  remove(itemId: string, qty: number): boolean {
    if (this.count(itemId) < qty) return false;
    let remaining = qty;
    for (let i = this.slots.length - 1; i >= 0 && remaining > 0; i--) {
      const slot = this.slots[i];
      if (slot.kind !== 'stack' || slot.itemId !== itemId) continue;
      const take = Math.min(slot.qty, remaining);
      slot.qty -= take;
      remaining -= take;
      if (slot.qty <= 0) this.slots.splice(i, 1);
    }
    gameEvents.emit(Events.ITEM_REMOVED, { itemId, qty });
    return true;
  }

  removeGearUid(uid: string): GearInstance | null {
    const idx = this.slots.findIndex(
      (s) => s.kind === 'gear' && s.item.uid === uid,
    );
    if (idx < 0) return null;
    const slot = this.slots[idx];
    if (slot.kind !== 'gear') return null;
    this.slots.splice(idx, 1);
    return slot.item;
  }

  canEquipGear(item: GearInstance, classId: CharacterClassId): boolean {
    const req = resolveGearClass(item);
    return !req || req === classId;
  }

  equipGear(uid: string, classId?: CharacterClassId): boolean {
    const item = this.removeGearUid(uid);
    if (!item) return false;
    if (classId && !this.canEquipGear(item, classId)) {
      this.slots.push({ kind: 'gear', item });
      return false;
    }
    const slot = item.slot;
    const previous = this.equipment[slot];
    if (previous && !this.canAddGear()) {
      this.slots.push({ kind: 'gear', item });
      return false;
    }
    this.equipment[slot] = item;
    if (previous) this.slots.push({ kind: 'gear', item: previous });
    gameEvents.emit(Events.EQUIP_CHANGED, { ...this.equipment });
    return true;
  }

  unequipGear(slot: keyof Omit<EquipmentSlots, 'tool'>): boolean {
    const item = this.equipment[slot];
    if (!item) return false;
    if (!this.canAddGear()) return false;
    this.equipment[slot] = null;
    this.slots.push({ kind: 'gear', item });
    gameEvents.emit(Events.EQUIP_CHANGED, { ...this.equipment });
    return true;
  }

  equipTool(itemId: string): boolean {
    const def = items[itemId];
    if (!def || def.kind !== 'tool') return false;
    if (this.count(itemId) < 1 && this.equipment.tool !== itemId) return false;
    const previous = this.equipment.tool;
    if (previous === itemId) return true;
    if (!this.remove(itemId, 1) && this.equipment.tool !== itemId) return false;
    if (previous) this.add(previous, 1);
    this.equipment.tool = itemId;
    gameEvents.emit(Events.EQUIP_CHANGED, { ...this.equipment });
    return true;
  }

  /** Sum of all equipped gear stats + set bonuses. */
  totalGearStats(): GearStats & { maxHp: number } {
    const total = { ...emptyGearStats(), maxHp: 0 };
    for (const slot of ['weapon', 'hat', 'chest', 'legs', 'feet'] as const) {
      const g = this.equipment[slot];
      if (!g) continue;
      total.strength += g.stats.strength;
      total.dexterity += g.stats.dexterity;
      total.stamina += g.stats.stamina;
      total.intellect += g.stats.intellect;
      total.armor += g.stats.armor;
      total.damage += g.stats.damage;
      total.skillPower += g.stats.skillPower;
    }
    const set = sumSetStats(this.equipment);
    total.strength += set.strength;
    total.dexterity += set.dexterity;
    total.stamina += set.stamina;
    total.intellect += set.intellect;
    total.armor += set.armor;
    total.damage += set.damage;
    total.skillPower += set.skillPower;
    total.maxHp += set.maxHp;
    return total;
  }

  weaponDamage(): number {
    return this.equipment.weapon?.stats.damage ?? 4;
  }

  weaponRange(): number {
    return this.equipment.weapon?.attackRange ?? 1.0;
  }

  armorValue(): number {
    return this.totalGearStats().armor;
  }

  maxHpBonus(): number {
    return this.totalGearStats().maxHp + this.totalGearStats().stamina * 2;
  }

  gatherMultiplier(): number {
    const id = this.equipment.tool;
    if (!id) return 1;
    return items[id]?.gatherBonus ?? 1;
  }
}
