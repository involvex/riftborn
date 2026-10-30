import Phaser from 'phaser';

/** Hub / dungeon floor tiles (public/assets/tiles/{key}.png). */
export const WORLD_TILE_KEYS = [
  'tile_hub_0',
  'tile_hub_1',
  'tile_hub_2',
  'tile_hub_3',
  'tile_hub_4',
  'tile_dungeon_0',
  'tile_dungeon_1',
  'tile_dungeon_2',
] as const;

/** Hub props (public/assets/props/{key}.png). */
export const WORLD_PROP_KEYS = [
  'prop_well',
  'prop_lantern',
  'prop_crate',
  'prop_tree',
  'prop_bush',
  'prop_rock',
  'prop_tent',
  'prop_campfire',
  'prop_pillar',
  'prop_altar',
  'prop_totem',
  'prop_rubble',
  'prop_crystal_vein',
] as const;

export type WorldTileKey = (typeof WORLD_TILE_KEYS)[number];
export type WorldPropKey = (typeof WORLD_PROP_KEYS)[number];

/** Source diamonds are 128×64; IsoMath tiles are 64×32. */
export const TILE_ART_SCALE = 0.515;

/** Map HubDecorKind → prop texture key (stall uses tent). */
export const DECOR_PROP_KEY: Record<string, WorldPropKey> = {
  well: 'prop_well',
  lantern: 'prop_lantern',
  stall: 'prop_tent',
  crate: 'prop_crate',
  tree: 'prop_tree',
  bush: 'prop_bush',
  rock: 'prop_rock',
  tent: 'prop_tent',
  campfire: 'prop_campfire',
  pillar: 'prop_pillar',
  altar: 'prop_altar',
  totem: 'prop_totem',
  rubble: 'prop_rubble',
  crystal_vein: 'prop_crystal_vein',
};

export function preloadWorldArt(scene: Phaser.Scene): void {
  for (const key of WORLD_TILE_KEYS) {
    scene.load.image(key, `assets/tiles/${key}.png`);
  }
  for (const key of WORLD_PROP_KEYS) {
    scene.load.image(key, `assets/props/${key}.png`);
  }
}

/** True when the texture finished loading (fallback → graphics). */
export function hasArt(scene: Phaser.Scene, key: string): boolean {
  return scene.textures.exists(key);
}

/** Pixel-art: nearest-neighbor, no smoothing. */
export function applyWorldArtFilters(scene: Phaser.Scene): void {
  for (const key of [...WORLD_TILE_KEYS, ...WORLD_PROP_KEYS]) {
    if (!scene.textures.exists(key)) continue;
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
}

/** Deterministic 0..n-1 from tile coords + seed. */
export function tileVariant(
  x: number,
  y: number,
  seed: number,
  n: number,
): number {
  const h = (x * 73856093) ^ (y * 19349663) ^ (seed * 83492791);
  return Math.abs(h) % n;
}

export function pickHubTileKey(
  x: number,
  y: number,
  band: 'plaza' | 'road' | 'transition' | 'wild',
): WorldTileKey {
  const pairs: Record<typeof band, [WorldTileKey, WorldTileKey]> = {
    plaza: ['tile_hub_0', 'tile_hub_1'],
    road: ['tile_hub_1', 'tile_hub_2'],
    transition: ['tile_hub_2', 'tile_hub_3'],
    wild: ['tile_hub_3', 'tile_hub_4'],
  };
  const [a, b] = pairs[band];
  return tileVariant(x, y, 42, 2) === 0 ? a : b;
}

export function pickDungeonTileKey(x: number, y: number): WorldTileKey {
  const v = tileVariant(x, y, 7, 3);
  if (v === 0) return 'tile_dungeon_0';
  if (v === 1) return 'tile_dungeon_1';
  return 'tile_dungeon_2';
}

/** Draw-scale for prop sprites (source ≤128 tall). */
export function propArtScale(kind: string): number {
  switch (kind) {
    case 'lantern':
      return 0.38;
    case 'crate':
    case 'rock':
    case 'bush':
    case 'rubble':
    case 'campfire':
    case 'crystal_vein':
      return 0.45;
    case 'tree':
      return 0.62;
    default:
      return 0.52;
  }
}
