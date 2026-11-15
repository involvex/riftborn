import { describe, expect, test } from 'bun:test';
import {
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
    expect(riftPackBonus(10).eliteChance).toBeLessThanOrEqual(0.28);
  });

  test('D1–D2 kill fill aims higher than mid/late depths', () => {
    expect(riftKillGoalFillRatio(1)).toBeGreaterThan(riftKillGoalFillRatio(5));
    expect(riftKillGoalFillRatio(2)).toBeGreaterThanOrEqual(0.8);
  });

  test('biome bosses soft-cap only on early depths', () => {
    expect(earlyBiomeBossHpMult(1, 'crystal_lord')).toBeLessThan(1);
    expect(earlyBiomeBossDmgMult(1, 'grove_alpha')).toBeLessThan(1);
    expect(earlyBiomeBossHpMult(1, 'rift_lord')).toBe(1);
    expect(earlyBiomeBossHpMult(3, 'crystal_lord')).toBe(1);
  });
});
