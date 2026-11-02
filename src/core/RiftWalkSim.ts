import type { ShiftLayerId } from '../data/shiftLayers';
import { generateDungeon, type DungeonMap } from '../world/DungeonGen';
import { isWalkableOnLayer } from '../world/ShiftGateMap';
import { FIGURE_COLLISION_RADIUS, footprintFits } from './FigureScale';
import { slideMove, slideMoveAxisOnly } from './Movement';

export type WalkSimOptions = {
  seeds?: number;
  depthForSeed?: (i: number) => number;
  /** When false, uses axis-only slide (pre-M1f) — expected to fail. */
  cornerNudge?: boolean;
  /** Fail if immobile longer than this (seconds). */
  stuckLimitSec?: number;
  dt?: number;
  speed?: number;
};

export type WalkSimFailure = {
  seed: number;
  depth: number;
  roomIndex: number;
  layer: ShiftLayerId;
  x: number;
  y: number;
  reason: 'stuck' | 'timeout' | 'unreachable';
  stuckSec: number;
};

export type WalkSimResult = {
  ok: boolean;
  seedsRun: number;
  failures: WalkSimFailure[];
};

type Node = { x: number; y: number; layer: ShiftLayerId };

function roomCenter(r: { x: number; y: number; w: number; h: number }): {
  x: number;
  y: number;
} {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/** Tile BFS with in-place shifts; returns centers of successive tiles. */
export function pathWithShifts(
  map: DungeonMap,
  from: { x: number; y: number },
  to: { x: number; y: number },
  startLayer: ShiftLayerId,
): Node[] | null {
  const gates = map.layerGates;
  const sx = Math.floor(from.x);
  const sy = Math.floor(from.y);
  const tx = Math.floor(to.x);
  const ty = Math.floor(to.y);
  const key = (n: Node) => `${n.x},${n.y},${n.layer}`;
  const prev = new Map<string, string | null>();
  const start: Node = { x: sx, y: sy, layer: startLayer };
  if (!isWalkableOnLayer(map.cells, gates, sx, sy, startLayer)) return null;
  const q: Node[] = [start];
  prev.set(key(start), null);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;

  while (q.length) {
    const cur = q.shift()!;
    if (cur.x === tx && cur.y === ty) {
      const out: Node[] = [];
      let cursor: string | null = key(cur);
      while (cursor) {
        const [xs, ys, layer] = cursor.split(',');
        out.push({
          x: Number(xs) + 0.5,
          y: Number(ys) + 0.5,
          layer: layer as ShiftLayerId,
        });
        cursor = prev.get(cursor) ?? null;
      }
      out.reverse();
      return out;
    }

    const other: ShiftLayerId = cur.layer === 'ash' ? 'shadow' : 'ash';
    if (isWalkableOnLayer(map.cells, gates, cur.x, cur.y, other)) {
      const n: Node = { x: cur.x, y: cur.y, layer: other };
      const k = key(n);
      if (!prev.has(k)) {
        prev.set(k, key(cur));
        q.push(n);
      }
    }

    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!isWalkableOnLayer(map.cells, gates, nx, ny, cur.layer)) continue;
      const n: Node = { x: nx, y: ny, layer: cur.layer };
      const k = key(n);
      if (prev.has(k)) continue;
      prev.set(k, key(cur));
      q.push(n);
    }
  }
  return null;
}

function walkFn(map: DungeonMap, layer: ShiftLayerId) {
  return (x: number, y: number) =>
    footprintFits(
      (a, b) => isWalkableOnLayer(map.cells, map.layerGates, a, b, layer),
      x,
      y,
      FIGURE_COLLISION_RADIUS,
    );
}

/** Snap continuous input toward a waypoint into an 8-direction. */
export function eightDirToward(
  x: number,
  y: number,
  tx: number,
  ty: number,
  dead = 0.12,
): { dx: number; dy: number } {
  const rawX = tx - x;
  const rawY = ty - y;
  const dx = Math.abs(rawX) > dead ? Math.sign(rawX) : 0;
  const dy = Math.abs(rawY) > dead ? Math.sign(rawY) : 0;
  return { dx, dy };
}

/**
 * Headless agent: follow room-to-room shift paths with 8-dir input and
 * the real slide/nudge collision. Returns failures for stuck / timeout.
 */
export function simulateRiftWalks(opts: WalkSimOptions = {}): WalkSimResult {
  const seeds = opts.seeds ?? 50;
  const stuckLimit = opts.stuckLimitSec ?? 0.5;
  const dt = opts.dt ?? 1 / 30;
  const speed = opts.speed ?? 4.2;
  const nudge = opts.cornerNudge !== false;
  const depthFor = opts.depthForSeed ?? ((i: number) => 3 + (i % 5));
  const failures: WalkSimFailure[] = [];
  const slide = nudge ? slideMove : slideMoveAxisOnly;

  for (let i = 1; i <= seeds; i++) {
    const seed = i * 997;
    const depth = depthFor(i);
    const map = generateDungeon(seed, depth);
    if (map.rooms.length < 2) continue;

    let layer: ShiftLayerId = 'ash';
    let x = roomCenter(map.rooms[0]!).x;
    let y = roomCenter(map.rooms[0]!).y;

    for (let r = 1; r < map.rooms.length; r++) {
      const goal = roomCenter(map.rooms[r]!);
      const path = pathWithShifts(map, { x, y }, goal, layer);
      if (!path || path.length === 0) {
        failures.push({
          seed,
          depth,
          roomIndex: r,
          layer,
          x,
          y,
          reason: 'unreachable',
          stuckSec: 0,
        });
        break;
      }

      let wp = 0;
      let stuck = 0;
      let maxStuck = 0;
      const maxSteps = 90 / dt; // 90s per room hop
      let steps = 0;
      let failed = false;

      while (steps++ < maxSteps) {
        // Advance waypoint / shift
        while (wp < path.length) {
          const node = path[wp]!;
          if (node.layer !== layer) {
            // Shift in place when path says so
            const w = walkFn(map, node.layer);
            if (w(x, y)) layer = node.layer;
            else break;
          }
          if (Math.hypot(node.x - x, node.y - y) < 0.45) {
            wp += 1;
            continue;
          }
          break;
        }

        // Arrived near room center or finished waypoints — stay on
        // walkable path end (room centers can sit on gated tiles).
        if (wp >= path.length || Math.hypot(goal.x - x, goal.y - y) < 0.7) {
          break;
        }

        const target = path[wp]!;
        const { dx, dy } = eightDirToward(x, y, target.x, target.y);
        if (dx === 0 && dy === 0) {
          wp += 1;
          stuck = 0;
          continue;
        }
        const len = Math.hypot(dx, dy) || 1;
        const w = walkFn(map, layer);
        // If we somehow stand outside the footprint, nudge back to target.
        if (!w(x, y)) {
          const recover = slide(
            w,
            target.x,
            target.y,
            x - target.x,
            y - target.y,
          );
          if (w(target.x, target.y)) {
            x = target.x;
            y = target.y;
            stuck = 0;
            continue;
          }
          if (recover.moved && w(recover.x, recover.y)) {
            x = recover.x;
            y = recover.y;
            stuck = 0;
            continue;
          }
        }
        const res = slide(
          w,
          x,
          y,
          (dx / len) * speed * dt,
          (dy / len) * speed * dt,
        );
        x = res.x;
        y = res.y;
        if (!res.moved) {
          stuck += dt;
          maxStuck = Math.max(maxStuck, stuck);
          if (stuck > stuckLimit) {
            failures.push({
              seed,
              depth,
              roomIndex: r,
              layer,
              x,
              y,
              reason: 'stuck',
              stuckSec: maxStuck,
            });
            failed = true;
            break;
          }
        } else stuck = 0;
      }

      if (failed) break;
      if (steps >= maxSteps) {
        failures.push({
          seed,
          depth,
          roomIndex: r,
          layer,
          x,
          y,
          reason: 'timeout',
          stuckSec: maxStuck,
        });
        break;
      }
    }
  }

  return {
    ok: failures.length === 0,
    seedsRun: seeds,
    failures,
  };
}
