/**
 * Floor tile keys + draw scale (no Phaser — safe for core tests).
 * Source diamonds are 256×128; IsoMath tiles are 64×32 → scale 0.25.
 */

export const WORLD_TILE_KEYS = [
  'tile_hub_0',
  'tile_hub_1',
  'tile_hub_2',
  'tile_hub_3',
  'tile_hub_4',
  'tile_hub_plaza_warm',
  'tile_hub_cobble_wet',
  'tile_dungeon_0',
  'tile_dungeon_1',
  'tile_dungeon_2',
  'tile_dungeon_ashen',
  'tile_dungeon_ash_grit',
  'tile_dungeon_crystal',
  'tile_dungeon_grove',
  'tile_dungeon_salt',
  'tile_dungeon_salt_crust',
] as const;

export type WorldTileKey = (typeof WORLD_TILE_KEYS)[number];

/** 256 * 0.25 = 64 screen px wide. */
export const TILE_ART_SCALE = 0.25;

/**
 * Weighted pick among biome floor keys.
 * `n` is 0..1 noise; weights need not sum to 1.
 */
export function pickWeightedTileKey(
  n: number,
  weights: Partial<Record<string, number>>,
  fallback: string = 'tile_dungeon_0',
): string {
  const entries = Object.entries(weights).filter(
    ([, w]) => typeof w === 'number' && w > 0,
  ) as [string, number][];
  if (entries.length === 0) return fallback;
  const sum = entries.reduce((a, [, w]) => a + w, 0);
  let t = Math.min(0.999999, Math.max(0, n)) * sum;
  for (const [key, w] of entries) {
    t -= w;
    if (t < 0) return key;
  }
  return entries[entries.length - 1]![0];
}
