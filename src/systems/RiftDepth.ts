import type { LootTier } from '../types/game';

/** Readable depth milestones stacked on top of random rift mods. */
export type DepthRuleId = 'none' | 'hardened' | 'relentless' | 'apex';

export type DepthRule = {
  id: DepthRuleId;
  name: string;
  blurb: string;
  packCountBonus: number;
  eliteChanceBonus: number;
  hpMult: number;
  dmgMult: number;
  speedMult: number;
  lootBump: number;
  goldOnKill: number;
};

const DEPTH_NONE: DepthRule = {
  id: 'none',
  name: 'Calm Depth',
  blurb: 'No depth rule.',
  packCountBonus: 0,
  eliteChanceBonus: 0,
  hpMult: 1,
  dmgMult: 1,
  speedMult: 1,
  lootBump: 0,
  goldOnKill: 0,
};

const DEPTH_HARDENED: DepthRule = {
  id: 'hardened',
  name: 'Hardened Host',
  blurb: 'Elites thicken; loot climbs.',
  packCountBonus: 0,
  eliteChanceBonus: 0.06,
  hpMult: 1.12,
  dmgMult: 1.08,
  speedMult: 1,
  lootBump: 1,
  goldOnKill: 0,
};

const DEPTH_RELENTLESS: DepthRule = {
  id: 'relentless',
  name: 'Relentless Tide',
  blurb: 'Packs swell and chase harder.',
  packCountBonus: 1,
  eliteChanceBonus: 0.08,
  hpMult: 1.18,
  dmgMult: 1.12,
  speedMult: 1.15,
  lootBump: 1,
  goldOnKill: 1,
};

const DEPTH_APEX: DepthRule = {
  id: 'apex',
  name: 'Apex Rift',
  blurb: 'Peak pressure — denser, richer, deadlier.',
  packCountBonus: 1,
  eliteChanceBonus: 0.1,
  hpMult: 1.28,
  dmgMult: 1.2,
  speedMult: 1.2,
  lootBump: 2,
  goldOnKill: 3,
};

/**
 * Fixed depth milestones (D4 / D7 / D10). Stacks with rolled rift mods.
 * D1–D3 stay rule-free so the first sessions teach SHIFT + Kill→Boss→Exit.
 */
export function depthRuleFor(depth: number): DepthRule {
  const d = Math.max(1, Math.min(10, depth));
  if (d >= 10) return DEPTH_APEX;
  if (d >= 7) return DEPTH_RELENTLESS;
  if (d >= 4) return DEPTH_HARDENED;
  return DEPTH_NONE;
}

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
  const rule = depthRuleFor(d);
  return {
    extraPacks: Math.floor((d - 1) / 2),
    countBonus: Math.floor((d - 1) / 3),
    // Softer early elites — D1 ~7%, D3 ~10%, still climbs toward ~0.38 w/ apex.
    eliteChance: Math.min(0.38, 0.055 + d * 0.015 + rule.eliteChanceBonus),
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
