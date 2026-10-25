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

/** Room-and-corridor procedural rift dungeon. */
export function generateDungeon(seed: number): DungeonMap {
  const rnd = mulberry32(seed);
  const width = 36;
  const height = 36;
  const cells: DungeonCell[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => 0 as DungeonCell),
  );

  const roomCount = 6 + Math.floor(rnd() * 4);
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

  for (let i = 1; i < rooms.length - 1; i++) {
    const r = rooms[i];
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    packs.push({
      enemyId: packTypes[Math.floor(rnd() * packTypes.length)],
      count: 4 + Math.floor(rnd() * 5),
      x: cx,
      y: cy,
    });
    if (rnd() > 0.45) {
      nodes.push({
        defId: 'rift_vein',
        x: r.x + 1 + rnd() * (r.w - 2),
        y: r.y + 1 + rnd() * (r.h - 2),
      });
    }
  }

  const start = rooms[0];
  const end = rooms[rooms.length - 1];
  const eliteRoom = rooms[Math.floor(rooms.length / 2)];

  const layout: ZoneLayout = {
    nodes,
    packs,
    portal: {
      x: end.x + end.w / 2,
      y: end.y + end.h / 2,
    },
    bench: {
      x: start.x + 1.5,
      y: start.y + 1.5,
    },
    elite: {
      x: eliteRoom.x + eliteRoom.w / 2,
      y: eliteRoom.y + eliteRoom.h / 2,
    },
    spawn: {
      x: start.x + start.w / 2,
      y: start.y + start.h / 2,
    },
  };

  return { width, height, cells, layout, rooms };
}

export function isWalkable(map: DungeonMap, x: number, y: number): boolean {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  return map.cells[iy]?.[ix] === 1;
}
