/**
 * Pure Rift Wraith kite + wail logic (no Phaser).
 * Used by Enemy.update for enemy_rift_wraith only.
 */

export const KITE_INNER = 1.9; // tiles
export const KITE_OUTER = 2.9; // tiles
export const WAIL_RANGE = 3.2; // tiles
export const WAIL_RADIUS = 3.0; // tiles
export const WAIL_WINDUP = 0.42; // seconds

export interface Vec2 {
  x: number;
  y: number;
}

export function isWraithEnemy(defId: string): boolean {
  return defId === 'enemy_rift_wraith';
}

/**
 * Kite movement direction as a unit vector.
 * - dist < KITE_INNER: away from player
 * - dist > KITE_OUTER: toward player
 * - otherwise: strafe perpendicular to the player direction; orientation
 *   follows strafeSign (+1 or -1).
 */
export function kiteDirection(
  from: Vec2,
  player: Vec2,
  strafeSign: 1 | -1,
): Vec2 {
  const dx = player.x - from.x;
  const dy = player.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-9) {
    return { x: 1, y: 0 };
  }
  const tx = dx / dist;
  const ty = dy / dist;
  if (dist < KITE_INNER) {
    return { x: -tx, y: -ty };
  }
  if (dist > KITE_OUTER) {
    return { x: tx, y: ty };
  }
  return { x: -ty * strafeSign, y: tx * strafeSign };
}

export function wailHits(from: Vec2, target: Vec2): boolean {
  return Math.hypot(from.x - target.x, from.y - target.y) <= WAIL_RADIUS;
}
