/**
 * Per-biome rift floor / accent / void palette.
 * Painted dungeon tiles share one sheet set — tint + accents make biomes
 * readable at a glance without new art.
 */

import type { BiomeId } from '../data/biomes';

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
};

const LOOKS: Record<BiomeId, BiomeLook> = {
  ashen_crypt: {
    id: 'ashen_crypt',
    // Warm bone / ash stone — readable vs cool crypt accents.
    floorTint: 0xe0d0b8,
    accent: 0x6a8098,
    edgeAlpha: 0.55,
    speckEvery: 23,
    speckRadius: 2.8,
    speckAlpha: 0.4,
    propTint: 0xe8dcc8,
    background: '#1a1614',
  },
  crystal_cavern: {
    id: 'crystal_cavern',
    // Icy blue floors + bright cyan sparkles.
    floorTint: 0xb0d8f8,
    accent: 0x50c8ff,
    edgeAlpha: 0.72,
    speckEvery: 11,
    speckRadius: 4.2,
    speckAlpha: 0.65,
    propTint: 0xc8e8ff,
    background: '#101820',
  },
  shattered_woods: {
    id: 'shattered_woods',
    // Mossy green undergrowth vs darker leaf accents.
    floorTint: 0xc4d8a8,
    accent: 0x4a9050,
    edgeAlpha: 0.62,
    speckEvery: 14,
    speckRadius: 3.4,
    speckAlpha: 0.5,
    propTint: 0xd0e0b8,
    background: '#121810',
  },
  salt_wastes: {
    id: 'salt_wastes',
    // Bleached flats + ochre salt ridges.
    floorTint: 0xf4f0e4,
    accent: 0xd0b070,
    edgeAlpha: 0.5,
    speckEvery: 17,
    speckRadius: 2.6,
    speckAlpha: 0.55,
    propTint: 0xf0e8d8,
    background: '#1c1a16',
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
