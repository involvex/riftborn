/**
 * Pure Rift Goblin rush (sprint) logic (no Phaser).
 * Used by Enemy.update for enemy_rift_goblin only.
 */

export const RUSH_SPEED_MULT = 2.15;
export const RUSH_DURATION = 0.9; // seconds
export const RUSH_COOLDOWN = 2.4; // seconds
export const RUSH_MIN_RANGE = 1.2; // tiles
export const RUSH_TRIGGER_RANGE = 4.8; // tiles
/** Pause before the sprint so the windup ring is readable. */
export const RUSH_WINDUP = 0.28;

export function isRushEnemy(defId: string): boolean {
  // Grove boss digs in and charges as its signature tell.
  return defId === 'enemy_rift_goblin' || defId === 'grove_alpha';
}

export function rushSpeed(baseSpeed: number): number {
  return baseSpeed * RUSH_SPEED_MULT;
}

export function shouldStartRush(dist: number): boolean {
  return dist >= RUSH_MIN_RANGE && dist <= RUSH_TRIGGER_RANGE;
}
