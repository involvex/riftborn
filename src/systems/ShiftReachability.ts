import type { ShiftLayerId } from '../data/shiftLayers';
import type { DungeonMap } from '../world/DungeonGen';
import { isWalkableOnLayer } from '../world/ShiftGateMap';

type Pt = { x: number; y: number };

/**
 * BFS across floor tiles; at every dual-layer cell the search may
 * change layers (models player Shift). Boss/exit must stay reachable.
 */
export function canReachWithShift(
  map: DungeonMap,
  from: Pt,
  to: Pt,
  startLayer: ShiftLayerId,
): boolean {
  const gates = map.layerGates;
  const sx = Math.floor(from.x);
  const sy = Math.floor(from.y);
  const tx = Math.floor(to.x);
  const ty = Math.floor(to.y);
  if (
    !isWalkableOnLayer(map.cells, gates, sx, sy, startLayer) ||
    !isWalkableOnLayer(map.cells, gates, tx, ty, startLayer)
  ) {
    // Target may only be reachable after shifting onto matching layer
    if (
      !isWalkableOnLayer(map.cells, gates, tx, ty, 'ash') &&
      !isWalkableOnLayer(map.cells, gates, tx, ty, 'shadow')
    ) {
      return false;
    }
  }

  const key = (x: number, y: number, layer: ShiftLayerId) =>
    `${x},${y},${layer}`;
  const seen = new Set<string>();
  const q: { x: number; y: number; layer: ShiftLayerId }[] = [
    { x: sx, y: sy, layer: startLayer },
  ];
  seen.add(key(sx, sy, startLayer));
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (q.length) {
    const cur = q.shift()!;
    if (cur.x === tx && cur.y === ty) return true;

    // Shift in place when both layers allow standing here after swap
    const other: ShiftLayerId = cur.layer === 'ash' ? 'shadow' : 'ash';
    if (
      isWalkableOnLayer(map.cells, gates, cur.x, cur.y, other) &&
      !seen.has(key(cur.x, cur.y, other))
    ) {
      seen.add(key(cur.x, cur.y, other));
      q.push({ x: cur.x, y: cur.y, layer: other });
    }

    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx!;
      const ny = cur.y + dy!;
      if (!isWalkableOnLayer(map.cells, gates, nx, ny, cur.layer)) continue;
      const k = key(nx, ny, cur.layer);
      if (seen.has(k)) continue;
      seen.add(k);
      q.push({ x: nx, y: ny, layer: cur.layer });
    }
  }
  return false;
}

/** True when single-layer ash path fails but shift path succeeds. */
export function pathRequiresShift(map: DungeonMap, from: Pt, to: Pt): boolean {
  const ashOnly = canReachSingleLayer(map, from, to, 'ash');
  const shadowOnly = canReachSingleLayer(map, from, to, 'shadow');
  const withShift =
    canReachWithShift(map, from, to, 'ash') ||
    canReachWithShift(map, from, to, 'shadow');
  return withShift && (!ashOnly || !shadowOnly);
}

function canReachSingleLayer(
  map: DungeonMap,
  from: Pt,
  to: Pt,
  layer: ShiftLayerId,
): boolean {
  const gates = map.layerGates;
  const sx = Math.floor(from.x);
  const sy = Math.floor(from.y);
  const tx = Math.floor(to.x);
  const ty = Math.floor(to.y);
  const key = (x: number, y: number) => `${x},${y}`;
  const seen = new Set<string>();
  const q: Pt[] = [{ x: sx, y: sy }];
  seen.add(key(sx, sy));
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (q.length) {
    const cur = q.shift()!;
    if (cur.x === tx && cur.y === ty) return true;
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx!;
      const ny = cur.y + dy!;
      if (!isWalkableOnLayer(map.cells, gates, nx, ny, layer)) continue;
      const k = key(nx, ny);
      if (seen.has(k)) continue;
      seen.add(k);
      q.push({ x: nx, y: ny });
    }
  }
  return false;
}
