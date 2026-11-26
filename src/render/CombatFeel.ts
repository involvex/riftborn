import { currentGraphicsProfile } from '../core/GraphicsQuality';
import { settingsStore } from '../core/SettingsStore';

/**
 * Toggleable combat juice (hitstop, shake, damage-number styling).
 * Flip `enabled` or individual flags to mute without deleting call sites.
 * Player-facing screen shake scales with SettingsStore.shakeStrength.
 * Mobile Low quality scales durations via GraphicsQuality.juiceScale.
 */

export type CombatHitstopKind = 'light' | 'hit' | 'crit';

export const COMBAT_FEEL = {
  /** Master switch — disables hitstop + extra shake (numbers still respect settings). */
  enabled: true,

  hitstopEnabled: true,
  /** Short freeze on a normal pack connect (ms, wall-clock). */
  hitstopLightMs: 36,
  /** Freeze when taking a hit / multi-cleave. */
  hitstopMs: 58,
  /** Stronger freeze on crit / boss / death. */
  hitstopCritMs: 90,

  shakeEnabled: true,
  shakeHitMs: 70,
  shakeHitIntensity: 0.0032,
  shakeCritMs: 110,
  shakeCritIntensity: 0.0075,
  shakeBossMs: 160,
  shakeBossIntensity: 0.011,
  shakePlayerHitMs: 130,
  shakePlayerHitIntensity: 0.005,

  /**
   * Absolute damage ≥ this reads as a crit for juice (matches burst VFX).
   * Above level-1 basics (~10–13) so only skills / scaled hits punch.
   */
  critDamageThreshold: 18,
  /** Hitting this many foes in one swing upgrades juice to multi-cleave. */
  multiHitJuiceCount: 2,

  /** Sprite-only hurt squash (area ≈ constant). */
  hurtSquashX: 1.12,
  hurtSquashY: 0.86,
  hurtSquashMs: 120,

  /** Min gap between loot camera flashes so packs do not strobe. */
  lootFlashGapMs: 350,

  damageNumbers: {
    enemyColor: '#ffe08a',
    critColor: '#fff6c8',
    playerColor: '#ff6b6b',
    stroke: '#0a0c10',
    strokeThickness: 4,
    fontEnemy: '19px',
    fontCrit: '24px',
    fontPlayer: '17px',
  },
} as const;

export type CombatShakeKind = 'hit' | 'crit' | 'boss' | 'playerHit';

/** Why a camera flash was requested — loot is gap-gated; beats are not. */
export type CameraFlashKind = 'loot' | 'beat';

export function combatShakeParams(
  kind: CombatShakeKind,
  opts?: { shakeStrength?: number; juiceScale?: number },
): {
  ms: number;
  intensity: number;
} {
  const c = COMBAT_FEEL;
  if (!c.enabled || !c.shakeEnabled) return { ms: 0, intensity: 0 };
  const strength = opts?.shakeStrength ?? settingsStore.get().shakeStrength;
  if (strength <= 0) return { ms: 0, intensity: 0 };
  const juice = opts?.juiceScale ?? currentGraphicsProfile().juiceScale;
  let ms: number = c.shakeHitMs;
  let intensity: number = c.shakeHitIntensity;
  switch (kind) {
    case 'crit':
      ms = c.shakeCritMs;
      intensity = c.shakeCritIntensity;
      break;
    case 'boss':
      ms = c.shakeBossMs;
      intensity = c.shakeBossIntensity;
      break;
    case 'playerHit':
      ms = c.shakePlayerHitMs;
      intensity = c.shakePlayerHitIntensity;
      break;
    default:
      break;
  }
  const scaled = shakeParamsScaled(kind, juice, ms, intensity);
  return { ms: scaled.ms, intensity: scaled.intensity * strength };
}

/**
 * Low juice (phone Low / Auto) must not shrink a crit shake under the
 * hitstop floor. Intensity lifts slightly so the punch matches that freeze.
 * Desktop juice 1 keeps the authored duration and intensity.
 */
export const SHAKE_FLOOR_MS: Record<CombatShakeKind, number> = {
  hit: 40,
  crit: 70,
  boss: 90,
  playerHit: 70,
};

/** Extra intensity when juice is cut. Crit and boss only. */
export const LOW_JUICE_CRIT_SHAKE = 1.35;

export function shakeParamsScaled(
  kind: CombatShakeKind,
  juiceScale: number,
  baseMs: number,
  baseIntensity: number,
): { ms: number; intensity: number } {
  const juice = Math.max(0, juiceScale);
  const scaledMs = Math.round(baseMs * juice);
  const ms = juice >= 1 ? scaledMs : Math.max(SHAKE_FLOOR_MS[kind], scaledMs);
  let intensity = baseIntensity * Math.min(1, juice + 0.25);
  if (juice < 1 && (kind === 'crit' || kind === 'boss')) {
    intensity *= LOW_JUICE_CRIT_SHAKE;
  }
  return { ms, intensity };
}

/**
 * Phone Low juice (0.4) must not shrink a connect below a readable freeze.
 * Desktop juice 1 stays on the longer base durations.
 */
export const HITSTOP_FLOOR_MS: Record<CombatHitstopKind, number> = {
  light: 28,
  hit: 45,
  crit: 70,
};

export function hitstopMsScaled(
  kind: CombatHitstopKind,
  juiceScale: number,
): number {
  const c = COMBAT_FEEL;
  const base =
    kind === 'crit'
      ? c.hitstopCritMs
      : kind === 'light'
        ? c.hitstopLightMs
        : c.hitstopMs;
  const scaled = Math.round(base * Math.max(0, juiceScale));
  return Math.max(HITSTOP_FLOOR_MS[kind], scaled);
}

/** Crit connects flash white before the warm tint and pop harder. */
export function critFlashPlan(
  crit: boolean,
  reduceFlashing = false,
): {
  whiteMs: number;
  scale: number;
} {
  if (!crit) return { whiteMs: 0, scale: 1.14 };
  return {
    whiteMs: reduceFlashing ? 0 : 40,
    scale: 1.28,
  };
}

/** Sprite-only hurt squash multipliers + duration. */
export function playerHurtSquashPlan(): {
  scaleX: number;
  scaleY: number;
  ms: number;
} {
  return {
    scaleX: COMBAT_FEEL.hurtSquashX,
    scaleY: COMBAT_FEEL.hurtSquashY,
    ms: COMBAT_FEEL.hurtSquashMs,
  };
}

/**
 * Pure gate for full-screen camera flashes.
 * `reduceFlashing` skips every flash. Loot needs rarity + a gap since last loot flash.
 */
export function shouldPlayCameraFlash(opts: {
  kind: CameraFlashKind;
  reduceFlashing: boolean;
  /** For loot: whether rarity wants a flash. Beats ignore this. */
  rarityAllows?: boolean;
  nowMs: number;
  lastLootFlashAtMs: number;
  gapMs?: number;
}): { play: boolean; nextLootFlashAtMs: number } {
  const gap = opts.gapMs ?? COMBAT_FEEL.lootFlashGapMs;
  if (opts.reduceFlashing) {
    return { play: false, nextLootFlashAtMs: opts.lastLootFlashAtMs };
  }
  if (opts.kind === 'beat') {
    return { play: true, nextLootFlashAtMs: opts.lastLootFlashAtMs };
  }
  if (opts.rarityAllows === false) {
    return { play: false, nextLootFlashAtMs: opts.lastLootFlashAtMs };
  }
  const last = opts.lastLootFlashAtMs;
  if (last > 0 && opts.nowMs - last < gap) {
    return { play: false, nextLootFlashAtMs: last };
  }
  return { play: true, nextLootFlashAtMs: opts.nowMs };
}

export function combatHitstopMs(kind: CombatHitstopKind = 'hit'): number {
  const c = COMBAT_FEEL;
  if (!c.enabled || !c.hitstopEnabled) return 0;
  return hitstopMsScaled(kind, currentGraphicsProfile().juiceScale);
}

export function isCombatCrit(damage: number): boolean {
  return damage >= COMBAT_FEEL.critDamageThreshold;
}

/** Pure: pick hitstop tier for a basic-attack swing that connected. */
export function basicAttackHitstopKind(opts: {
  anyCrit: boolean;
  anyBoss: boolean;
  hitCount: number;
}): CombatHitstopKind {
  if (opts.anyCrit || opts.anyBoss) return 'crit';
  if (opts.hitCount >= COMBAT_FEEL.multiHitJuiceCount) return 'hit';
  return 'light';
}

/** Pure: shake kind for a connecting basic-attack swing. */
export function basicAttackShakeKind(opts: {
  anyCrit: boolean;
  anyBoss: boolean;
  hitCount: number;
}): CombatShakeKind {
  if (opts.anyBoss) return 'boss';
  if (opts.anyCrit || opts.hitCount >= COMBAT_FEEL.multiHitJuiceCount) {
    return 'crit';
  }
  return 'hit';
}
