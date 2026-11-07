import {
  mulberry32,
  type HubDecor,
  type HubDecorKind,
  type ZoneLayout,
} from './MapGen';
import {
  emptyGateGrid,
  stampShiftGates,
  type ShiftGateGrid,
} from './ShiftGateMap';
import { minRiftEnemyCount, placeRiftEnemyPacks } from './RiftEnemyPlacement';
import { pickRiftBiome, type BiomeDef } from '../data/biomes';

export type DungeonCell = 0 | 1; // 0 wall, 1 floor

export type DungeonMap = {
  width: number;
  height: number;
  cells: DungeonCell[][];
  layout: ZoneLayout;
  rooms: { x: number; y: number; w: number; h: number }[];
  /** Layer gates — null cell = both layers. */
  layerGates: ShiftGateGrid;
  biome: BiomeDef;
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

/** Paint a 2×2 floor brush so corridors stay ≥2 tiles wide (incl. stairs). */
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
  rnd: () => number,
): void {
  let x = x1;
  let y = y1;
  while (x !== x2 || y !== y2) {
    carveBrush2(cells, x, y);
    if (x !== x2 && (y === y2 || rnd() > 0.5)) x += x < x2 ? 1 : -1;
    else if (y !== y2) y += y < y2 ? 1 : -1;
  }
  carveBrush2(cells, x2, y2);
}

function pickWeightedProp(
  rnd: () => number,
  weights: Partial<Record<HubDecorKind, number>>,
): HubDecorKind | null {
  const entries = Object.entries(weights).filter(
    ([, w]) => typeof w === 'number' && w > 0,
  ) as [HubDecorKind, number][];
  if (entries.length === 0) return null;
  let total = 0;
  for (const [, w] of entries) total += w;
  if (total <= 0) return null;
  let r = rnd() * total;
  for (const [key, w] of entries) {
    r -= w;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1]![0];
}

function isBlockedDecorCell(
  ix: number,
  iy: number,
  blocked: Set<string>,
): boolean {
  return blocked.has(`${ix},${iy}`);
}

/** Room-and-corridor procedural rift dungeon. Depth 1–10 scales packs. */
export function generateDungeon(seed: number, depth = 1): DungeonMap {
  const rnd = mulberry32(seed);
  const d = Math.max(1, Math.min(10, depth));
  const biome = pickRiftBiome(seed, d);
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

  const nodes: ZoneLayout['nodes'] = [];
  for (let i = 1; i < rooms.length; i++) {
    const r = rooms[i]!;
    if (rnd() > 0.45 - d * 0.02) {
      nodes.push({
        defId: 'rift_vein',
        x: Math.floor(r.x + 1 + rnd() * Math.max(1, r.w - 2)) + 0.5,
        y: Math.floor(r.y + 1 + rnd() * Math.max(1, r.h - 2)) + 0.5,
      });
    }
  }

  const start = rooms[0]!;
  const bossRoom = rooms[rooms.length - 1]!;

  const layout: ZoneLayout = {
    nodes,
    packs: [],
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
    killGoal: 12 + d,
    decor: [],
  };

  const layerGates =
    rooms.length >= 2
      ? stampShiftGates(cells, rooms, rnd)
      : emptyGateGrid(width, height);

  const map: DungeonMap = {
    width,
    height,
    cells,
    layout,
    rooms,
    layerGates,
    biome,
  };
  // Place after gates so flood-fill matches real rift walkability.
  layout.packs = placeRiftEnemyPacks(map, d, rnd, 3, biome.enemyMix);
  const expectedKills = layout.packs.reduce((s, p) => s + p.count, 0);
  const fillRatio = Math.min(0.85, 0.68 + d * 0.015);
  layout.killGoal = Math.max(
    minRiftEnemyCount(d),
    Math.max(12 + d, Math.floor(expectedKills * fillRatio)),
  );

  // Room decor (not start/boss): walkable floor, 1-tile margin, no key cells.
  const blocked = new Set<string>();
  if (layout.spawn)
    blocked.add(`${Math.floor(layout.spawn.x)},${Math.floor(layout.spawn.y)}`);
  if (layout.elite)
    blocked.add(`${Math.floor(layout.elite.x)},${Math.floor(layout.elite.y)}`);
  if (layout.bench)
    blocked.add(`${Math.floor(layout.bench.x)},${Math.floor(layout.bench.y)}`);
  const decor = layout.decor ?? [];
  layout.decor = decor;
  const pmin = biome.propsPer10x10?.min ?? 0;
  const pmax = biome.propsPer10x10?.max ?? 0;
  for (let i = 1; i < rooms.length - 1; i++) {
    const r = rooms[i]!;
    const area = Math.max(1, r.w * r.h);
    const per10 = area / 100;
    let count = Math.floor(pmin + rnd() * Math.max(0, pmax - pmin + 1) * per10);
    count = Math.max(0, Math.floor(count));
    const used = new Set<string>();
    for (let j = 0, tries = 0; j < count && tries < count * 8; tries++) {
      const kind = pickWeightedProp(
        rnd,
        biome.propWeights as Partial<Record<HubDecorKind, number>>,
      );
      if (!kind) break;
      const minX = r.x + 1;
      const maxX = r.x + r.w - 2;
      const minY = r.y + 1;
      const maxY = r.y + r.h - 2;
      if (maxX < minX || maxY < minY) break;
      const ix = minX + Math.floor(rnd() * (maxX - minX + 1));
      const iy = minY + Math.floor(rnd() * (maxY - minY + 1));
      if (cells[iy]?.[ix] !== 1) continue;
      const key = `${ix},${iy}`;
      if (used.has(key) || isBlockedDecorCell(ix, iy, blocked)) continue;
      used.add(key);
      const prop: HubDecor = { kind, x: ix + 0.5, y: iy + 0.5 };
      decor.push(prop);
      j++;
    }
  }

  return map;
}

export function isWalkable(map: DungeonMap, x: number, y: number): boolean {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  return map.cells[iy]?.[ix] === 1;
}

function cellInRooms(
  x: number,
  y: number,
  rooms: { x: number; y: number; w: number; h: number }[],
): boolean {
  return rooms.some(
    (r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h,
  );
}

function nearRoom(
  x: number,
  y: number,
  rooms: { x: number; y: number; w: number; h: number }[],
  margin = 1,
): boolean {
  for (let dy = -margin; dy <= margin; dy++) {
    for (let dx = -margin; dx <= margin; dx++) {
      if (cellInRooms(x + dx, y + dy, rooms)) return true;
    }
  }
  return false;
}

function axisFloorRun(
  cells: DungeonCell[][],
  x: number,
  y: number,
  dx: number,
  dy: number,
): number {
  let n = 1;
  for (let i = 1; i < 8; i++) {
    if (cells[y + dy * i]?.[x + dx * i] !== 1) break;
    n += 1;
  }
  for (let i = 1; i < 8; i++) {
    if (cells[y - dy * i]?.[x - dx * i] !== 1) break;
    n += 1;
  }
  return n;
}

/**
 * Pick a floor cell on a narrow diagonal (stair-step) corridor for
 * screenshots. Prefers ≥1 tile from rooms and cross-section ≈2.
 */
export function findDiagonalCorridorCell(
  map: DungeonMap,
): { x: number; y: number } | null {
  let best: { x: number; y: number; score: number } | null = null;
  for (let y = 2; y < map.height - 3; y++) {
    for (let x = 2; x < map.width - 3; x++) {
      if (map.cells[y]![x] !== 1) continue;
      if (cellInRooms(x, y, map.rooms)) continue;
      if (nearRoom(x, y, map.rooms, 1)) continue;
      // Stair-step through this cell
      if (map.cells[y + 1]![x + 1] !== 1) continue;
      if (map.cells[y - 1]![x - 1] !== 1) continue;
      if (cellInRooms(x + 1, y + 1, map.rooms)) continue;
      if (cellInRooms(x - 1, y - 1, map.rooms)) continue;
      const wH = axisFloorRun(map.cells, x, y, 1, 0);
      const wV = axisFloorRun(map.cells, x, y, 0, 1);
      const cross = Math.min(wH, wV);
      if (cross < 2 || cross > 4) continue;
      // Prefer minimal cross-section (true corridor feel).
      const score = cross * 100 + wH + wV;
      if (!best || score < best.score) best = { x, y, score };
    }
  }
  return best ? { x: best.x, y: best.y } : null;
}
