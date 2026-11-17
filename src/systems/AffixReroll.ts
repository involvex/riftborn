/**
 * Spend rift_shard to reroll gear affix stats (keeps base/slot/rarity).
 */
import type { GearInstance } from '../types/game';
import type { InventorySystem } from './InventorySystem';
import { rollAffixesOnto } from './ItemGen';

export const REROLL_SHARD_COST = 1;

export function canRerollAffixes(
  inventory: InventorySystem,
  item: GearInstance | null | undefined,
): { ok: true } | { ok: false; reason: string } {
  if (!item) return { ok: false, reason: 'No gear selected' };
  if (item.rarity === 'common') {
    return { ok: false, reason: 'Common gear has no affixes' };
  }
  if (inventory.count('rift_shard') < REROLL_SHARD_COST) {
    return { ok: false, reason: `Need ${REROLL_SHARD_COST} Rift Shard` };
  }
  return { ok: true };
}

export function rerollGearAffixes(
  inventory: InventorySystem,
  item: GearInstance,
  rnd: () => number = Math.random,
): { ok: true; gear: GearInstance } | { ok: false; reason: string } {
  const gate = canRerollAffixes(inventory, item);
  if (!gate.ok) return gate;
  if (!inventory.remove('rift_shard', REROLL_SHARD_COST)) {
    return { ok: false, reason: `Need ${REROLL_SHARD_COST} Rift Shard` };
  }
  const next = rollAffixesOnto({ ...item }, rnd);
  // Replace in bag if present; otherwise caller owns the reference.
  inventory.replaceGearUid(item.uid, next);
  return { ok: true, gear: next };
}
