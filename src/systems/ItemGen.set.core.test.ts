import { describe, expect, test } from 'bun:test';
import { rollGearDrop, setArmorDropChance } from './ItemGen';

/** Deterministic LCG for seeded loot loops. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe('setArmorDropChance', () => {
  test('baseline / elite / incomplete chase tiers', () => {
    expect(setArmorDropChance({})).toBe(0.12);
    expect(setArmorDropChance({ elite: true })).toBe(0.22);
    expect(setArmorDropChance({ lootTier: 4 })).toBe(0.22);
    expect(
      setArmorDropChance({
        preferSetId: 'ashen',
        preferSlots: ['chest', 'legs'],
      }),
    ).toBe(0.28);
    expect(
      setArmorDropChance({
        preferSetId: 'ashen',
        preferUpgrade: true,
        elite: true,
      }),
    ).toBe(0.22);
  });
});

describe('rollGearDrop set rarity', () => {
  test('set armor is well under half of armor drops', () => {
    const rnd = lcg(42);
    let armor = 0;
    let setArmor = 0;
    for (let i = 0; i < 400; i++) {
      const g = rollGearDrop(8, {
        preferArmor: true,
        forClass: 'mystic',
        lootTier: 2,
        rnd,
      });
      armor += 1;
      if (g.setId) setArmor += 1;
    }
    expect(armor).toBe(400);
    expect(setArmor / armor).toBeLessThan(0.35);
    expect(setArmor / armor).toBeGreaterThan(0.02);
  });

  test('incomplete chase raises set hit rate vs baseline', () => {
    const baseRnd = lcg(7);
    const chaseRnd = lcg(7);
    let baseSet = 0;
    let chaseSet = 0;
    const n = 300;
    for (let i = 0; i < n; i++) {
      const plain = rollGearDrop(8, {
        preferArmor: true,
        forClass: 'warrior',
        lootTier: 2,
        rnd: baseRnd,
      });
      if (plain.setId) baseSet += 1;
      const chase = rollGearDrop(8, {
        preferArmor: true,
        forClass: 'warrior',
        lootTier: 2,
        preferSetId: 'bulwark',
        preferSlots: ['legs', 'feet'],
        rnd: chaseRnd,
      });
      if (chase.setId) chaseSet += 1;
    }
    expect(chaseSet).toBeGreaterThan(baseSet);
    expect(chaseSet / n).toBeLessThan(0.5);
  });

  test('set armor drops are always magic or better', () => {
    const rnd = lcg(99);
    let setHits = 0;
    for (let i = 0; i < 200; i++) {
      const g = rollGearDrop(6, {
        preferArmor: true,
        forClass: 'mystic',
        lootTier: 2,
        preferSetId: 'grove',
        preferSlots: ['hat', 'chest', 'legs', 'feet'],
        rnd,
      });
      if (!g.setId) continue;
      setHits += 1;
      expect(g.rarity).not.toBe('common');
      expect(['magic', 'rare', 'legendary']).toContain(g.rarity);
    }
    expect(setHits).toBeGreaterThan(10);
  });
});
