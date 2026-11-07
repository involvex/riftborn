import type { HubDecorKind } from '../world/MapGen';

export type TileId = 'tile_dungeon_0' | 'tile_dungeon_1' | 'tile_dungeon_2';

export type EnemyId =
  | 'shade'
  | 'crawler'
  | 'wisp'
  | 'ash_scamp'
  | 'ash_bat'
  | 'ash_scout'
  | 'rift_lord';

export type BiomeId = 'ashen_crypt' | 'crystal_cavern' | 'shattered_woods';

export type BiomeEnemyMixEntry = {
  enemyId: EnemyId | string;
  weight: number;
  minCount?: number;
  maxCount?: number;
  eliteChance?: number;
};

export type BiomeDef = {
  id: BiomeId;
  name: string;
  tileWeights: Partial<Record<TileId, number>>;
  /** HubDecorKind keys only (no "prop_" prefix, no tree, no crystal_vein). */
  propWeights: Partial<Record<HubDecorKind, number>>;
  propsPer10x10: { min: number; max: number };
  /** Existing enemy IDs only (no enemy_rift_*). */
  enemyMix: BiomeEnemyMixEntry[];
  roomTypeRules?: string[];
  decorRules?: string[];
};

export const ASHEN_CRYPT_BIOME: BiomeDef = {
  id: 'ashen_crypt',
  name: 'Aschen-Krypta',
  tileWeights: {
    tile_dungeon_0: 0.5,
    tile_dungeon_1: 0.35,
    tile_dungeon_2: 0.15,
  },
  propWeights: {
    pillar: 0.25,
    rubble: 0.25,
    crate: 0.15,
    altar: 0.12,
    totem: 0.08,
    rock: 0.1,
    lantern: 0.05,
  },
  propsPer10x10: { min: 4, max: 6 },
  enemyMix: [
    { enemyId: 'shade', weight: 0.35, minCount: 2, maxCount: 4 },
    { enemyId: 'crawler', weight: 0.45, minCount: 3, maxCount: 5 },
    { enemyId: 'wisp', weight: 0.2, minCount: 1, maxCount: 2 },
  ],
  roomTypeRules: [
    'rectangular_halls',
    'niches',
    'corridors_narrow',
    'boss_hall',
  ],
  decorRules: [
    'pillars_along_walls',
    'rubble_in_corners',
    'chests_in_niches',
    'minimal_nature',
  ],
};

export const CRYSTAL_CAVERN_BIOME: BiomeDef = {
  id: 'crystal_cavern',
  name: 'Kristallhöhle',
  tileWeights: {
    tile_dungeon_0: 0.25,
    tile_dungeon_1: 0.35,
    tile_dungeon_2: 0.4,
  },
  propWeights: {
    rock: 0.42,
    rubble: 0.2,
    pillar: 0.2,
    totem: 0.08,
    lantern: 0.05,
    bush: 0.05,
  },
  propsPer10x10: { min: 5, max: 7 },
  enemyMix: [
    { enemyId: 'wisp', weight: 0.35, minCount: 2, maxCount: 3 },
    { enemyId: 'ash_bat', weight: 0.4, minCount: 2, maxCount: 4 },
    { enemyId: 'crawler', weight: 0.25, minCount: 2, maxCount: 4 },
  ],
  roomTypeRules: [
    'organic_caverns',
    'wide_kaverns',
    'twisty_galleries',
    'central_boss_cavern',
  ],
  decorRules: [
    'rock_formations',
    'avoid_rectilinear_symmetry',
    'bioluminescent_accent',
  ],
};

export const SHATTERED_WOODS_BIOME: BiomeDef = {
  id: 'shattered_woods',
  name: 'Schattenwald',
  tileWeights: {
    tile_dungeon_0: 0.4,
    tile_dungeon_1: 0.4,
    tile_dungeon_2: 0.2,
  },
  propWeights: {
    bush: 0.32,
    rock: 0.22,
    totem: 0.18,
    rubble: 0.15,
    pillar: 0.08,
    crate: 0.05,
  },
  propsPer10x10: { min: 5, max: 8 },
  enemyMix: [
    { enemyId: 'ash_scamp', weight: 0.35, minCount: 3, maxCount: 5 },
    { enemyId: 'wisp', weight: 0.35, minCount: 2, maxCount: 4 },
    { enemyId: 'shade', weight: 0.3, minCount: 2, maxCount: 3 },
  ],
  roomTypeRules: [
    'forest_clearings',
    'twisted_paths',
    'overgrown_passages',
    'boss_glade',
  ],
  decorRules: ['natural_flow', 'totems_at_junctions', 'broken_ground'],
};

export const RIFT_BIOMES: readonly BiomeDef[] = [
  ASHEN_CRYPT_BIOME,
  CRYSTAL_CAVERN_BIOME,
  SHATTERED_WOODS_BIOME,
];

/** Stable biome pick for a seed+depth pair. */
export function pickRiftBiome(seed: number, depth: number): BiomeDef {
  const idx = Math.abs(seed * 131542391 + depth * 1009) % RIFT_BIOMES.length;
  return RIFT_BIOMES[idx]!;
}
