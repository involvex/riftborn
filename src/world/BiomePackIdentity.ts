/**
 * Opening pack recipes so each biome's first fight reads differently
 * within ~10s — no new dungeon topology.
 */

import type { BiomeId } from '../data/biomes';

export type OpeningPackSpec = {
  enemyId: string;
  count: number;
};

/**
 * Closest-to-spawn packs (beyond minDist). Order = encounter order.
 * ash = crawler wall · crystal = kite · woods = rush · salt = poke.
 */
export const BIOME_OPENING_PACKS: Record<BiomeId, OpeningPackSpec[]> = {
  ashen_crypt: [
    { enemyId: 'crawler', count: 4 },
    { enemyId: 'shade', count: 2 },
  ],
  crystal_cavern: [
    { enemyId: 'wisp', count: 3 },
    { enemyId: 'enemy_rift_wraith', count: 1 },
  ],
  shattered_woods: [
    { enemyId: 'enemy_rift_goblin', count: 3 },
    { enemyId: 'enemy_shadow_wolf', count: 1 },
  ],
  salt_wastes: [
    { enemyId: 'enemy_bone_archer', count: 2 },
    { enemyId: 'enemy_rift_goblin', count: 2 },
  ],
};

export function openingPacksForBiome(
  biomeId: string | undefined,
): OpeningPackSpec[] {
  if (!biomeId) return [];
  return BIOME_OPENING_PACKS[biomeId as BiomeId] ?? [];
}

/** Signature enemy ids a player should meet early in this biome. */
export function biomeSignatureEnemyIds(biomeId: string): string[] {
  return openingPacksForBiome(biomeId).map((p) => p.enemyId);
}

export type PackSpot = { x: number; y: number; enemyId: string; count: number };

/**
 * Assign opening packs to the closest free candidate tiles to spawn.
 * Pure — caller owns the used-tile set.
 */
export function assignOpeningPackSpots(opts: {
  specs: OpeningPackSpec[];
  candidates: { x: number; y: number }[];
  spawn: { x: number; y: number };
  used: Set<string>;
}): PackSpot[] {
  const { specs, spawn, used } = opts;
  if (specs.length === 0 || opts.candidates.length === 0) return [];

  const ranked = [...opts.candidates].sort(
    (a, b) =>
      Math.hypot(a.x - spawn.x, a.y - spawn.y) -
      Math.hypot(b.x - spawn.x, b.y - spawn.y),
  );

  const out: PackSpot[] = [];
  let i = 0;
  for (const spec of specs) {
    while (i < ranked.length) {
      const c = ranked[i++]!;
      const key = `${Math.floor(c.x)},${Math.floor(c.y)}`;
      if (used.has(key)) continue;
      used.add(key);
      out.push({
        enemyId: spec.enemyId,
        count: Math.max(1, spec.count),
        x: c.x,
        y: c.y,
      });
      break;
    }
  }
  return out;
}
