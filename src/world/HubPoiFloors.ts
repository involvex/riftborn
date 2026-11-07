import type { PoiKind } from './MapGen';

export type PoiRef = { kind: PoiKind; x: number; y: number; radius: number };

export function findPoiNear(
  x: number,
  y: number,
  pois: PoiRef[],
  pad = 1.5,
): PoiRef | null {
  for (const p of pois) {
    if (Math.hypot(x - p.x, y - p.y) <= p.radius + pad) return p;
  }
  return null;
}

export function pickPoiFloorTile(kind: PoiKind, n: number): string {
  switch (kind) {
    case 'grove':
      return n < 0.7 ? 'tile_hub_3' : n < 0.9 ? 'tile_hub_4' : 'tile_hub_2';
    case 'shrine':
      return n < 0.75 ? 'tile_hub_2' : 'tile_hub_1';
    case 'warren':
    case 'ruin':
    case 'cairn':
      return n < 0.7 ? 'tile_hub_2' : n < 0.9 ? 'tile_hub_1' : 'tile_hub_0';
    case 'watch':
      return n < 0.8 ? 'tile_hub_2' : 'tile_hub_1';
    case 'camp':
    case 'scout':
      return n < 0.75 ? 'tile_hub_2' : 'tile_hub_3';
    default:
      return 'tile_hub_2';
  }
}

export function hubPoiFloorOverride(opts: {
  x: number;
  y: number;
  plaza: boolean;
  onPath: boolean;
  pois: PoiRef[];
  noise: number;
}): string | null {
  const { x, y, plaza, onPath, pois, noise } = opts;
  if (plaza || onPath) return null;
  const poi = findPoiNear(x, y, pois);
  if (!poi) return null;
  return pickPoiFloorTile(poi.kind, noise);
}
