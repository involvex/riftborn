/**
 * Pure Shadow Wolf pounce (leap attack) logic (no Phaser).
 * Used by Enemy.update for enemy_shadow_wolf only.
 */

export const POUNCE_TRIGGER_RANGE = 3.2; // tiles
export const POUNCE_MIN_RANGE = 1.15; // tiles (just above melee 1.0)
export const POUNCE_SPEED = 9; // tiles/sec (fixed, ignores slow)
export const POUNCE_MAX_TRAVEL = 3.6; // tiles
export const POUNCE_WINDUP = 0.28; // seconds
export const POUNCE_HIT_RADIUS = 0.45; // tiles
export const POUNCE_COOLDOWN = 1.4; // seconds

export interface PounceState {
  vx: number;
  vy: number;
  remaining: number;
}

export interface AdvancePounceResult {
  hit: boolean;
  landed: boolean;
}

export function isPounceEnemy(defId: string): boolean {
  return defId === 'enemy_shadow_wolf';
}

export function createPounce(
  from: { x: number; y: number },
  to: { x: number; y: number },
): PounceState {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;
  return {
    vx: nx * POUNCE_SPEED,
    vy: ny * POUNCE_SPEED,
    remaining: Math.min(dist + 0.3, POUNCE_MAX_TRAVEL),
  };
}

/**
 * Advance one pounce tick by dt seconds. Mutates pos (worldX/worldY) and
 * pounce.remaining. The leap direction is fixed at createPounce time (no
 * homing). Returns {hit, landed}; landed is true when the leap ends (hit or
 * travel exhausted) and the caller should stop the pounce.
 */
export function advancePounce(
  pounce: PounceState,
  pos: { worldX: number; worldY: number },
  dt: number,
  target: { worldX: number; worldY: number },
): AdvancePounceResult {
  pos.worldX += pounce.vx * dt;
  pos.worldY += pounce.vy * dt;
  pounce.remaining -= POUNCE_SPEED * dt;

  const d = Math.hypot(pos.worldX - target.worldX, pos.worldY - target.worldY);
  if (d <= POUNCE_HIT_RADIUS) {
    return { hit: true, landed: true };
  }
  if (pounce.remaining <= 0) {
    return { hit: false, landed: true };
  }
  return { hit: false, landed: false };
}
