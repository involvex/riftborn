/**
 * Biome craft sinks as one-rift elixirs.
 * Use from the bag before the obelisk (or mid-rift) — effects last one run.
 */

export const RIFT_ELIXIR_IDS = [
  'ashen_charm',
  'crystal_lens',
  'grove_tonic',
  'salt_charm',
] as const;

export type RiftElixirId = (typeof RIFT_ELIXIR_IDS)[number];

export type RiftElixirDef = {
  id: RiftElixirId;
  /** Short bag / toast line. */
  blurb: string;
  /** Armed in town for next rift. */
  armToast: string;
  /** Used while already in a rift. */
  activateToast: string;
};

const DEFS: Record<RiftElixirId, RiftElixirDef> = {
  ashen_charm: {
    id: 'ashen_charm',
    blurb: 'Next rift: full SHIFT energy',
    armToast: 'Ashen Charm — SHIFT full on rift entry',
    activateToast: 'Ashen Charm — SHIFT filled',
  },
  crystal_lens: {
    id: 'crystal_lens',
    blurb: 'Next rift: Barrier pulse when the boss appears',
    armToast: 'Crystal Lens — Barrier on boss spawn',
    activateToast: 'Crystal Lens — Barrier ready for boss',
  },
  grove_tonic: {
    id: 'grove_tonic',
    blurb: 'Next rift: slows also delay enemy swings',
    armToast: 'Grove Tonic — slows delay swings',
    activateToast: 'Grove Tonic — slows delay swings',
  },
  salt_charm: {
    id: 'salt_charm',
    blurb: 'Next rift: enemy shots deal half damage',
    armToast: 'Salt Charm — shot damage cut',
    activateToast: 'Salt Charm — shot damage cut',
  },
};

/** Crystal Lens barrier when the rift boss spawns. */
export const CRYSTAL_LENS_BARRIER_HP = 60;
export const CRYSTAL_LENS_BARRIER_SEC = 12;

/** Salt Charm incoming shot damage multiplier. */
export const SALT_CHARM_SHOT_MULT = 0.5;

/** While Grove-slowed, attack timers tick at this rate. */
export const GROVE_ATTACK_TICK_MULT = 0.45;

export function isRiftElixirId(id: string): id is RiftElixirId {
  return (RIFT_ELIXIR_IDS as readonly string[]).includes(id);
}

export function getRiftElixirDef(id: string): RiftElixirDef | undefined {
  if (!isRiftElixirId(id)) return undefined;
  return DEFS[id];
}

export function parseElixirIds(raw: unknown): RiftElixirId[] {
  if (!Array.isArray(raw)) return [];
  const out: RiftElixirId[] = [];
  const seen = new Set<string>();
  for (const row of raw) {
    if (typeof row !== 'string' || !isRiftElixirId(row) || seen.has(row)) {
      continue;
    }
    seen.add(row);
    out.push(row);
  }
  return out;
}

export function shotDamageWithSalt(
  damage: number,
  saltActive: boolean,
): number {
  if (!saltActive) return Math.max(1, Math.floor(damage));
  return Math.max(1, Math.floor(damage * SALT_CHARM_SHOT_MULT));
}

export function attackTickDt(
  dt: number,
  slowed: boolean,
  groveActive: boolean,
): number {
  if (slowed && groveActive) return dt * GROVE_ATTACK_TICK_MULT;
  return dt;
}
