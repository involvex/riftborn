/**
 * Pure combat-weight helpers (dash i-frames, swing slow, stick+attack blend).
 * WorldScene / Player / Enemy call these; unit tests pin the numbers.
 */

/** Dash invulnerability after a successful blink. */
export const DASH_INVULN_SEC = 0.3;

/**
 * Short travel i-frames on class movement skills (War Leap / Rift Slash /
 * Rift Step). Shorter than Space dash; Meteor's 0.2 dash is excluded via
 * {@link skillMoveInvulnSec}.
 */
export const SKILL_MOVE_INVULN_SEC = 0.18;

/** Min dash tiles before a leap / blink / dash_strike grants travel i-frames. */
export const SKILL_MOVE_INVULN_MIN_DASH = 1;

/**
 * Travel i-frame duration for a skill dash, or 0 when the dash is too short
 * (Meteor) or missing.
 */
export function skillMoveInvulnSec(dash: number | undefined): number {
  return (dash ?? 0) >= SKILL_MOVE_INVULN_MIN_DASH ? SKILL_MOVE_INVULN_SEC : 0;
}

/** Move-speed multiplier while a basic swing commits. */
export const SWING_SLOW_MULT = 0.45;

/** How long the basic-swing slow lasts. */
export const SWING_SLOW_SEC = 0.12;

/** Basic melee windup before contact damage. */
export const MELEE_WINDUP_SEC = 0.3;

/** Goblin/rush pause before the sprint. */
export const RUSH_WINDUP_SEC = 0.28;

/** Stick share when blending toward an assist target while ATK is held. */
export const ASSIST_STICK_BLEND = 0.35;

export function isDashInvulnerable(invulnRemaining: number): boolean {
  return invulnRemaining > 0;
}

export function tickTimer(remaining: number, dt: number): number {
  return Math.max(0, remaining - dt);
}

/**
 * Blend stick direction with chase-to-target while hold-attacking.
 * Stick length is preserved so analog speed still works.
 */
export function blendStickWithAssist(
  stickX: number,
  stickY: number,
  targetX: number,
  targetY: number,
  playerX: number,
  playerY: number,
  stickShare = ASSIST_STICK_BLEND,
): { x: number; y: number } {
  const stickLen = Math.hypot(stickX, stickY);
  const share = Math.min(1, Math.max(0, stickShare));
  let sx = 0;
  let sy = 0;
  if (stickLen > 1e-6) {
    sx = stickX / stickLen;
    sy = stickY / stickLen;
  }
  const tdx = targetX - playerX;
  const tdy = targetY - playerY;
  const tLen = Math.hypot(tdx, tdy);
  let tx = 1;
  let ty = 0;
  if (tLen > 1e-6) {
    tx = tdx / tLen;
    ty = tdy / tLen;
  }
  const bx = sx * share + tx * (1 - share);
  const by = sy * share + ty * (1 - share);
  const bLen = Math.hypot(bx, by);
  if (bLen < 1e-6) {
    return { x: tx, y: ty };
  }
  const outLen = stickLen > 1e-6 ? Math.min(1, stickLen) : 1;
  return { x: (bx / bLen) * outLen, y: (by / bLen) * outLen };
}

/** Move multiplier while swing-slow is active. */
export function swingMoveMult(slowRemaining: number): number {
  return slowRemaining > 0 ? SWING_SLOW_MULT : 1;
}
