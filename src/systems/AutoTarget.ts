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
