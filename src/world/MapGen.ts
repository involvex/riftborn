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

export type NpcRole = 'vendor' | 'crafter';

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
  | 'rubble';

export type HubDecor = SpawnPoint & { kind: HubDecorKind };

export type PoiKind = 'camp' | 'ruin';

/** Named wilderness landmark with mid-tier packs. */
export type WildernessPoi = SpawnPoint & {
  id: string;
  kind: PoiKind;
  name: string;
  /** Approx radius in tiles for clearing / proximity. */
  radius: number;
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
  /** World size for open hub (default 24). */
  size?: number;
};

/** Safe plaza diamond — no hostile packs. */
export function inPlaza(x: number, y: number): boolean {
  return x >= 14 && x <= 21 && y >= 14 && y <= 21;
}

function nearRoad(x: number, y: number): boolean {
  if (Math.abs(x - 17) <= 1 && y >= 4 && y <= 30) return true;
  if (Math.abs(y - 17) <= 1 && x >= 4 && x <= 30) return true;
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

/**
 * Hub town + open wilderness fringe + named POIs.
 * Plaza is safe; roads lead out; wild has gathering, starter packs, camp & ruin.
 */
export function generateHub(seed = 1): ZoneLayout {
  const rnd = mulberry32(seed);
  const size = 36;
  const nodes: ZoneLayout['nodes'] = [];
  const packs: ZoneLayout['packs'] = [];
  const paths: SpawnPoint[] = [];
  const decor: HubDecor[] = [];

  const pois: WildernessPoi[] = [
    {
      id: 'ashbandit_camp',
      kind: 'camp',
      name: 'Ashbandit Camp',
      x: 6.5,
      y: 28.5,
      radius: 2.6,
    },
    {
      id: 'riftscar_ruin',
      kind: 'ruin',
      name: 'Riftscar Ruin',
      x: 29.5,
      y: 7.5,
      radius: 2.8,
    },
  ];

  // Plaza floor
  for (let y = 14; y <= 21; y++) {
    for (let x = 14; x <= 21; x++) {
      paths.push({ x, y });
    }
  }
  // North road → obelisk
  for (let y = 5; y <= 14; y++) {
    paths.push({ x: 17, y });
    paths.push({ x: 16, y });
    paths.push({ x: 18, y });
  }
  // East / west / south arms into the wild
  for (let x = 4; x <= 32; x++) {
    paths.push({ x, y: 17 });
    if (x % 3 === 0) paths.push({ x, y: 16 });
  }
  for (let y = 22; y <= 31; y++) {
    paths.push({ x: 17, y });
  }
  // Spur roads toward POIs
  for (let x = 6; x <= 17; x++) paths.push({ x, y: 28 });
  for (let y = 7; y <= 17; y++) paths.push({ x: 29, y });

  for (const poi of pois) {
    fillClearing(paths, Math.floor(poi.x), Math.floor(poi.y), poi.radius);
  }

  // Plaza props
  decor.push({ kind: 'well', x: 17.5, y: 17.5 });
  decor.push({ kind: 'lantern', x: 14.5, y: 14.5 });
  decor.push({ kind: 'lantern', x: 21.5, y: 14.5 });
  decor.push({ kind: 'lantern', x: 14.5, y: 21.5 });
  decor.push({ kind: 'lantern', x: 21.5, y: 21.5 });
  decor.push({ kind: 'stall', x: 15.5, y: 15.5 });
  decor.push({ kind: 'crate', x: 19.5, y: 15.5 });
  decor.push({ kind: 'crate', x: 20.5, y: 16.5 });
  decor.push({ kind: 'lantern', x: 17.5, y: 6.5 });

  // —— Ashbandit Camp props ——
  decor.push({ kind: 'campfire', x: 6.5, y: 28.5 });
  decor.push({ kind: 'tent', x: 5.5, y: 27.5 });
  decor.push({ kind: 'tent', x: 7.5, y: 27.5 });
  decor.push({ kind: 'tent', x: 5.5, y: 29.5 });
  decor.push({ kind: 'crate', x: 7.5, y: 29.5 });
  decor.push({ kind: 'crate', x: 8.5, y: 28.5 });
  decor.push({ kind: 'lantern', x: 4.5, y: 28.5 });

  // —— Riftscar Ruin props ——
  decor.push({ kind: 'pillar', x: 28.5, y: 6.5 });
  decor.push({ kind: 'pillar', x: 30.5, y: 6.5 });
  decor.push({ kind: 'pillar', x: 28.5, y: 8.5 });
  decor.push({ kind: 'pillar', x: 30.5, y: 8.5 });
  decor.push({ kind: 'rubble', x: 29.5, y: 7.5 });
  decor.push({ kind: 'rubble', x: 28.5, y: 7.5 });
  decor.push({ kind: 'rubble', x: 30.5, y: 7.5 });

  // Gathering fringe (outside plaza, road, POIs)
  for (let i = 0; i < 20; i++) {
    let x = 2 + rnd() * (size - 4);
    let y = 2 + rnd() * (size - 4);
    let guard = 0;
    while (
      (inPlaza(x, y) || nearRoad(x, y) || nearPoi(x, y, pois)) &&
      guard++ < 16
    ) {
      x = 2 + rnd() * (size - 4);
      y = 2 + rnd() * (size - 4);
    }
    if (inPlaza(x, y) || nearRoad(x, y) || nearPoi(x, y, pois)) continue;
    if (Math.abs(x - 17) < 2.5 && y < 8) continue;
    const roll = rnd();
    const defId =
      roll > 0.55 ? 'ash_tree' : roll > 0.25 ? 'rift_vein' : 'berry_bush';
    nodes.push({
      defId,
      x: Math.floor(x) + 0.5,
      y: Math.floor(y) + 0.5,
    });
  }

  // Extra veins at the ruin (loot hook)
  nodes.push({ defId: 'rift_vein', x: 29.5, y: 6.5 });
  nodes.push({ defId: 'rift_vein', x: 30.5, y: 9.5 });
  // Wood near camp
  nodes.push({ defId: 'ash_tree', x: 4.5, y: 27.5 });
  nodes.push({ defId: 'berry_bush', x: 8.5, y: 30.5 });

  // Scenic rocks / bushes
  for (let i = 0; i < 14; i++) {
    const x = 2 + rnd() * (size - 4);
    const y = 2 + rnd() * (size - 4);
    if (inPlaza(x, y) || nearPoi(x, y, pois)) continue;
    decor.push({
      kind: rnd() > 0.45 ? 'rock' : 'bush',
      x: Math.floor(x) + 0.5,
      y: Math.floor(y) + 0.5,
    });
  }

  // Starter packs in quiet fringe (not on POIs)
  const fringeSpots: SpawnPoint[] = [
    { x: 5, y: 5 },
    { x: 12, y: 4 },
    { x: 24, y: 30 },
    { x: 32, y: 22 },
    { x: 8, y: 12 },
    { x: 22, y: 24 },
  ];
  for (const spot of fringeSpots) {
    if (inPlaza(spot.x, spot.y) || nearPoi(spot.x, spot.y, pois)) continue;
    const weak = rnd() > 0.35;
    packs.push({
      enemyId: weak ? 'ash_scamp' : 'wisp',
      count: 2 + Math.floor(rnd() * 2),
      x: spot.x + 0.5,
      y: spot.y + 0.5,
    });
  }

  // Mid-tier packs at named POIs
  // Camp: bandits — shades + scamps
  packs.push(
    { enemyId: 'shade', count: 3, x: 6.5, y: 28.5 },
    { enemyId: 'ash_scamp', count: 2, x: 5.5, y: 27.5 },
    { enemyId: 'ash_scamp', count: 2, x: 7.5, y: 29.5 },
  );
  // Ruin: tougher — crawlers + shades + wisp
  packs.push(
    { enemyId: 'crawler', count: 2, x: 29.5, y: 7.5 },
    { enemyId: 'shade', count: 3, x: 28.5, y: 8.5 },
    { enemyId: 'wisp', count: 2, x: 30.5, y: 6.5 },
    { enemyId: 'crawler', count: 1, x: 30.5, y: 8.5 },
  );

  return {
    size,
    nodes,
    packs,
    portal: { x: 17.5, y: 5.5 },
    bench: { x: 19.5, y: 16.5 },
    elite: null,
    spawn: { x: 17.5, y: 18.5 },
    npcs: [
      {
        id: 'vendor_mira',
        role: 'vendor',
        name: 'Mira',
        x: 15.5,
        y: 16.5,
      },
      {
        id: 'crafter_bram',
        role: 'crafter',
        name: 'Bram',
        x: 19.5,
        y: 16.5,
      },
    ],
    paths,
    decor,
    pois,
  };
}

export function generateRift(seed: number): ZoneLayout {
  const rnd = mulberry32(seed);
  const nodes: ZoneLayout['nodes'] = [];
  const packs: ZoneLayout['packs'] = [];

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
    packs.push({
      enemyId,
      count: 4 + Math.floor(rnd() * 5),
      x: 3 + rnd() * 18,
      y: 3 + rnd() * 18,
    });
  }

  return {
    nodes,
    packs,
    portal: null,
    bench: { x: 4, y: 20 },
    elite: { x: 12, y: 12 },
    killGoal: 18,
  };
}
