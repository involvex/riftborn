import type { ShiftLayerId } from '../data/shiftLayers';
import { FIGURE_COLLISION_RADIUS, footprintFits } from '../core/FigureScale';
import type { DungeonMap } from './DungeonGen';
import { isWalkableOnLayer } from './ShiftGateMap';
import type { ZoneLayout } from './MapGen';

export type ReachKey = string; // "x,y,layer"

export type RiftEnemyMixEntry = { enemyId: string; weight: number };

/** Guaranteed floor for packs — depth 1 → 6, scales gently. */
export function minRiftEnemyCount(depth: number): number {
  const d = Math.max(1, Math.min(10, depth));
  return Math.max(6, 6 + Math.floor((d - 1) / 2));
}

function cellFits(
  map: DungeonMap,
  tx: number,
  ty: number,
  layer: ShiftLayerId,
): boolean {
  return footprintFits(
    (px, py) => isWalkableOnLayer(map.cells, map.layerGates, px, py, layer),
    tx + 0.5,
    ty + 0.5,
    FIGURE_COLLISION_RADIUS,
  );
}

/**
 * Flood-fill walkable cells from spawn using the same circular footprint
 * as Player.move / slideMove, including in-place layer shifts at dual tiles.
 */
export function reachableFloorCells(
  map: DungeonMap,
  spawn: { x: number; y: number },
  startLayer: ShiftLayerId = 'ash',
): Set<ReachKey> {
  const key = (x: number, y: number, layer: ShiftLayerId): ReachKey =>
    `${x},${y},${layer}`;
  const seen = new Set<ReachKey>();
  const sx = Math.floor(spawn.x);
  const sy = Math.floor(spawn.y);
  if (!cellFits(map, sx, sy, startLayer)) return seen;

  const q: { x: number; y: number; layer: ShiftLayerId }[] = [
    { x: sx, y: sy, layer: startLayer },
  ];
  seen.add(key(sx, sy, startLayer));
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;

  while (q.length) {
    const cur = q.shift()!;
    const other: ShiftLayerId = cur.layer === 'ash' ? 'shadow' : 'ash';
    if (cellFits(map, cur.x, cur.y, other)) {
      const k = key(cur.x, cur.y, other);
      if (!seen.has(k)) {
        seen.add(k);
        q.push({ x: cur.x, y: cur.y, layer: other });
      }
    }
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!cellFits(map, nx, ny, cur.layer)) continue;
      const k = key(nx, ny, cur.layer);
      if (seen.has(k)) continue;
      seen.add(k);
      q.push({ x: nx, y: ny, layer: cur.layer });
    }
  }
  return seen;
}

/** Unique tile centers (ignore layer) from a reachability set. */
export function uniqueTileCenters(reachable: Set<ReachKey>): {
  x: number;
  y: number;
}[] {
  const tiles = new Set<string>();
  const out: { x: number; y: number }[] = [];
  for (const k of reachable) {
    const [xs, ys] = k.split(',');
    const t = `${xs},${ys}`;
    if (tiles.has(t)) continue;
    tiles.add(t);
    out.push({ x: Number(xs) + 0.5, y: Number(ys) + 0.5 });
  }
  return out;
}

const PACK_TYPES = ['shade', 'crawler', 'wisp'] as const;

function pickEnemyId(
  rnd: () => number,
  enemyMix?: RiftEnemyMixEntry[] | null,
): string {
  if (enemyMix && enemyMix.length > 0) {
    let total = 0;
    for (const e of enemyMix) total += Math.max(0, e.weight || 0);
    if (total > 0) {
      let r = rnd() * total;
      for (const e of enemyMix) {
        r -= Math.max(0, e.weight || 0);
        if (r <= 0) return e.enemyId;
      }
      return enemyMix[enemyMix.length - 1]!.enemyId;
    }
  }
  return PACK_TYPES[Math.floor(rnd() * PACK_TYPES.length)]!;
}

function nearestReachable(
  candidates: { x: number; y: number }[],
  x: number,
  y: number,
): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bestD = Infinity;
  for (const c of candidates) {
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

/**
 * Rebuild rift packs on footprint-reachable tiles, min distance from
 * spawn, and at least minRiftEnemyCount(depth) foes.
 *
 * Prefer room centers (old density); snap off-reach centers onto the
 * reachable set; top up with spaced singles if still under the floor.
 */
export function placeRiftEnemyPacks(
  map: DungeonMap,
  depth: number,
  rnd: () => number,
  minDistFromSpawn = 3,
  enemyMix?: RiftEnemyMixEntry[] | null,
): ZoneLayout['packs'] {
  const spawn = map.layout.spawn ?? { x: 1.5, y: 1.5 };
  const reachable = reachableFloorCells(map, spawn, 'ash');
  const candidates = uniqueTileCenters(reachable).filter((c) => {
    const d = Math.hypot(c.x - spawn.x, c.y - spawn.y);
    return d >= minDistFromSpawn;
  });

  const target = minRiftEnemyCount(depth);
  const packs: ZoneLayout['packs'] = [];
  const countBonus = Math.floor((depth - 1) / 3);

  if (candidates.length === 0) {
    for (let i = 0; i < target; i++) {
      packs.push({
        enemyId: pickEnemyId(rnd, enemyMix),
        count: 1,
        x: spawn.x + 3 + (i % 3) * 0.01,
        y: spawn.y + 3 + Math.floor(i / 3) * 0.01,
      });
    }
    return packs;
  }

  // Room-centered packs (skip spawn room), snapped onto reachable tiles.
  for (let i = 1; i < map.rooms.length; i++) {
    const r = map.rooms[i]!;
    const cx = Math.floor(r.x + r.w / 2) + 0.5;
    const cy = Math.floor(r.y + r.h / 2) + 0.5;
    const snapped = nearestReachable(candidates, cx, cy);
    if (!snapped) continue;
    if (
      Math.hypot(snapped.x - spawn.x, snapped.y - spawn.y) < minDistFromSpawn
    ) {
      continue;
    }
    const count = 3 + Math.floor(rnd() * 4) + countBonus;
    packs.push({
      enemyId: pickEnemyId(rnd, enemyMix),
      count,
      x: snapped.x,
      y: snapped.y,
    });
  }

  let total = packs.reduce((s, p) => s + p.count, 0);
  // Top up with single foes on spaced reachable cells.
  const used = new Set(
    packs.map((p) => `${Math.floor(p.x)},${Math.floor(p.y)}`),
  );
  let guard = 0;
  while (total < target && guard++ < candidates.length * 3) {
    const c = candidates[Math.floor(rnd() * candidates.length)]!;
    const k = `${Math.floor(c.x)},${Math.floor(c.y)}`;
    if (used.has(k)) continue;
    let tooClose = false;
    for (const p of packs) {
      if (Math.hypot(p.x - c.x, p.y - c.y) < 1.4) {
        tooClose = true;
        break;
      }
    }
    if (tooClose && packs.length > 0) continue;
    used.add(k);
    packs.push({
      enemyId: pickEnemyId(rnd, enemyMix),
      count: 1,
      x: c.x,
      y: c.y,
    });
    total += 1;
  }
  while (total < target) {
    const c = candidates[total % candidates.length]!;
    packs.push({
      enemyId: pickEnemyId(rnd, enemyMix),
      count: 1,
      x: c.x,
      y: c.y,
    });
    total += 1;
  }
  return packs;
}
