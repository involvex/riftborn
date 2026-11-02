import type { ShiftLayerId } from '../data/shiftLayers';
import type { DungeonCell } from './DungeonGen';

/** null = open on both layers; otherwise only that layer is walkable. */
export type LayerGateCell = ShiftLayerId | null;

export type ShiftGateGrid = LayerGateCell[][];

export function emptyGateGrid(w: number, h: number): ShiftGateGrid {
  return Array.from({ length: h }, () =>
    Array.from({ length: w }, () => null as LayerGateCell),
  );
}

export function isWalkableOnLayer(
  cells: DungeonCell[][],
  gates: ShiftGateGrid,
  x: number,
  y: number,
  layer: ShiftLayerId,
): boolean {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (cells[iy]?.[ix] !== 1) return false;
  const gate = gates[iy]?.[ix] ?? null;
  return gate === null || gate === layer;
}

/**
 * Stamp ash/shadow gates along corridors between rooms so the boss
 * route needs at least one shift, while spawn/boss cells stay dual.
 */
export function stampShiftGates(
  cells: DungeonCell[][],
  rooms: { x: number; y: number; w: number; h: number }[],
  rnd: () => number,
): ShiftGateGrid {
  const h = cells.length;
  const w = cells[0]?.length ?? 0;
  const gates = emptyGateGrid(w, h);
  if (rooms.length < 2) return gates;

  const start = rooms[0]!;
  const boss = rooms[rooms.length - 1]!;
  const sx = Math.floor(start.x + start.w / 2);
  const sy = Math.floor(start.y + start.h / 2);
  const bx = Math.floor(boss.x + boss.w / 2);
  const by = Math.floor(boss.y + boss.h / 2);

  const path = bfsFloorPath(cells, sx, sy, bx, by);
  if (path.length < 8) return gates;

  const midStart = Math.floor(path.length * 0.35);
  const midEnd = Math.floor(path.length * 0.7);
  let stamped = 0;
  for (let i = midStart; i < midEnd; i += 2) {
    const p = path[i]!;
    // Skip room interiors near start/boss
    if (inRoom(p.x, p.y, start) || inRoom(p.x, p.y, boss)) continue;
    const layer: ShiftLayerId = stamped % 2 === 0 ? 'shadow' : 'ash';
    gates[p.y]![p.x] = layer;
    stamped += 1;
    if (stamped >= 4 + Math.floor(rnd() * 3)) break;
  }
  // Ensure spawn & boss centers stay dual-layer
  gates[sy]![sx] = null;
  gates[by]![bx] = null;
  return gates;
}

function inRoom(
  x: number,
  y: number,
  r: { x: number; y: number; w: number; h: number },
): boolean {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

function bfsFloorPath(
  cells: DungeonCell[][],
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): { x: number; y: number }[] {
  const h = cells.length;
  const w = cells[0]?.length ?? 0;
  const key = (x: number, y: number) => `${x},${y}`;
  const prev = new Map<string, string | null>();
  const q: { x: number; y: number }[] = [{ x: sx, y: sy }];
  prev.set(key(sx, sy), null);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (q.length) {
    const cur = q.shift()!;
    if (cur.x === tx && cur.y === ty) break;
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx!;
      const ny = cur.y + dy!;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (cells[ny]![nx] !== 1) continue;
      const k = key(nx, ny);
      if (prev.has(k)) continue;
      prev.set(k, key(cur.x, cur.y));
      q.push({ x: nx, y: ny });
    }
  }
  if (!prev.has(key(tx, ty))) return [];
  const out: { x: number; y: number }[] = [];
  let cursor: string | null = key(tx, ty);
  while (cursor) {
    const [xs, ys] = cursor.split(',');
    out.push({ x: Number(xs), y: Number(ys) });
    cursor = prev.get(cursor) ?? null;
  }
  out.reverse();
  return out;
}
