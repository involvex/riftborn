/**
 * Hub floor band → texture key.
 * Asset truth: hub_0 grass, hub_1 stone, hub_2 packed dirt,
 * hub_3 mossy mix, hub_4 dark fringe; plus warm/wet plaza variants.
 */

export type HubFloorBand = 'plaza' | 'road' | 'transition' | 'wild';

export type HubTileKey =
  | 'tile_hub_0'
  | 'tile_hub_1'
  | 'tile_hub_2'
  | 'tile_hub_3'
  | 'tile_hub_4'
  | 'tile_hub_plaza_warm'
  | 'tile_hub_cobble_wet';

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
  band: HubFloorBand,
): HubTileKey {
  const pools: Record<HubFloorBand, HubTileKey[]> = {
    plaza: ['tile_hub_1', 'tile_hub_plaza_warm', 'tile_hub_2'],
    road: ['tile_hub_2', 'tile_hub_cobble_wet', 'tile_hub_3'],
    transition: ['tile_hub_0', 'tile_hub_3', 'tile_hub_4'],
    wild: ['tile_hub_0', 'tile_hub_3'],
  };
  const pool = pools[band];
  return pool[tileVariant(x, y, 42, pool.length)]!;
}
