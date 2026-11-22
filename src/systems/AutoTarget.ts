/**
 * Pure auto-target helpers for attacks and skills (no Phaser).
 */

export const ASSIST_RANGE = 8;

export type Targetable = { x: number; y: number; alive: boolean };

/** Index of nearest alive target within maxRange, or -1. */
export function pickNearestEnemyIndex(
  enemies: readonly Targetable[],
  playerX: number,
  playerY: number,
  maxRange: number,
): number {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i]!;
    if (!e.alive) continue;
    const d = Math.hypot(e.x - playerX, e.y - playerY);
    if (d <= maxRange && d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/**
 * Prefer foes in the stick / facing direction. Score =
 * distance − facingBias * max(0, dot) * maxRange.
 * Falls back to nearest when aimX/aimY are ~0.
 */
export function pickFacingEnemyIndex(
  enemies: readonly Targetable[],
  playerX: number,
  playerY: number,
  maxRange: number,
  aimX: number,
  aimY: number,
  facingBias = 0.55,
): number {
  const aimLen = Math.hypot(aimX, aimY);
  if (aimLen < 0.08) {
    return pickNearestEnemyIndex(enemies, playerX, playerY, maxRange);
  }
  const ax = aimX / aimLen;
  const ay = aimY / aimLen;
  let best = -1;
  let bestScore = Infinity;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i]!;
    if (!e.alive) continue;
    const dx = e.x - playerX;
    const dy = e.y - playerY;
    const d = Math.hypot(dx, dy);
    if (d > maxRange) continue;
    const dirLen = d > 1e-6 ? d : 1;
    const dot = (dx / dirLen) * ax + (dy / dirLen) * ay;
    const score = d - facingBias * Math.max(0, dot) * maxRange;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

/** Indices of alive targets within radius of (cx,cy), sorted by distance, capped. */
export function pickEnemiesAround(
  enemies: readonly Targetable[],
  cx: number,
  cy: number,
  radius: number,
  cap: number,
): number[] {
  const hits: { i: number; d: number }[] = [];
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i]!;
    if (!e.alive) continue;
    const d = Math.hypot(e.x - cx, e.y - cy);
    if (d <= radius) hits.push({ i, d });
  }
  hits.sort((a, b) => a.d - b.d);
  const limit = Math.max(0, cap);
  const out: number[] = [];
  for (let j = 0; j < hits.length && j < limit; j++) {
    out.push(hits[j]!.i);
  }
  return out;
}

/**
 * Forward cone from the player: alive foes within radius whose direction
 * from the caster has dot ≥ minDot with the aim vector. Sorted by distance.
 * minDot 0 ≈ half-plane; 0.15 ≈ ~80° half-angle wedge.
 */
export function pickEnemiesInForwardArc(
  enemies: readonly Targetable[],
  playerX: number,
  playerY: number,
  radius: number,
  dirX: number,
  dirY: number,
  minDot: number,
  cap: number,
): number[] {
  const dirLen = Math.hypot(dirX, dirY);
  const ax = dirLen > 1e-6 ? dirX / dirLen : 1;
  const ay = dirLen > 1e-6 ? dirY / dirLen : 0;
  const hits: { i: number; d: number }[] = [];
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i]!;
    if (!e.alive) continue;
    const dx = e.x - playerX;
    const dy = e.y - playerY;
    const d = Math.hypot(dx, dy);
    if (d > radius) continue;
    if (d < 1e-6) {
      hits.push({ i, d: 0 });
      continue;
    }
    const dot = (dx / d) * ax + (dy / d) * ay;
    if (dot < minDot) continue;
    hits.push({ i, d });
  }
  hits.sort((a, b) => a.d - b.d);
  const limit = Math.max(0, cap);
  const out: number[] = [];
  for (let j = 0; j < hits.length && j < limit; j++) {
    out.push(hits[j]!.i);
  }
  return out;
}

/** Default minDot for Cleaving Strike forward arc (~80° half-angle). */
export const CLEAVE_ARC_MIN_DOT = 0.15;

/** True when target is outside weapon range but within assist range. */
export function shouldApproach(dist: number, weaponRange: number): boolean {
  return dist > weaponRange && dist <= ASSIST_RANGE;
}

/** Unit vector from -> to; fallback {x:1,y:0} at ~0 distance. */
export function directionTo(
  from: { x: number; y: number },
  to: { x: number; y: number },
): { x: number; y: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { x: 1, y: 0 };
  return { x: dx / len, y: dy / len };
}
