import { mulberry32, type ZoneLayout } from './MapGen';

export type DungeonCell = 0 | 1; // 0 wall, 1 floor

export type DungeonMap = {
  width: number;
  height: number;
  cells: DungeonCell[][];
  layout: ZoneLayout;
  rooms: { x: number; y: number; w: number; h: number }[];
};

function carveRoom(
  cells: DungeonCell[][],
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
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
  rnd: () => number,
): void {
  let x = x1;
  let y = y1;
  while (x !== x2 || y !== y2) {
    cells[y][x] = 1;
    if (x !== x2 && (y === y2 || rnd() > 0.5)) x += x < x2 ? 1 : -1;
    else if (y !== y2) y += y < y2 ? 1 : -1;
  }
  cells[y2][x2] = 1;
}

/** Room-and-corridor procedural rift dungeon. Depth 1–10 scales packs. */
export function generateDungeon(seed: number, depth = 1): DungeonMap {
  const rnd = mulberry32(seed);
  const d = Math.max(1, Math.min(10, depth));
  const width = 36 + Math.min(8, (d - 1) * 1);
  const height = 36 + Math.min(8, (d - 1) * 1);
  const cells: DungeonCell[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => 0 as DungeonCell),
  );

  const roomCount = 6 + Math.floor(rnd() * 4) + Math.floor((d - 1) / 2);
  const rooms: { x: number; y: number; w: number; h: number }[] = [];

  for (let i = 0; i < roomCount; i++) {
    const w = 5 + Math.floor(rnd() * 5);
    const h = 5 + Math.floor(rnd() * 5);
    const x = 2 + Math.floor(rnd() * (width - w - 4));
    const y = 2 + Math.floor(rnd() * (height - h - 4));
    let overlaps = false;
    for (const r of rooms) {
      if (
        x < r.x + r.w + 1 &&
        x + w + 1 > r.x &&
        y < r.y + r.h + 1 &&
        y + h + 1 > r.y
      ) {
        overlaps = true;
        break;
      }
    }
    if (overlaps && rooms.length > 0) continue;
    rooms.push({ x, y, w, h });
    carveRoom(cells, x, y, w, h);
  }

  if (rooms.length < 3) {
    // fallback open arena
    carveRoom(cells, 8, 8, 20, 20);
    rooms.push({ x: 8, y: 8, w: 20, h: 20 });
  }

  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1];
    const b = rooms[i];
    carveCorridor(
      cells,
      Math.floor(a.x + a.w / 2),
      Math.floor(a.y + a.h / 2),
      Math.floor(b.x + b.w / 2),
      Math.floor(b.y + b.h / 2),
      rnd,
    );
  }

  const packTypes = ['shade', 'crawler', 'wisp'] as const;
  const packs: ZoneLayout['packs'] = [];
  const nodes: ZoneLayout['nodes'] = [];
  let expectedKills = 0;

  const countBonus = Math.floor((d - 1) / 3);
  for (let i = 1; i < rooms.length; i++) {
    const r = rooms[i];
    const cx = Math.floor(r.x + r.w / 2) + 0.5;
    const cy = Math.floor(r.y + r.h / 2) + 0.5;
    const count = 3 + Math.floor(rnd() * 4) + countBonus;
    expectedKills += count;
    packs.push({
      enemyId: packTypes[Math.floor(rnd() * packTypes.length)],
      count,
      x: cx,
      y: cy,
    });
    if (rnd() > 0.45 - d * 0.02) {
      nodes.push({
        defId: 'rift_vein',
        x: Math.floor(r.x + 1 + rnd() * (r.w - 2)) + 0.5,
        y: Math.floor(r.y + 1 + rnd() * (r.h - 2)) + 0.5,
      });
    }
  }

  const start = rooms[0];
  const bossRoom = rooms[rooms.length - 1];
  // Progress bar fills before boss — scales with depth
  const fillRatio = Math.min(0.85, 0.68 + d * 0.015);
  const killGoal = Math.max(12 + d, Math.floor(expectedKills * fillRatio));

  const layout: ZoneLayout = {
    nodes,
    packs,
    // Exit appears only after boss kill
    portal: null,
    bench: {
      x: start.x + 1.5,
      y: start.y + 1.5,
    },
    elite: {
      x: Math.floor(bossRoom.x + bossRoom.w / 2) + 0.5,
      y: Math.floor(bossRoom.y + bossRoom.h / 2) + 0.5,
    },
    spawn: {
      x: Math.floor(start.x + start.w / 2) + 0.5,
      y: Math.floor(start.y + start.h / 2) + 0.5,
    },
    killGoal,
  };

  return { width, height, cells, layout, rooms };
}

export function isWalkable(map: DungeonMap, x: number, y: number): boolean {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  return map.cells[iy]?.[ix] === 1;
}
