import { describe, expect, test } from 'bun:test';
import { InventorySystem } from './InventorySystem';
import {
  canRerollAffixes,
  rerollGearAffixes,
  REROLL_SHARD_COST,
} from './AffixReroll';
import type { GearInstance } from '../types/game';

function rareBlade(): GearInstance {
  return {
    uid: 'g_test',
    baseId: 'iron_blade',
    name: 'Test Blade',
    slot: 'weapon',
    setId: null,
    classId: 'warrior',
    rarity: 'rare',
    itemLevel: 10,
    stats: {
      strength: 2,
      dexterity: 0,
      stamina: 0,
      intellect: 0,
      armor: 0,
      damage: 8,
      skillPower: 0,
    },
  };
}

describe('AffixReroll', () => {
  test('requires a shard and non-common gear', () => {
    const inv = new InventorySystem();
    const gear = rareBlade();
    expect(canRerollAffixes(inv, gear).ok).toBe(false);
    inv.add('rift_shard', REROLL_SHARD_COST);
    expect(canRerollAffixes(inv, gear).ok).toBe(true);
    expect(canRerollAffixes(inv, { ...gear, rarity: 'common' }).ok).toBe(false);
  });

  test('reroll spends a shard and keeps identity', () => {
    const inv = new InventorySystem();
    const gear = rareBlade();
    inv.addGear(gear);
    inv.add('rift_shard', REROLL_SHARD_COST);
    let n = 0;
    const rnd = () => {
      n += 1;
      return (n % 7) / 7;
    };
    const result = rerollGearAffixes(inv, gear, rnd);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(inv.count('rift_shard')).toBe(0);
    expect(result.gear.uid).toBe(gear.uid);
    expect(result.gear.slot).toBe('weapon');
    expect(result.gear.rarity).toBe('rare');
    expect(result.gear.stats.damage).toBeGreaterThanOrEqual(2);
  });
});
