import { describe, expect, test } from 'bun:test';
import {
  depthRuleFor,
  earlyBiomeBossDmgMult,
  earlyBiomeBossHpMult,
  riftDepthFromLevel,
  riftKillGoalFillRatio,
  riftPackBonus,
} from './RiftDepth';

describe('RiftDepth early balance', () => {
  test('levels 1–5 stay on depth 1', () => {
    for (let level = 1; level <= 5; level++) {
      expect(riftDepthFromLevel(level)).toBe(1);
    }
    expect(riftDepthFromLevel(6)).toBe(2);
  });

  test('early elite chance stays under 12% on D1–D3', () => {
    expect(riftPackBonus(1).eliteChance).toBeLessThan(0.12);
    expect(riftPackBonus(2).eliteChance).toBeLessThan(0.12);
    expect(riftPackBonus(3).eliteChance).toBeLessThan(0.12);
    expect(riftPackBonus(10).eliteChance).toBeLessThanOrEqual(0.38);
  });

  test('D1–D2 kill fill stays high; D3+ eases toward 60%', () => {
    expect(riftKillGoalFillRatio(1)).toBeGreaterThan(riftKillGoalFillRatio(5));
    expect(riftKillGoalFillRatio(2)).toBeGreaterThanOrEqual(0.8);
    expect(riftKillGoalFillRatio(3)).toBe(0.6);
    expect(riftKillGoalFillRatio(10)).toBe(0.6);
  });

  test('biome bosses soft-cap only on early depths', () => {
    expect(earlyBiomeBossHpMult(1, 'crystal_lord')).toBeLessThan(1);
    expect(earlyBiomeBossDmgMult(1, 'grove_alpha')).toBeLessThan(1);
    expect(earlyBiomeBossHpMult(1, 'rift_lord')).toBe(1);
    expect(earlyBiomeBossHpMult(3, 'crystal_lord')).toBe(1);
  });
});

describe('RiftDepth depth rules', () => {
  test('D1–D3 stay rule-free; milestones at D4 / D7 / D10', () => {
    expect(depthRuleFor(1).id).toBe('none');
    expect(depthRuleFor(3).id).toBe('none');
    expect(depthRuleFor(4).id).toBe('hardened');
    expect(depthRuleFor(6).id).toBe('hardened');
    expect(depthRuleFor(7).id).toBe('relentless');
    expect(depthRuleFor(9).id).toBe('relentless');
    expect(depthRuleFor(10).id).toBe('apex');
  });

  test('D1 and D7 feel different on packs / loot / speed', () => {
    const d1 = depthRuleFor(1);
    const d7 = depthRuleFor(7);
    expect(d7.packCountBonus).toBeGreaterThan(d1.packCountBonus);
    expect(d7.lootBump).toBeGreaterThan(d1.lootBump);
    expect(d7.speedMult).toBeGreaterThan(d1.speedMult);
    expect(d7.name).not.toBe(d1.name);
  });

  test('apex is the richest and densest rule', () => {
    const apex = depthRuleFor(10);
    const hard = depthRuleFor(4);
    expect(apex.lootBump).toBeGreaterThan(hard.lootBump);
    expect(apex.hpMult).toBeGreaterThan(hard.hpMult);
    expect(apex.goldOnKill).toBeGreaterThan(0);
  });
});
