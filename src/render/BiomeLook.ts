/**
 * Per-biome rift floor / accent / void palette.
 * Biome-specific 2× floor tiles carry most of the identity;
 * tint stays light so painted color reads through.
 */

import type { BiomeId, TileId } from '../data/biomes';

export type BiomeLook = {
  id: BiomeId;
  /** Multiply tint on floor sprites (and graphics fallback fill). */
  floorTint: number;
  /** Edge outlines + floor speckles. */
  accent: number;
  edgeAlpha: number;
  /** Lower = denser speckles (`(x*17+y*31) % speckEvery === 0`). */
  speckEvery: number;
  speckRadius: number;
  speckAlpha: number;
  /** Soft multiply on rift props. */
  propTint: number;
  /** Camera void behind walkable floor. */
  background: string;
  /**
   * Preferred floor texture keys (primary / secondary / accent).
   * WorldScene weights these via biome.tileWeights.
   */
  floorTiles: readonly [TileId, TileId, TileId];
};

const LOOKS: Record<BiomeId, BiomeLook> = {
  ashen_crypt: {
    id: 'ashen_crypt',
    // Soft warm multiply — ashen/grit sheets carry the look.
    floorTint: 0xf0e8dc,
    accent: 0x6a8098,
    edgeAlpha: 0.55,
    speckEvery: 23,
    speckRadius: 2.8,
    speckAlpha: 0.35,
    propTint: 0xe8dcc8,
    background: '#1a1614',
    floorTiles: [
      'tile_dungeon_ashen',
      'tile_dungeon_ash_grit',
      'tile_dungeon_0',
    ],
  },
  crystal_cavern: {
    id: 'crystal_cavern',
    floorTint: 0xe8f4ff,
    accent: 0x50c8ff,
    edgeAlpha: 0.72,
    speckEvery: 11,
    speckRadius: 4.2,
    speckAlpha: 0.55,
    propTint: 0xc8e8ff,
    background: '#101820',
    floorTiles: ['tile_dungeon_crystal', 'tile_dungeon_1', 'tile_dungeon_0'],
  },
  shattered_woods: {
    id: 'shattered_woods',
    floorTint: 0xe8f0d8,
    accent: 0x4a9050,
    edgeAlpha: 0.62,
    speckEvery: 14,
    speckRadius: 3.4,
    speckAlpha: 0.4,
    propTint: 0xd0e0b8,
    background: '#121810',
    floorTiles: ['tile_dungeon_grove', 'tile_dungeon_2', 'tile_dungeon_0'],
  },
  salt_wastes: {
    id: 'salt_wastes',
    floorTint: 0xfff8ec,
    accent: 0xd0b070,
    edgeAlpha: 0.5,
    speckEvery: 17,
    speckRadius: 2.6,
    speckAlpha: 0.45,
    propTint: 0xf0e8d8,
    background: '#1c1a16',
    floorTiles: [
      'tile_dungeon_salt',
      'tile_dungeon_salt_crust',
      'tile_dungeon_0',
    ],
  },
};

const FALLBACK: BiomeLook = LOOKS.ashen_crypt;

/** Stable palette for a rift biome id. */
export function biomeLook(id: BiomeId | string): BiomeLook {
  return LOOKS[id as BiomeId] ?? FALLBACK;
}

/** True when two looks would read as different at a glance (tests). */
export function biomeLooksDistinct(a: BiomeLook, b: BiomeLook): boolean {
  return (
    a.floorTint !== b.floorTint &&
    a.accent !== b.accent &&
    a.background !== b.background
  );
}
