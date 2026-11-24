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
import { packsTowardKillGoal, stampChampionSideRoom } from './ChampionRoom';
import { pickRiftBiome, type BiomeDef } from '../data/biomes';
import { riftKillGoalFillRatio } from '../systems/RiftDepth';

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
  style: 'jagged' | 'straight' = 'jagged',
): void {
  let x = x1;
  let y = y1;
  if (style === 'straight') {
    while (x !== x2) {
      carveBrush2(cells, x, y);
      x += x < x2 ? 1 : -1;
    }
    while (y !== y2) {
      carveBrush2(cells, x, y);
      y += y < y2 ? 1 : -1;
    }
    carveBrush2(cells, x2, y2);
    return;
  }
  while (x !== x2 || y !== y2) {
    carveBrush2(cells, x, y);
    if (x !== x2 && (y === y2 || rnd() > 0.5)) x += x < x2 ? 1 : -1;
    else if (y !== y2) y += y < y2 ? 1 : -1;
  }
  carveBrush2(cells, x2, y2);
}

export type CryptRoomRole = 'start' | 'hall' | 'boss';

export type BiomeRoomPlan = {
  corridor: 'straight' | 'jagged';
  niches: boolean;
  bossMinLong: number;
  bossMinShort: number;
  bossShapes: readonly (readonly [number, number])[];
  rescue: readonly { x: number; y: number; w: number; h: number }[];
};

type RoomRect = { x: number; y: number; w: number; h: number };

/**
 * Room rules actually drive layout. Crypt = long halls, Crystal = wide
 * caverns, Woods = clearings, Salt = broad flats. Unknown rules stay square.
 */
export function biomeRoomPlan(biome: BiomeDef): BiomeRoomPlan | null {
  const rules = biome.roomTypeRules ?? [];
  const has = (rule: string) => rules.includes(rule);
  if (biome.id === 'ashen_crypt' && has('rectangular_halls')) {
    return {
      corridor: has('corridors_narrow') ? 'straight' : 'jagged',
      niches: has('niches'),
      bossMinLong: has('boss_hall') ? 10 : 0,
      bossMinShort: 4,
      bossShapes: [
        [12, 5],
        [5, 12],
        [11, 5],
        [10, 4],
      ],
      rescue: [
        { x: 3, y: 3, w: 10, h: 4 },
        { x: 3, y: 12, w: 4, h: 10 },
        { x: 16, y: 18, w: 12, h: 5 },
      ],
    };
  }
  if (biome.id === 'crystal_cavern' && has('wide_kaverns')) {
    return {
      corridor: has('twisty_galleries') ? 'jagged' : 'straight',
      niches: false,
      bossMinLong: has('central_boss_cavern') ? 9 : 0,
      bossMinShort: has('central_boss_cavern') ? 8 : 0,
      bossShapes: [
        [10, 9],
        [9, 10],
        [11, 8],
      ],
      rescue: [
        { x: 3, y: 3, w: 9, h: 6 },
        { x: 3, y: 14, w: 6, h: 9 },
        { x: 16, y: 16, w: 10, h: 7 },
      ],
    };
  }
  if (biome.id === 'shattered_woods' && has('forest_clearings')) {
    return {
      corridor: has('twisted_paths') ? 'jagged' : 'straight',
      niches: has('overgrown_passages'),
      bossMinLong: has('boss_glade') ? 9 : 0,
      bossMinShort: has('boss_glade') ? 8 : 0,
      bossShapes: [
        [10, 8],
        [8, 10],
        [9, 8],
      ],
      rescue: [
        { x: 3, y: 3, w: 7, h: 6 },
        { x: 3, y: 14, w: 6, h: 7 },
        { x: 16, y: 16, w: 8, h: 7 },
      ],
    };
  }
  if (biome.id === 'salt_wastes' && has('wide_flats')) {
    return {
      corridor: has('salt_ridges') ? 'straight' : 'jagged',
      niches: false,
      bossMinLong: has('boss_basin') ? 12 : 0,
      bossMinShort: has('boss_basin') ? 5 : 0,
      bossShapes: [
        [14, 6],
        [6, 14],
        [13, 5],
      ],
      rescue: [
        { x: 3, y: 3, w: 12, h: 5 },
        { x: 3, y: 14, w: 5, h: 12 },
        { x: 16, y: 18, w: 13, h: 4 },
      ],
    };
  }
  return null;
}

/** Ashen Crypt flag view kept for the existing hall test. */
export function ashenCryptRules(biome: BiomeDef): {
  halls: boolean;
  narrow: boolean;
  niches: boolean;
  bossHall: boolean;
} {
  const plan = biome.id === 'ashen_crypt' ? biomeRoomPlan(biome) : null;
  return {
    halls: !!plan,
    narrow: plan?.corridor === 'straight',
    niches: !!plan?.niches,
    bossHall: (plan?.bossMinLong ?? 0) >= 10,
  };
}

/**
 * Long halls for the crypt. Two rolls match the old w/h rng budget so
 * non-crypt seeds are untouched (this is only called for the crypt).
 */
export function cryptRoomSize(
  role: CryptRoomRole,
  rollLong: number,
  rollOrient: number,
): { w: number; h: number } {
  const long =
    role === 'boss'
      ? 10 + Math.floor(rollLong * 3)
      : role === 'start'
        ? 6
        : 8 + Math.floor(rollLong * 3);
  const short = role === 'boss' ? 5 : role === 'start' ? 5 : 4;
  if (rollOrient < 0.5) return { w: long, h: short };
  return { w: short, h: long };
}

/** Two rolls, same budget as the old square roller. Null = use that roller. */
export function biomeRoomSize(
  biomeId: string,
  role: CryptRoomRole,
  rollA: number,
  rollB: number,
): { w: number; h: number } | null {
  if (biomeId === 'ashen_crypt') return cryptRoomSize(role, rollA, rollB);
  if (biomeId === 'crystal_cavern') {
    if (role === 'start') {
      return rollB < 0.5 ? { w: 7, h: 6 } : { w: 6, h: 7 };
    }
    if (role === 'boss') {
      return rollB < 0.5 ? { w: 10, h: 8 } : { w: 8, h: 10 };
    }
    const wide = 8 + Math.floor(rollA * 4);
    const thick = 6 + (rollB < 0.5 ? 0 : 1);
    return rollB < 0.5 ? { w: wide, h: thick } : { w: thick, h: wide };
  }
  if (biomeId === 'shattered_woods') {
    if (role === 'start') return { w: 6, h: 6 };
    if (role === 'boss') {
      return rollB < 0.5 ? { w: 10, h: 8 } : { w: 8, h: 10 };
    }
    const side = 6 + Math.floor(rollA * 3);
    const other = Math.max(5, side - (rollB < 0.35 ? 1 : 0));
    return rollB < 0.5 ? { w: side, h: other } : { w: other, h: side };
  }
  if (biomeId === 'salt_wastes') {
    if (role === 'start') {
      return rollB < 0.5 ? { w: 9, h: 5 } : { w: 5, h: 9 };
    }
    if (role === 'boss') {
      return rollB < 0.5 ? { w: 14, h: 6 } : { w: 6, h: 14 };
    }
    const long = 11 + Math.floor(rollA * 3);
    const short = 4 + (rollB < 0.5 ? 0 : 1);
    return rollB < 0.5 ? { w: long, h: short } : { w: short, h: long };
  }
  return null;
}

function bossMeets(room: RoomRect, plan: BiomeRoomPlan): boolean {
  if (plan.bossMinLong <= 0) return true;
  return (
    Math.max(room.w, room.h) >= plan.bossMinLong &&
    Math.min(room.w, room.h) >= plan.bossMinShort
  );
}

function roomsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  pad = 1,
): boolean {
  return (
    a.x < b.x + b.w + pad &&
    a.x + a.w + pad > b.x &&
    a.y < b.y + b.h + pad &&
    a.y + a.h + pad > b.y
  );
}

function roomFits(
  room: { x: number; y: number; w: number; h: number },
  rooms: { x: number; y: number; w: number; h: number }[],
  width: number,
  height: number,
  ignore?: { x: number; y: number; w: number; h: number },
): boolean {
  if (room.x < 2 || room.y < 2) return false;
  if (room.x + room.w >= width - 2 || room.y + room.h >= height - 2) {
    return false;
  }
  for (const other of rooms) {
    if (other === room || other === ignore) continue;
    if (roomsOverlap(room, other)) return false;
  }
  return true;
}

/** First top-left spot that can hold a w×h hall clear of other rooms. */
function findFreeHall(
  rooms: { x: number; y: number; w: number; h: number }[],
  width: number,
  height: number,
  w: number,
  h: number,
): { x: number; y: number } | null {
  for (let y = 2; y <= height - h - 2; y++) {
    for (let x = 2; x <= width - w - 2; x++) {
      if (roomFits({ x, y, w, h }, rooms, width, height)) return { x, y };
    }
  }
  return null;
}

function growRoomAxis(
  cells: DungeonCell[][],
  rooms: RoomRect[],
  room: RoomRect,
  axis: 'w' | 'h',
  width: number,
  height: number,
): boolean {
  const next = { ...room, [axis]: room[axis] + 1 };
  const origin = axis === 'w' ? 'x' : 'y';
  const back = {
    ...room,
    [origin]: room[origin] - 1,
    [axis]: room[axis] + 1,
  };
  const pick = roomFits(next, rooms, width, height, room)
    ? next
    : roomFits(back, rooms, width, height, room)
      ? back
      : null;
  if (!pick) return false;
  room.x = pick.x;
  room.y = pick.y;
  room.w = pick.w;
  room.h = pick.h;
  carveRoom(cells, room.x, room.y, room.w, room.h);
  return true;
}

/** Thicken or lengthen the last room, then stamp a free boss shape. */
function ensureBossRoom(
  cells: DungeonCell[][],
  rooms: RoomRect[],
  room: RoomRect,
  plan: BiomeRoomPlan,
  width: number,
  height: number,
): void {
  let guard = 0;
  while (!bossMeets(room, plan) && guard++ < 20) {
    const needShort = Math.min(room.w, room.h) < plan.bossMinShort;
    const axis: 'w' | 'h' = needShort
      ? room.w <= room.h
        ? 'w'
        : 'h'
      : room.w >= room.h
        ? 'w'
        : 'h';
    if (growRoomAxis(cells, rooms, room, axis, width, height)) continue;
    if (
      !growRoomAxis(cells, rooms, room, axis === 'w' ? 'h' : 'w', width, height)
    ) {
      break;
    }
  }
  if (bossMeets(room, plan)) return;
  for (const [w, h] of plan.bossShapes) {
    const spot = findFreeHall(rooms, width, height, w, h);
    if (!spot) continue;
    const hall = { x: spot.x, y: spot.y, w, h };
    rooms.push(hall);
    carveRoom(cells, hall.x, hall.y, hall.w, hall.h);
    return;
  }
}

/** 2×2 alcove on a wall. Counts as a wide floor cell for corridor tests. */
function tryCryptNiche(
  cells: DungeonCell[][],
  room: { x: number; y: number; w: number; h: number },
  rnd: () => number,
  width: number,
  height: number,
): void {
  const side = Math.floor(rnd() * 4);
  const span = side % 2 === 0 ? room.w : room.h;
  const along = Math.floor(rnd() * Math.max(1, span - 1));
  let x: number;
  let y: number;
  if (side === 0) {
    x = room.x + along;
    y = room.y - 2;
  } else if (side === 1) {
    x = room.x + room.w;
    y = room.y + along;
  } else if (side === 2) {
    x = room.x + along;
    y = room.y + room.h;
  } else {
    x = room.x - 2;
    y = room.y + along;
  }
  if (x < 1 || y < 1 || x + 2 >= width || y + 2 >= height) return;
  for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 2; dx++) {
      if (cells[y + dy]?.[x + dx] !== 0) return;
    }
  }
  carveRoom(cells, x, y, 2, 2);
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
  const rooms: RoomRect[] = [];
  const plan = biomeRoomPlan(biome);

  for (let i = 0; i < roomCount; i++) {
    const rollA = rnd();
    const rollB = rnd();
    const role: CryptRoomRole =
      i === 0 ? 'start' : i === roomCount - 1 ? 'boss' : 'hall';
    const shaped = plan ? biomeRoomSize(biome.id, role, rollA, rollB) : null;
    const sized = shaped ?? {
      w: 5 + Math.floor(rollA * 5),
      h: 5 + Math.floor(rollB * 5),
    };
    const w = sized.w;
    const h = sized.h;
    const x = 2 + Math.floor(rnd() * (width - w - 4));
    const y = 2 + Math.floor(rnd() * (height - h - 4));
    let overlaps = false;
    for (const r of rooms) {
      if (roomsOverlap({ x, y, w, h }, r)) {
        overlaps = true;
        break;
      }
    }
    if (overlaps && rooms.length > 0) continue;
    rooms.push({ x, y, w, h });
    carveRoom(cells, x, y, w, h);
  }

  if (plan && rooms.length < 3) {
    for (const extra of plan.rescue) {
      if (rooms.length >= 3) break;
      if (!roomFits(extra, rooms, width, height)) continue;
      rooms.push(extra);
      carveRoom(cells, extra.x, extra.y, extra.w, extra.h);
    }
  }

  if (rooms.length < 3) {
    // fallback open arena
    carveRoom(cells, 8, 8, 20, 20);
    rooms.push({ x: 8, y: 8, w: 20, h: 20 });
  }

  if (plan && plan.bossMinLong > 0 && rooms.length > 0) {
    ensureBossRoom(cells, rooms, rooms[rooms.length - 1]!, plan, width, height);
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
      plan?.corridor === 'straight' ? 'straight' : 'jagged',
    );
  }

  if (plan?.niches) {
    for (let i = 1; i < rooms.length - 1; i++) {
      tryCryptNiche(cells, rooms[i]!, rnd, width, height);
    }
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
    bossId: biome.bossId ?? 'rift_lord',
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

  // Optional champion spur — carved after packs so trash stays on the spine.
  const champ = stampChampionSideRoom({
    cells,
    rooms,
    rnd,
    width,
    height,
    biomeId: biome.id,
  });
  if (champ) {
    layout.champion = {
      enemyId: champ.enemyId,
      x: champ.x,
      y: champ.y,
    };
    layout.packs.push({
      enemyId: champ.enemyId,
      count: 1,
      x: champ.x,
      y: champ.y,
      champion: true,
    });
  } else {
    layout.champion = null;
  }

  const expectedKills = packsTowardKillGoal(layout.packs);
  const fillRatio = riftKillGoalFillRatio(d);
  // The goal must stay reachable: never ask for more kills than the rift
  // actually spawned, or the boss can never appear and the run can only be
  // abandoned. Mod pack bonuses only add foes, so this stays conservative.
  // Champion packs are excluded — skipping the spur still reaches the boss.
  const supplyCap = Math.max(
    minRiftEnemyCount(d),
    Math.floor(expectedKills * fillRatio),
  );
  layout.killGoal = Math.min(12 + d, Math.min(supplyCap, expectedKills));

  // Room decor (not start/boss): walkable floor, 1-tile margin, no key cells.
  const blocked = new Set<string>();
  if (layout.spawn)
    blocked.add(`${Math.floor(layout.spawn.x)},${Math.floor(layout.spawn.y)}`);
  if (layout.elite)
    blocked.add(`${Math.floor(layout.elite.x)},${Math.floor(layout.elite.y)}`);
  if (layout.bench)
    blocked.add(`${Math.floor(layout.bench.x)},${Math.floor(layout.bench.y)}`);
  if (layout.champion) {
    blocked.add(
      `${Math.floor(layout.champion.x)},${Math.floor(layout.champion.y)}`,
    );
  }
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
