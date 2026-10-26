import type { LootTier } from '../types/game';

/** Rift difficulty derived from character level (1–50). */
export function riftDepthFromLevel(level: number): number {
  return Math.max(1, Math.min(10, 1 + Math.floor((level - 1) / 5)));
}

/** Extra pack density / size multiplier for dungeon gen. */
export function riftPackBonus(depth: number): {
  extraPacks: number;
  countBonus: number;
  eliteChance: number;
} {
  return {
    extraPacks: Math.floor((depth - 1) / 2),
    countBonus: Math.floor((depth - 1) / 3),
    eliteChance: Math.min(0.28, 0.1 + depth * 0.018),
  };
}

/** Loot tier bump inside rifts (caps at 4). */
export function riftLootTierBump(depth: number): number {
  if (depth >= 8) return 2;
  if (depth >= 4) return 1;
  return 0;
}

export function clampLootTier(tier: number): LootTier {
  return Math.min(4, Math.max(1, Math.floor(tier))) as LootTier;
}

export function riftDepthLabel(depth: number): string {
  return `Depth ${depth}`;
}
