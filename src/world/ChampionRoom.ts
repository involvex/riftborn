/**
 * Optional rift champion — one side room off the spine path.
 * Killing it is optional; the kill goal never requires it.
 */

import type { DungeonCell } from './DungeonGen';

export type RoomRect = { x: number; y: number; w: number; h: number };

export type ChampionSpawn = {
  enemyId: string;
  x: number;
  y: number;
  room: RoomRect;
};

/** This-run damage buff after the champion dies. */
export const CHAMPION_BUFF_MULT = 1.35;
export const CHAMPION_BUFF_SEC = 40;
/** Short barrier so the payoff also helps glass classes. */
export const CHAMPION_BARRIER_HP = 45;
export const CHAMPION_BARRIER_SEC = 10;

const SIDE_W = 5;
const SIDE_H = 5;

/** Named elite per biome — reuse hub elites, no new defs. */
export function championEnemyForBiome(biomeId: string): string {
  switch (biomeId) {
    case 'crystal_cavern':
      return 'ash_bat';
    case 'shattered_woods':
      return 'ash_bramble';
    case 'salt_wastes':
      return 'ash_scout';
    case 'ashen_crypt':
    default:
      return 'ash_scout';
  }
}

export function championDisplayName(enemyId: string): string {
  switch (enemyId) {
    case 'ash_bat':
      return 'Nightwing';
    case 'ash_bramble':
      return 'Ash Bramble';
    case 'ash_scout':
    default:
      return 'Ash Scout';
  }
}

/** Enter-rift line — same toast style as the mod blurb. */
export function championEnterToast(enemyId: string): string {
  return `Optional Elite — ${championDisplayName(enemyId)} (side room)`;
}

/** HUD token while the champion still lives. */
export function championHudToken(alive: boolean): string | null {
  return alive ? 'Elite' : null;
}

/** Packs that count toward Kill → Boss. */
export function packsTowardKillGoal(
  packs: readonly { count: number; champion?: boolean }[],
): number {
  let total = 0;
  for (const p of packs) {
    if (p.champion) continue;
    total += Math.max(0, p.count);
  }
  return total;
}

function roomsOverlap(a: RoomRect, b: RoomRect, pad = 1): boolean {
  return (
    a.x < b.x + b.w + pad &&
    a.x + a.w + pad > b.x &&
    a.y < b.y + b.h + pad &&
    a.y + a.h + pad > b.y
  );
}

function roomFits(
  room: RoomRect,
  rooms: RoomRect[],
  width: number,
  height: number,
): boolean {
  if (room.x < 2 || room.y < 2) return false;
  if (room.x + room.w >= width - 2 || room.y + room.h >= height - 2) {
    return false;
  }
  for (const other of rooms) {
    if (roomsOverlap(room, other)) return false;
  }
  return true;
}

function carveRoom(cells: DungeonCell[][], room: RoomRect): void {
  for (let yy = room.y; yy < room.y + room.h; yy++) {
    for (let xx = room.x; xx < room.x + room.w; xx++) {
      if (cells[yy]?.[xx] !== undefined) cells[yy][xx] = 1;
    }
  }
}

function carveBrush2(cells: DungeonCell[][], x: number, y: number): void {
  for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 2; dx++) {
      const xx = x + dx;
      const yy = y + dy;
      if (cells[yy]?.[xx] !== undefined) cells[yy][xx] = 1;
    }
  }
}

function carveCorridor(
  cells: DungeonCell[][],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  let x = x1;
  let y = y1;
  while (x !== x2) {
    carveBrush2(cells, x, y);
    x += x < x2 ? 1 : -1;
  }
  while (y !== y2) {
    carveBrush2(cells, x, y);
    y += y < y2 ? 1 : -1;
  }
  carveBrush2(cells, x2, y2);
}

function inRoom(ix: number, iy: number, room: RoomRect): boolean {
  return (
    ix >= room.x && iy >= room.y && ix < room.x + room.w && iy < room.y + room.h
  );
}

/**
 * BFS on floor cells. When `exclude` is set, those room tiles are walls
 * so a spur can prove the boss route does not need the champion.
 */
export function floorPathExists(opts: {
  cells: DungeonCell[][];
  from: { x: number; y: number };
  to: { x: number; y: number };
  exclude?: RoomRect | null;
}): boolean {
  const { cells, from, to, exclude } = opts;
  const h = cells.length;
  const w = cells[0]?.length ?? 0;
  const sx = Math.floor(from.x);
  const sy = Math.floor(from.y);
  const tx = Math.floor(to.x);
  const ty = Math.floor(to.y);
  const walkable = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    if (cells[y]?.[x] !== 1) return false;
    if (exclude && inRoom(x, y, exclude)) return false;
    return true;
  };
  if (!walkable(sx, sy) || !walkable(tx, ty)) return false;
  const key = (x: number, y: number) => `${x},${y}`;
  const seen = new Set<string>([key(sx, sy)]);
  const q: { x: number; y: number }[] = [{ x: sx, y: sy }];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;
  while (q.length) {
    const cur = q.shift()!;
    if (cur.x === tx && cur.y === ty) return true;
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const k = key(nx, ny);
      if (seen.has(k) || !walkable(nx, ny)) continue;
      seen.add(k);
      q.push({ x: nx, y: ny });
    }
  }
  return false;
}

/**
 * Stamp one spur room off a middle hall. Mutates `cells`. Returns null
 * when the map is too tight (fallback arena / no free pad).
 */
export function stampChampionSideRoom(opts: {
  cells: DungeonCell[][];
  rooms: RoomRect[];
  rnd: () => number;
  width: number;
  height: number;
  biomeId: string;
}): ChampionSpawn | null {
  const { cells, rooms, rnd, width, height, biomeId } = opts;
  if (rooms.length < 3) return null;

  // Prefer a middle hall — never start (0) or boss (last).
  const attachIdx = Math.min(
    rooms.length - 2,
    Math.max(1, Math.floor(rooms.length / 2)),
  );
  const attach = rooms[attachIdx]!;
  const ax = Math.floor(attach.x + attach.w / 2);
  const ay = Math.floor(attach.y + attach.h / 2);

  const dirs: { dx: number; dy: number }[] = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];
  // Shuffle with rnd so seeds vary which wall gets the spur.
  for (let i = dirs.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = dirs[i]!;
    dirs[i] = dirs[j]!;
    dirs[j] = tmp;
  }

  const gap = 3 + Math.floor(rnd() * 3); // 3–5 tiles out
  for (const { dx, dy } of dirs) {
    const out = Math.floor(attach.w / 2) + gap + Math.floor(SIDE_W / 2);
    const outY = Math.floor(attach.h / 2) + gap + Math.floor(SIDE_H / 2);
    const cx = ax + dx * out;
    const cy = ay + dy * outY;
    const room: RoomRect = {
      x: cx - Math.floor(SIDE_W / 2),
      y: cy - Math.floor(SIDE_H / 2),
      w: SIDE_W,
      h: SIDE_H,
    };
    if (!roomFits(room, rooms, width, height)) continue;

    carveRoom(cells, room);
    const sx = Math.floor(room.x + room.w / 2);
    const sy = Math.floor(room.y + room.h / 2);
    carveCorridor(cells, ax, ay, sx, sy);

    // Spur must not be required for spawn → boss.
    const spawn = rooms[0]!;
    const boss = rooms[rooms.length - 1]!;
    const ok = floorPathExists({
      cells,
      from: {
        x: spawn.x + spawn.w / 2,
        y: spawn.y + spawn.h / 2,
      },
      to: {
        x: boss.x + boss.w / 2,
        y: boss.y + boss.h / 2,
      },
      exclude: room,
    });
    if (!ok) {
      // Extremely rare: corridor shortcut sealed the spine. Leave the
      // carved floor (still walkable) but do not claim a champion.
      return null;
    }

    // Do not push onto `rooms` — spine index 0 / last stay start / boss
    // for gates, decor, and elite anchor.
    return {
      enemyId: championEnemyForBiome(biomeId),
      x: sx + 0.5,
      y: sy + 0.5,
      room,
    };
  }
  return null;
}
