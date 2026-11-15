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
  const d = Math.max(1, Math.min(10, depth));
  return {
    extraPacks: Math.floor((d - 1) / 2),
    countBonus: Math.floor((d - 1) / 3),
    // Softer early elites — D1 ~7%, D3 ~10%, still climbs toward 0.28.
    eliteChance: Math.min(0.28, 0.055 + d * 0.015),
  };
}

/**
 * Fraction of spawned foes required before the boss (clamped by supply).
 * Early depths stay higher so the first boss arrives more predictably.
 */
export function riftKillGoalFillRatio(depth: number): number {
  const d = Math.max(1, Math.min(10, depth));
  if (d <= 2) return Math.min(0.85, 0.78 + d * 0.02);
  return Math.min(0.85, 0.68 + d * 0.015);
}

/**
 * Soft-cap chunky biome bosses on D1–D2 so Crystal/Grove don't
 * outlast a first-session Rift Lord by 2×.
 */
export function earlyBiomeBossHpMult(depth: number, bossDefId: string): number {
  if (depth > 2) return 1;
  if (bossDefId === 'rift_lord') return 1;
  return 0.55;
}

export function earlyBiomeBossDmgMult(
  depth: number,
  bossDefId: string,
): number {
  if (depth > 2) return 1;
  if (bossDefId === 'rift_lord') return 1;
  return 0.85;
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
