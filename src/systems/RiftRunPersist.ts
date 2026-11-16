import type { ShiftLayerId } from '../data/shiftLayers';
import type { GearInstance, LootTier } from '../types/game';
import type { RiftRunEnemySave, RiftRunSave } from '../types/save';
import type { RiftModifierId } from './RiftModifiers';

const MOD_IDS: ReadonlySet<string> = new Set([
  'dense',
  'glass',
  'wealthy',
  'swift',
  'veiled',
  'none',
]);

const LAYERS: ReadonlySet<string> = new Set(['ash', 'shadow']);
const COMBAT_LAYERS: ReadonlySet<string> = new Set(['ash', 'shadow', 'both']);

export type RiftPhase = 'fill' | 'boss' | 'exit';

/** True when a mid-rift save may resume into the dungeon. */
export function isValidRiftRun(run: unknown): run is RiftRunSave {
  if (!run || typeof run !== 'object') return false;
  const r = run as Record<string, unknown>;
  if (typeof r.seed !== 'number' || !Number.isFinite(r.seed)) return false;
  if (typeof r.depth !== 'number' || !Number.isFinite(r.depth) || r.depth < 1) {
    return false;
  }
  if (typeof r.modId !== 'string' || !MOD_IDS.has(r.modId)) return false;
  if (typeof r.kills !== 'number' || r.kills < 0) return false;
  if (typeof r.bossSpawned !== 'boolean') return false;
  if (typeof r.bossDead !== 'boolean') return false;
  if (typeof r.cleared !== 'boolean') return false;
  if (typeof r.shiftLayer !== 'string' || !LAYERS.has(r.shiftLayer)) {
    return false;
  }
  if (typeof r.shiftEnergy !== 'number') return false;
  if (typeof r.shiftCooldownLeft !== 'number') return false;
  if (r.explored != null && typeof r.explored !== 'string') return false;
  if (!Array.isArray(r.enemies) || !Array.isArray(r.groundLoot)) return false;
  if (!Array.isArray(r.nodes)) return false;
  if (r.bossChest != null && typeof r.bossChest !== 'object') return false;
  return true;
}

/** Derive HUD phase from persisted flags. */
export function riftPhaseFromRun(run: {
  bossSpawned: boolean;
  bossDead: boolean;
}): RiftPhase {
  if (run.bossDead) return 'exit';
  if (run.bossSpawned) return 'boss';
  return 'fill';
}

/** Drop dead/corrupt rows; keep at most one boss. */
export function sanitizeRiftEnemies(
  enemies: RiftRunEnemySave[],
): RiftRunEnemySave[] {
  const out: RiftRunEnemySave[] = [];
  let bossKept = false;
  for (const e of enemies) {
    if (!e || typeof e.defId !== 'string' || !e.defId) continue;
    if (typeof e.x !== 'number' || typeof e.y !== 'number') continue;
    if (typeof e.hp !== 'number' || e.hp <= 0) continue;
    const layer =
      typeof e.combatLayer === 'string' && COMBAT_LAYERS.has(e.combatLayer)
        ? e.combatLayer
        : 'both';
    const boss = !!e.boss;
    if (boss && bossKept) continue;
    if (boss) bossKept = true;
    out.push({
      defId: e.defId,
      x: e.x,
      y: e.y,
      hp: e.hp,
      elitePack: !!e.elitePack,
      boss,
      combatLayer: layer as RiftRunEnemySave['combatLayer'],
    });
  }
  return out;
}

export function cloneGearInstance(item: GearInstance): GearInstance {
  return {
    ...item,
    stats: { ...item.stats },
  };
}

/** Soft-parse a blob from disk (invalid → null). */
export function parseRiftRun(raw: unknown): RiftRunSave | null {
  if (!isValidRiftRun(raw)) return null;
  const enemies = sanitizeRiftEnemies(raw.enemies);
  const groundLoot: RiftRunSave['groundLoot'] = [];
  for (const drop of raw.groundLoot) {
    if (!drop || typeof drop !== 'object') continue;
    const d = drop as { x?: unknown; y?: unknown; item?: GearInstance };
    if (typeof d.x !== 'number' || typeof d.y !== 'number') continue;
    if (!d.item || typeof d.item.uid !== 'string') continue;
    groundLoot.push({
      x: d.x,
      y: d.y,
      item: cloneGearInstance(d.item),
    });
  }
  let bossChest: RiftRunSave['bossChest'] = null;
  if (raw.bossChest && typeof raw.bossChest === 'object') {
    const c = raw.bossChest as {
      x?: unknown;
      y?: unknown;
      looted?: unknown;
      lootTier?: unknown;
    };
    const tier = c.lootTier;
    if (
      typeof c.x === 'number' &&
      typeof c.y === 'number' &&
      typeof c.looted === 'boolean' &&
      (tier === 1 || tier === 2 || tier === 3 || tier === 4)
    ) {
      bossChest = {
        x: c.x,
        y: c.y,
        looted: c.looted,
        lootTier: tier as LootTier,
      };
    }
  }
  const nodes: RiftRunSave['nodes'] = [];
  for (const n of raw.nodes) {
    if (!n || typeof n !== 'object') continue;
    const row = n as {
      id?: unknown;
      x?: unknown;
      y?: unknown;
      hp?: unknown;
    };
    if (typeof row.id !== 'string' || !row.id) continue;
    if (typeof row.x !== 'number' || typeof row.y !== 'number') continue;
    if (typeof row.hp !== 'number') continue;
    nodes.push({ id: row.id, x: row.x, y: row.y, hp: Math.max(0, row.hp) });
  }
  return {
    seed: raw.seed >>> 0,
    depth: Math.max(1, Math.min(10, Math.floor(raw.depth))),
    modId: raw.modId as RiftModifierId,
    kills: Math.max(0, Math.floor(raw.kills)),
    bossSpawned: raw.bossSpawned,
    bossDead: raw.bossDead,
    cleared: raw.cleared,
    shiftLayer: raw.shiftLayer as ShiftLayerId,
    shiftEnergy: Math.max(0, raw.shiftEnergy),
    shiftCooldownLeft: Math.max(0, raw.shiftCooldownLeft),
    explored: raw.explored ?? null,
    enemies,
    groundLoot,
    bossChest,
    nodes,
  };
}
