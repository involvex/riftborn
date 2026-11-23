import { currentGraphicsProfile } from '../core/GraphicsQuality';
import { settingsStore } from '../core/SettingsStore';

/**
 * Toggleable combat juice (hitstop, shake, damage-number styling).
 * Flip `enabled` or individual flags to mute without deleting call sites.
 * Player-facing screen shake also respects SettingsStore.screenShake.
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

export function combatShakeParams(kind: CombatShakeKind): {
  ms: number;
  intensity: number;
} {
  const c = COMBAT_FEEL;
  if (!c.enabled || !c.shakeEnabled) return { ms: 0, intensity: 0 };
  if (!settingsStore.get().screenShake) return { ms: 0, intensity: 0 };
  const juice = currentGraphicsProfile().juiceScale;
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
  return {
    ms: Math.round(ms * juice),
    intensity: intensity * Math.min(1, juice + 0.25),
  };
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
export function critFlashPlan(crit: boolean): {
  whiteMs: number;
  scale: number;
} {
  if (crit) return { whiteMs: 40, scale: 1.28 };
  return { whiteMs: 0, scale: 1.14 };
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
