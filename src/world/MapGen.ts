/** Deterministic PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export type SpawnPoint = { x: number; y: number };

export type NpcRole = 'vendor' | 'crafter' | 'board' | 'trader';

export type NpcSpawn = SpawnPoint & {
  id: string;
  role: NpcRole;
  name: string;
};

export type HubDecorKind =
  | 'lantern'
  | 'stall'
  | 'well'
  | 'crate'
  | 'rock'
  | 'bush'
  | 'tent'
  | 'campfire'
  | 'pillar'
  | 'rubble'
  | 'altar'
  | 'totem';

export type HubDecor = SpawnPoint & { kind: HubDecorKind };

export type PoiKind =
  'camp' | 'ruin' | 'scout' | 'shrine' | 'warren' | 'grove' | 'watch' | 'cairn';

/** Named wilderness landmark with mid-tier packs. */
export type WildernessPoi = SpawnPoint & {
  id: string;
  kind: PoiKind;
  name: string;
  /** Approx radius in tiles for clearing / proximity. */
  radius: number;
};

export type ChestSpawn = SpawnPoint & {
  id: string;
  /** 1=fringe, 2=normal, 3=tough POI, 4=elite. */
  lootTier: 1 | 2 | 3 | 4;
};

export type ZoneLayout = {
  nodes: { defId: string; x: number; y: number }[];
  packs: { enemyId: string; count: number; x: number; y: number }[];
  /** Town: rift obelisk. Rift: exit portal (null until boss dies). */
  portal: SpawnPoint | null;
  bench: SpawnPoint;
  /** Preferred boss spawn (rift). */
  elite: SpawnPoint | null;
  spawn?: SpawnPoint;
  npcs?: NpcSpawn[];
  /** Hub path / plaza tiles. */
  paths?: SpawnPoint[];
  /** Kill goal for rift progress bar. */
  killGoal?: number;
  /** Atmospheric props (hub). */
  decor?: HubDecor[];
  /** Named wilderness points of interest. */
  pois?: WildernessPoi[];
  /** Lootable chests (often next to tough packs). */
  chests?: ChestSpawn[];
  /** World size for open hub. */
  size?: number;
};

/** Open hub extent (tiles on each axis). */
export const HUB_SIZE = 64;
/** Plaza bounds (inclusive tile coords) — safe zone. */
export const PLAZA = { x0: 28, x1: 36, y0: 28, y1: 36 } as const;
export const HUB_ROAD_AXIS = 32;
export const HUB_SPAWN = { x: 32.5, y: 33.5 };

/** Safe plaza — no hostile packs. */
export function inPlaza(x: number, y: number): boolean {
  return x >= PLAZA.x0 && x <= PLAZA.x1 && y >= PLAZA.y0 && y <= PLAZA.y1;
}

/** Soft buffer around town so wilderness packs don't hug the plaza. */
export function nearTown(x: number, y: number, margin = 10): boolean {
  const cx = (PLAZA.x0 + PLAZA.x1) / 2;
  const cy = (PLAZA.y0 + PLAZA.y1) / 2;
  const half = (PLAZA.x1 - PLAZA.x0) / 2 + margin;
  return Math.abs(x - cx) <= half && Math.abs(y - cy) <= half;
}

function nearRoad(x: number, y: number): boolean {
  const a = HUB_ROAD_AXIS;
  if (Math.abs(x - a) <= 1 && y >= 6 && y <= HUB_SIZE - 6) return true;
  if (Math.abs(y - a) <= 1 && x >= 6 && x <= HUB_SIZE - 6) return true;
  return false;
}

function nearPoi(x: number, y: number, pois: WildernessPoi[]): boolean {
  for (const p of pois) {
    if (Math.hypot(x - p.x, y - p.y) <= p.radius + 0.5) return true;
  }
  return false;
}

function fillClearing(
  paths: SpawnPoint[],
  cx: number,
  cy: number,
  radius: number,
): void {
  const r = Math.ceil(radius);
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if (Math.hypot(x - cx, y - cy) <= radius + 0.2) {
        paths.push({ x, y });
      }
    }
  }
}

function spur(
  paths: SpawnPoint[],
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): void {
  const steps = Math.max(
    Math.abs(Math.round(toX - fromX)),
    Math.abs(Math.round(toY - fromY)),
  );
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    paths.push({
      x: Math.round(fromX + (toX - fromX) * t),
      y: Math.round(fromY + (toY - fromY) * t),
    });
  }
}

/**
 * Hub town + wide wilderness + named POIs + chests.
 * Plaza is safe; long roads lead out; shrine grants a timed damage buff.
 */
export function generateHub(seed = 1): ZoneLayout {
  const rnd = mulberry32(seed);
  const size = HUB_SIZE;
  const axis = HUB_ROAD_AXIS;
  const nodes: ZoneLayout['nodes'] = [];
  const packs: ZoneLayout['packs'] = [];
  const paths: SpawnPoint[] = [];
  const decor: HubDecor[] = [];
  const chests: ChestSpawn[] = [];

  const pois: WildernessPoi[] = [
    {
      id: 'ashbandit_camp',
      kind: 'camp',
      name: 'Ashbandit Camp',
      x: 10.5,
      y: 54.5,
      radius: 2.8,
    },
    {
      id: 'riftscar_ruin',
      kind: 'ruin',
      name: 'Riftscar Ruin',
      x: 54.5,
      y: 10.5,
      radius: 3.0,
    },
    {
      id: 'lone_scout_camp',
      kind: 'scout',
      name: 'Lone Scout Camp',
      x: 54.5,
      y: 54.5,
      radius: 2.4,
    },
    {
      id: 'ember_shrine',
      kind: 'shrine',
      name: 'Ember Shrine',
      x: 10.5,
      y: 10.5,
      radius: 2.6,
    },
    {
      id: 'bone_warren',
      kind: 'warren',
      name: 'Bone Warren',
      x: 8.5,
      y: 32.5,
      radius: 2.6,
    },
    {
      id: 'ash_grove',
      kind: 'grove',
      name: 'Ash Grove',
      x: 22.5,
      y: 8.5,
      radius: 2.5,
    },
    {
      id: 'watch_ridge',
      kind: 'watch',
      name: 'Watch Ridge',
      x: 56.5,
      y: 32.5,
      radius: 2.5,
    },
    {
      id: 'hollow_cairn',
      kind: 'cairn',
      name: 'Hollow Cairn',
      x: 40.5,
      y: 56.5,
      radius: 2.7,
    },
  ];

  // Plaza floor
  for (let y = PLAZA.y0; y <= PLAZA.y1; y++) {
    for (let x = PLAZA.x0; x <= PLAZA.x1; x++) {
      paths.push({ x, y });
    }
  }
  // Crossroads through town
  for (let y = 8; y <= size - 8; y++) {
    paths.push({ x: axis, y });
    paths.push({ x: axis - 1, y });
    paths.push({ x: axis + 1, y });
  }
  for (let x = 8; x <= size - 8; x++) {
    paths.push({ x, y: axis });
    if (x % 3 === 0) paths.push({ x, y: axis - 1 });
  }
  // Spur roads toward POIs
  for (const poi of pois) {
    spur(paths, axis, axis, Math.floor(poi.x), Math.floor(poi.y));
    fillClearing(paths, Math.floor(poi.x), Math.floor(poi.y), poi.radius);
  }

  // Plaza props
  decor.push({ kind: 'well', x: 32.5, y: 32.5 });
  decor.push({ kind: 'lantern', x: 28.5, y: 28.5 });
  decor.push({ kind: 'lantern', x: 36.5, y: 28.5 });
  decor.push({ kind: 'lantern', x: 28.5, y: 36.5 });
  decor.push({ kind: 'lantern', x: 36.5, y: 36.5 });
  decor.push({ kind: 'stall', x: 30.5, y: 30.5 });
  decor.push({ kind: 'crate', x: 34.5, y: 30.5 });
  decor.push({ kind: 'crate', x: 35.5, y: 31.5 });
  decor.push({ kind: 'lantern', x: 32.5, y: 20.5 });

  // —— Ashbandit Camp (SW) ——
  decor.push({ kind: 'campfire', x: 10.5, y: 54.5 });
  decor.push({ kind: 'tent', x: 9.5, y: 53.5 });
  decor.push({ kind: 'tent', x: 11.5, y: 53.5 });
  decor.push({ kind: 'tent', x: 9.5, y: 55.5 });
  decor.push({ kind: 'crate', x: 11.5, y: 55.5 });
  decor.push({ kind: 'crate', x: 12.5, y: 54.5 });
  decor.push({ kind: 'lantern', x: 8.5, y: 54.5 });

  // —— Riftscar Ruin (NE) ——
  decor.push({ kind: 'pillar', x: 53.5, y: 9.5 });
  decor.push({ kind: 'pillar', x: 55.5, y: 9.5 });
  decor.push({ kind: 'pillar', x: 53.5, y: 11.5 });
  decor.push({ kind: 'pillar', x: 55.5, y: 11.5 });
  decor.push({ kind: 'rubble', x: 54.5, y: 10.5 });
  decor.push({ kind: 'rubble', x: 53.5, y: 10.5 });
  decor.push({ kind: 'rubble', x: 55.5, y: 10.5 });

  // —— Lone Scout Camp (SE) ——
  decor.push({ kind: 'campfire', x: 54.5, y: 54.5 });
  decor.push({ kind: 'tent', x: 53.5, y: 53.5 });
  decor.push({ kind: 'crate', x: 55.5, y: 54.5 });
  decor.push({ kind: 'lantern', x: 55.5, y: 53.5 });
  decor.push({ kind: 'bush', x: 53.5, y: 55.5 });

  // —— Ember Shrine (NW) ——
  decor.push({ kind: 'altar', x: 10.5, y: 10.5 });
  decor.push({ kind: 'lantern', x: 9.5, y: 9.5 });
  decor.push({ kind: 'lantern', x: 11.5, y: 9.5 });
  decor.push({ kind: 'rock', x: 9.5, y: 11.5 });
  decor.push({ kind: 'rock', x: 11.5, y: 11.5 });

  // —— Bone Warren (W) ——
  decor.push({ kind: 'rubble', x: 8.5, y: 32.5 });
  decor.push({ kind: 'rubble', x: 7.5, y: 31.5 });
  decor.push({ kind: 'rubble', x: 9.5, y: 33.5 });
  decor.push({ kind: 'totem', x: 7.5, y: 33.5 });
  decor.push({ kind: 'bush', x: 9.5, y: 31.5 });

  // —— Ash Grove (N) ——
  decor.push({ kind: 'bush', x: 22.5, y: 8.5 });
  decor.push({ kind: 'bush', x: 21.5, y: 7.5 });
  decor.push({ kind: 'bush', x: 23.5, y: 9.5 });
  decor.push({ kind: 'rock', x: 23.5, y: 7.5 });
  decor.push({ kind: 'lantern', x: 21.5, y: 9.5 });

  // —— Watch Ridge (E) ——
  decor.push({ kind: 'totem', x: 56.5, y: 32.5 });
  decor.push({ kind: 'campfire', x: 57.5, y: 31.5 });
  decor.push({ kind: 'crate', x: 55.5, y: 33.5 });
  decor.push({ kind: 'lantern', x: 57.5, y: 33.5 });

  // —— Hollow Cairn (S) ——
  decor.push({ kind: 'pillar', x: 40.5, y: 56.5 });
  decor.push({ kind: 'rubble', x: 39.5, y: 55.5 });
  decor.push({ kind: 'rubble', x: 41.5, y: 57.5 });
  decor.push({ kind: 'rock', x: 39.5, y: 57.5 });
  decor.push({ kind: 'rock', x: 41.5, y: 55.5 });

  // Extra POI clutter so clearings read as places, not empty circles
  decor.push({ kind: 'crate', x: 10.5, y: 52.5 });
  decor.push({ kind: 'bush', x: 12.5, y: 53.5 });
  decor.push({ kind: 'lantern', x: 54.5, y: 11.5 });
  decor.push({ kind: 'rock', x: 52.5, y: 10.5 });
  decor.push({ kind: 'bush', x: 55.5, y: 55.5 });
  decor.push({ kind: 'crate', x: 52.5, y: 54.5 });
  decor.push({ kind: 'rock', x: 10.5, y: 12.5 });
  decor.push({ kind: 'bush', x: 8.5, y: 10.5 });
  decor.push({ kind: 'rock', x: 8.5, y: 34.5 });
  decor.push({ kind: 'lantern', x: 9.5, y: 32.5 });
  decor.push({ kind: 'bush', x: 24.5, y: 8.5 });
  decor.push({ kind: 'rock', x: 20.5, y: 8.5 });
  decor.push({ kind: 'crate', x: 56.5, y: 30.5 });
  decor.push({ kind: 'bush', x: 55.5, y: 31.5 });
  decor.push({ kind: 'lantern', x: 40.5, y: 55.5 });
  decor.push({ kind: 'bush', x: 41.5, y: 56.5 });

  // Path-edge props — roads feel lined, not barren
  for (const p of paths) {
    if (inPlaza(p.x, p.y) || nearTown(p.x, p.y, 4)) continue;
    if (rnd() > 0.12) continue;
    const ox = rnd() > 0.5 ? 1 : -1;
    const oy = rnd() > 0.5 ? 1 : -1;
    const dx = p.x + (rnd() > 0.5 ? ox : 0);
    const dy = p.y + (rnd() > 0.5 ? oy : 0);
    if (inPlaza(dx, dy) || nearPoi(dx, dy, pois)) continue;
    decor.push({
      kind: rnd() > 0.55 ? 'bush' : rnd() > 0.4 ? 'rock' : 'lantern',
      x: dx + 0.5,
      y: dy + 0.5,
    });
  }

  // Gathering across the wide fringe
  for (let i = 0; i < 48; i++) {
    let x = 3 + rnd() * (size - 6);
    let y = 3 + rnd() * (size - 6);
    let guard = 0;
    while (
      (inPlaza(x, y) ||
        nearTown(x, y, 6) ||
        nearRoad(x, y) ||
        nearPoi(x, y, pois)) &&
      guard++ < 20
    ) {
      x = 3 + rnd() * (size - 6);
      y = 3 + rnd() * (size - 6);
    }
    if (
      inPlaza(x, y) ||
      nearTown(x, y, 6) ||
      nearRoad(x, y) ||
      nearPoi(x, y, pois)
    ) {
      continue;
    }
    const roll = rnd();
    const defId =
      roll > 0.55 ? 'ash_tree' : roll > 0.25 ? 'rift_vein' : 'berry_bush';
    nodes.push({
      defId,
      x: Math.floor(x) + 0.5,
      y: Math.floor(y) + 0.5,
    });
  }

  nodes.push({ defId: 'rift_vein', x: 54.5, y: 9.5 });
  nodes.push({ defId: 'rift_vein', x: 55.5, y: 12.5 });
  nodes.push({ defId: 'ash_tree', x: 8.5, y: 53.5 });
  nodes.push({ defId: 'berry_bush', x: 12.5, y: 56.5 });
  nodes.push({ defId: 'ash_tree', x: 21.5, y: 9.5 });
  nodes.push({ defId: 'berry_bush', x: 23.5, y: 8.5 });
  nodes.push({ defId: 'rift_vein', x: 39.5, y: 56.5 });

  for (let i = 0; i < 72; i++) {
    const x = 3 + rnd() * (size - 6);
    const y = 3 + rnd() * (size - 6);
    if (inPlaza(x, y) || nearPoi(x, y, pois)) continue;
    decor.push({
      kind: rnd() > 0.5 ? 'rock' : rnd() > 0.25 ? 'bush' : 'lantern',
      x: Math.floor(x) + 0.5,
      y: Math.floor(y) + 0.5,
    });
  }

  // Quiet fringe packs — outside the town buffer
  const fringeSpots: SpawnPoint[] = [
    { x: 18, y: 18 },
    { x: 46, y: 18 },
    { x: 18, y: 46 },
    { x: 46, y: 46 },
    { x: 24, y: 48 },
    { x: 48, y: 24 },
    { x: 16, y: 40 },
    { x: 40, y: 16 },
  ];
  for (const spot of fringeSpots) {
    if (
      inPlaza(spot.x, spot.y) ||
      nearTown(spot.x, spot.y) ||
      nearPoi(spot.x, spot.y, pois)
    ) {
      continue;
    }
    const weak = rnd() > 0.35;
    packs.push({
      enemyId: weak ? 'ash_scamp' : 'wisp',
      count: 2 + Math.floor(rnd() * 2),
      x: spot.x + 0.5,
      y: spot.y + 0.5,
    });
  }

  // —— Packs at POIs ——
  packs.push(
    { enemyId: 'shade', count: 3, x: 10.5, y: 54.5 },
    { enemyId: 'ash_scamp', count: 2, x: 9.5, y: 53.5 },
    { enemyId: 'ash_scamp', count: 2, x: 11.5, y: 55.5 },
  );
  packs.push(
    { enemyId: 'crawler', count: 2, x: 54.5, y: 10.5 },
    { enemyId: 'shade', count: 3, x: 53.5, y: 11.5 },
    { enemyId: 'wisp', count: 2, x: 55.5, y: 9.5 },
    { enemyId: 'crawler', count: 1, x: 55.5, y: 11.5 },
  );
  packs.push({ enemyId: 'ash_scout', count: 1, x: 54.5, y: 54.5 });
  packs.push(
    { enemyId: 'wisp', count: 2, x: 10.5, y: 9.5 },
    { enemyId: 'ash_scamp', count: 2, x: 11.5, y: 11.5 },
  );
  packs.push(
    { enemyId: 'crawler', count: 3, x: 8.5, y: 32.5 },
    { enemyId: 'crawler', count: 2, x: 7.5, y: 31.5 },
    { enemyId: 'shade', count: 2, x: 9.5, y: 33.5 },
  );
  packs.push(
    { enemyId: 'wisp', count: 4, x: 22.5, y: 8.5 },
    { enemyId: 'wisp', count: 2, x: 23.5, y: 9.5 },
  );
  packs.push(
    { enemyId: 'shade', count: 3, x: 56.5, y: 32.5 },
    { enemyId: 'ash_scamp', count: 2, x: 57.5, y: 31.5 },
    { enemyId: 'wisp', count: 2, x: 55.5, y: 33.5 },
  );
  packs.push(
    { enemyId: 'crawler', count: 2, x: 40.5, y: 56.5 },
    { enemyId: 'shade', count: 3, x: 39.5, y: 55.5 },
    { enemyId: 'crawler', count: 1, x: 41.5, y: 57.5 },
  );

  chests.push(
    { id: 'chest_camp', x: 12.5, y: 53.5, lootTier: 2 },
    { id: 'chest_ruin', x: 56.5, y: 11.5, lootTier: 3 },
    { id: 'chest_scout', x: 55.5, y: 55.5, lootTier: 3 },
    { id: 'chest_warren', x: 9.5, y: 31.5, lootTier: 3 },
    { id: 'chest_grove', x: 23.5, y: 7.5, lootTier: 2 },
    { id: 'chest_watch', x: 57.5, y: 33.5, lootTier: 2 },
    { id: 'chest_cairn', x: 41.5, y: 55.5, lootTier: 3 },
    { id: 'chest_shrine', x: 9.5, y: 10.5, lootTier: 2 },
  );

  return {
    size,
    nodes,
    packs,
    portal: { x: 32.5, y: 18.5 },
    bench: { x: 34.5, y: 31.5 },
    elite: null,
    spawn: { ...HUB_SPAWN },
    npcs: [
      {
        id: 'vendor_mira',
        role: 'vendor',
        name: 'Mira',
        x: 30.5,
        y: 31.5,
      },
      {
        id: 'crafter_bram',
        role: 'crafter',
        name: 'Bram',
        x: 34.5,
        y: 31.5,
      },
      {
        id: 'board_bounties',
        role: 'board',
        name: 'Bounty Board',
        x: 32.5,
        y: 35.5,
      },
      {
        id: 'trader_nix',
        role: 'trader',
        name: 'Nix',
        x: 28.5,
        y: 34.5,
      },
    ],
    paths,
    decor,
    pois,
    chests,
  };
}

export function generateRift(seed: number): ZoneLayout {
  const rnd = mulberry32(seed);
  const nodes: ZoneLayout['nodes'] = [];
  const packs: ZoneLayout['packs'] = [];
  const chests: ChestSpawn[] = [];

  for (let i = 0; i < 4; i++) {
    nodes.push({
      defId: 'rift_vein',
      x: 4 + rnd() * 16,
      y: 4 + rnd() * 16,
    });
  }

  const packTypes = ['shade', 'crawler', 'wisp'] as const;
  for (let wave = 0; wave < 7; wave++) {
    const enemyId = packTypes[Math.floor(rnd() * packTypes.length)];
    const x = 3 + rnd() * 18;
    const y = 3 + rnd() * 18;
    packs.push({
      enemyId,
      count: 4 + Math.floor(rnd() * 5),
      x,
      y,
    });
    if (rnd() > 0.45) {
      chests.push({
        id: `rift_chest_${wave}`,
        x: x + 1.2,
        y: y - 0.8,
        lootTier: enemyId === 'crawler' ? 3 : 2,
      });
    }
  }
  chests.push({ id: 'rift_chest_boss', x: 13.5, y: 11.5, lootTier: 4 });

  return {
    nodes,
    packs,
    portal: null,
    bench: { x: 4, y: 20 },
    elite: { x: 12, y: 12 },
    killGoal: 18,
    chests,
  };
}
