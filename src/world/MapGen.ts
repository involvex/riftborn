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

export type ZoneLayout = {
  nodes: { defId: string; x: number; y: number }[];
  packs: { enemyId: string; count: number; x: number; y: number }[];
  portal: SpawnPoint | null;
  bench: SpawnPoint;
  elite: SpawnPoint | null;
  spawn?: SpawnPoint;
  npcs?: NpcSpawn[];
  /** Hub path tiles (lighter plaza). */
  paths?: SpawnPoint[];
};

function inPlaza(x: number, y: number): boolean {
  return x >= 7 && x <= 16 && y >= 7 && y <= 16;
}

/** Safe hub town: plaza, vendor, crafter; gathering + light packs on the fringe. */
export function generateHub(seed = 1): ZoneLayout {
  const rnd = mulberry32(seed);
  const nodes: ZoneLayout['nodes'] = [];
  const packs: ZoneLayout['packs'] = [];
  const paths: SpawnPoint[] = [];

  // Plaza diamond path
  for (let y = 8; y <= 15; y++) {
    for (let x = 8; x <= 15; x++) {
      paths.push({ x, y });
    }
  }
  // Road to rift portal
  for (let y = 4; y <= 8; y++) paths.push({ x: 12, y });
  for (let x = 12; x <= 20; x++) paths.push({ x, y: 4 });

  // Gathering only outside the plaza
  for (let i = 0; i < 10; i++) {
    let x = 2 + rnd() * 20;
    let y = 2 + rnd() * 20;
    let guard = 0;
    while (inPlaza(x, y) && guard++ < 12) {
      x = 2 + rnd() * 20;
      y = 2 + rnd() * 20;
    }
    if (inPlaza(x, y)) continue;
    nodes.push({
      defId: rnd() > 0.4 ? 'ash_tree' : 'rift_vein',
      x,
      y,
    });
  }

  // Light fringe packs — keep away from town square
  const packTypes = ['shade', 'crawler', 'wisp'] as const;
  for (let i = 0; i < 3; i++) {
    let x = 2 + rnd() * 6;
    const y = 2 + rnd() * 20;
    if (rnd() > 0.5) x = 17 + rnd() * 5;
    packs.push({
      enemyId: packTypes[Math.floor(rnd() * packTypes.length)],
      count: 2 + Math.floor(rnd() * 3),
      x,
      y,
    });
  }

  return {
    nodes,
    packs,
    portal: { x: 20, y: 4 },
    bench: { x: 14, y: 10 },
    elite: null,
    spawn: { x: 12, y: 14 },
    npcs: [
      {
        id: 'vendor_mira',
        role: 'vendor',
        name: 'Mira',
        x: 10,
        y: 10,
      },
      {
        id: 'crafter_bram',
        role: 'crafter',
        name: 'Bram',
        x: 14,
        y: 10,
      },
    ],
    paths,
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
    portal: { x: 12, y: 20 },
    bench: { x: 4, y: 20 },
    elite: { x: 12, y: 12 },
  };
}
