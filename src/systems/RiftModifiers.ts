export type RiftModifierId = 'dense' | 'glass' | 'wealthy' | 'none';

export type RiftModifier = {
  id: RiftModifierId;
  name: string;
  blurb: string;
  /** Extra enemies per pack (additive). */
  packCountBonus: number;
  /** Multiplier on enemy HP. */
  hpMult: number;
  /** Multiplier on enemy damage. */
  dmgMult: number;
  /** Extra gold on kill (flat). */
  goldOnKill: number;
  /** Loot tier bump. */
  lootBump: number;
};

const MODS: RiftModifier[] = [
  {
    id: 'none',
    name: 'Calm Rift',
    blurb: 'No special rules.',
    packCountBonus: 0,
    hpMult: 1,
    dmgMult: 1,
    goldOnKill: 0,
    lootBump: 0,
  },
  {
    id: 'dense',
    name: 'Dense Packs',
    blurb: 'More foes in every room.',
    packCountBonus: 2,
    hpMult: 1,
    dmgMult: 1.05,
    goldOnKill: 0,
    lootBump: 0,
  },
  {
    id: 'glass',
    name: 'Glass Cannon',
    blurb: 'Enemies hit harder, die faster.',
    packCountBonus: 0,
    hpMult: 0.7,
    dmgMult: 1.45,
    goldOnKill: 0,
    lootBump: 0,
  },
  {
    id: 'wealthy',
    name: 'Gilded Veins',
    blurb: 'Kills spill extra gold; slightly better loot.',
    packCountBonus: 0,
    hpMult: 1.05,
    dmgMult: 1,
    goldOnKill: 3,
    lootBump: 1,
  },
];

/** Pick a modifier for this rift run (biased away from calm). */
export function rollRiftModifier(rng = Math.random): RiftModifier {
  const weighted = [
    MODS[0]!,
    MODS[1]!,
    MODS[1]!,
    MODS[2]!,
    MODS[2]!,
    MODS[3]!,
    MODS[3]!,
  ];
  return weighted[Math.floor(rng() * weighted.length)]!;
}

export function getRiftModifier(id: RiftModifierId): RiftModifier {
  return MODS.find((m) => m.id === id) ?? MODS[0]!;
}
