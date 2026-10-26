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
  'lantern' | 'stall' | 'well' | 'crate' | 'rock' | 'bush';

export type HubDecor = SpawnPoint & { kind: HubDecorKind };

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
  /** World size for open hub (default 24). */
  size?: number;
};

/** Safe plaza diamond — no hostile packs. */
export function inPlaza(x: number, y: number): boolean {
  return x >= 14 && x <= 21 && y >= 14 && y <= 21;
}

function nearRoad(x: number, y: number): boolean {
  // Cross roads from plaza
  if (Math.abs(x - 17) <= 1 && y >= 4 && y <= 30) return true;
  if (Math.abs(y - 17) <= 1 && x >= 4 && x <= 30) return true;
  return false;
}

/**
 * Hub town + open wilderness fringe.
 * Plaza is safe; roads lead out; wild has gathering + starter packs.
 */
export function generateHub(seed = 1): ZoneLayout {
  const rnd = mulberry32(seed);
  const size = 36;
  const nodes: ZoneLayout['nodes'] = [];
  const packs: ZoneLayout['packs'] = [];
  const paths: SpawnPoint[] = [];
  const decor: HubDecor[] = [];

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

  // Gathering fringe (outside plaza + road)
  for (let i = 0; i < 22; i++) {
    let x = 2 + rnd() * (size - 4);
    let y = 2 + rnd() * (size - 4);
    let guard = 0;
    while ((inPlaza(x, y) || nearRoad(x, y)) && guard++ < 16) {
      x = 2 + rnd() * (size - 4);
      y = 2 + rnd() * (size - 4);
    }
    if (inPlaza(x, y) || nearRoad(x, y)) continue;
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

  // Scenic rocks / bushes
  for (let i = 0; i < 18; i++) {
    const x = 2 + rnd() * (size - 4);
    const y = 2 + rnd() * (size - 4);
    if (inPlaza(x, y)) continue;
    decor.push({
      kind: rnd() > 0.45 ? 'rock' : 'bush',
      x: Math.floor(x) + 0.5,
      y: Math.floor(y) + 0.5,
    });
  }

  // Starter packs in the four wild corners (never in plaza)
  const fringeSpots: SpawnPoint[] = [
    { x: 5, y: 5 },
    { x: 30, y: 6 },
    { x: 6, y: 29 },
    { x: 29, y: 28 },
    { x: 8, y: 12 },
    { x: 28, y: 14 },
    { x: 12, y: 28 },
    { x: 24, y: 8 },
  ];
  for (const spot of fringeSpots) {
    if (inPlaza(spot.x, spot.y)) continue;
    const weak = rnd() > 0.35;
    packs.push({
      enemyId: weak ? 'ash_scamp' : 'wisp',
      count: 2 + Math.floor(rnd() * 3),
      x: spot.x + 0.5,
      y: spot.y + 0.5,
    });
  }

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
