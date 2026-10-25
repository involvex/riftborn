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

export type ZoneLayout = {
  nodes: { defId: string; x: number; y: number }[];
  packs: { enemyId: string; count: number; x: number; y: number }[];
  portal: SpawnPoint | null;
  bench: SpawnPoint;
  elite: SpawnPoint | null;
  spawn?: SpawnPoint;
};

export function generateHub(seed = 1): ZoneLayout {
  const rnd = mulberry32(seed);
  const nodes: ZoneLayout['nodes'] = [];
  const packs: ZoneLayout['packs'] = [];

  for (let i = 0; i < 8; i++) {
    nodes.push({
      defId: rnd() > 0.45 ? 'ash_tree' : 'rift_vein',
      x: 3 + rnd() * 18,
      y: 3 + rnd() * 18,
    });
  }

  const packTypes = ['shade', 'crawler', 'wisp'] as const;
  for (let i = 0; i < 5; i++) {
    const enemyId = packTypes[Math.floor(rnd() * packTypes.length)];
    packs.push({
      enemyId,
      count: 3 + Math.floor(rnd() * 5),
      x: 4 + rnd() * 16,
      y: 4 + rnd() * 16,
    });
  }

  return {
    nodes,
    packs,
    portal: { x: 20, y: 4 },
    bench: { x: 6, y: 6 },
    elite: null,
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
