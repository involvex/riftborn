import type { GearInstance, GearRarity, ItemDef } from '../types/game';
import itemsData from '../data/items.json';

const items = itemsData as Record<string, ItemDef>;

const RARITY_SELL: Record<GearRarity, number> = {
  common: 1,
  magic: 2.4,
  rare: 5,
  legendary: 11,
};

/** Gold for one unit of a stack item (0 = not sellable). */
export function stackSellValue(itemId: string): number {
  if (itemId === 'gold') return 0;
  return Math.max(0, items[itemId]?.sellValue ?? 0);
}

/** Vendor buyback price for a gear piece. */
export function gearSellValue(item: GearInstance): number {
  const s = item.stats;
  const statSum =
    s.strength +
    s.dexterity +
    s.stamina +
    s.intellect +
    s.armor +
    s.damage +
    s.skillPower;
  const raw =
    (6 + item.itemLevel * 3.5 + statSum * 0.65) * RARITY_SELL[item.rarity];
  return Math.max(1, Math.floor(raw));
}

/** Common gear is “junk” for auto-sell. */
export function isJunkGear(item: GearInstance): boolean {
  return item.rarity === 'common';
}
