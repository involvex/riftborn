import type { ShiftLayerId } from '../data/shiftLayers';

export type RiftModifierId =
  'dense' | 'glass' | 'wealthy' | 'swift' | 'veiled' | 'none';

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
  /** Multiplier on enemy move speed. */
  speedMult: number;
  /** Lock every foe (and the boss) to one layer; null = free. */
  lockedLayer: ShiftLayerId | null;
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
    speedMult: 1,
    lockedLayer: null,
    goldOnKill: 0,
    lootBump: 0,
  },
  {
    id: 'dense',
    name: 'Dense Packs',
    blurb: 'More foes in every room.',
    packCountBonus: 1,
    hpMult: 1,
    dmgMult: 1.05,
    speedMult: 1,
    lockedLayer: null,
    goldOnKill: 0,
    lootBump: 0,
  },
  {
    id: 'glass',
    name: 'Glass Cannon',
    blurb: 'Enemies hit harder, die faster.',
    packCountBonus: 0,
    hpMult: 0.7,
    dmgMult: 1.3,
    speedMult: 1,
    lockedLayer: null,
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
    speedMult: 1,
    lockedLayer: null,
    goldOnKill: 3,
    lootBump: 1,
  },
  {
    id: 'swift',
    name: 'Swift Hunt',
    blurb: 'Faster packs, more of them, but frail.',
    packCountBonus: 1,
    hpMult: 0.9,
    dmgMult: 1.05,
    speedMult: 1.35,
    lockedLayer: null,
    goldOnKill: 0,
    lootBump: 0,
  },
  {
    id: 'veiled',
    name: 'Ashen Veil',
    blurb:
      'Foes only on Asche — SHIFT to Asche to hit them (not a combat bug).',
    packCountBonus: 0,
    hpMult: 1,
    dmgMult: 1,
    speedMult: 1,
    lockedLayer: 'ash',
    goldOnKill: 2,
    lootBump: 1,
  },
];

/** Late-game table — spicy, calm stays uncommon. */
function lateModWeights(): RiftModifier[] {
  return [
    MODS[0]!,
    MODS[1]!,
    MODS[2]!,
    MODS[3]!,
    MODS[3]!,
    MODS[4]!,
    MODS[4]!,
    MODS[5]!,
  ];
}

/**
 * Early depths favour Calm / Gilded and skip Dense + Veil so the first
 * rifts teach SHIFT gates without packing or layer-lock spikes.
 */
function earlyModWeights(): RiftModifier[] {
  return [
    MODS[0]!,
    MODS[0]!,
    MODS[0]!,
    MODS[3]!,
    MODS[3]!,
    MODS[2]!,
    MODS[4]!,
    MODS[0]!,
  ];
}

/** Pick a modifier for this rift run (biased away from calm). */
export function rollRiftModifier(rng = Math.random): RiftModifier {
  return rollRiftModifierForDepth(10, rng);
}

/** Depth-aware roll — kinder tables for D1–D2. */
export function rollRiftModifierForDepth(
  depth: number,
  rng = Math.random,
): RiftModifier {
  const d = Math.max(1, Math.min(10, depth));
  const weighted = d <= 2 ? earlyModWeights() : lateModWeights();
  return weighted[Math.floor(rng() * weighted.length)]!;
}

export function getRiftModifier(id: RiftModifierId): RiftModifier {
  return MODS.find((m) => m.id === id) ?? MODS[0]!;
}

/** Layer every spawned foe must live on (null = mod leaves layers free). */
export function riftModLayerLock(mod: RiftModifier): ShiftLayerId | null {
  return mod.lockedLayer;
}
