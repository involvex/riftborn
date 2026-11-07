/**
 * Pure ranged-enemy shot logic (no Phaser). Used by Enemy.update and WorldScene.
 */

export const RANGED_SHOT_SPEED = 7; // tiles/sec
export const RANGED_SHOT_HIT_RADIUS = 0.35; // tiles
export const RANGED_SHOT_MAX_TRAVEL = 3.2; // tiles
export const RANGED_SHOT_SPAWN_OFFSET = 0.25; // tiles

export interface EnemyShot {
  worldX: number;
  worldY: number;
  vx: number;
  vy: number;
  damage: number;
  traveled: number;
}

export interface AdvanceEnemyShotResult {
  hit: boolean;
  expired: boolean;
}

export function isRangedEnemy(defId: string): boolean {
  return defId === 'enemy_bone_archer';
}

export function createEnemyShot(
  from: { x: number; y: number },
  to: { x: number; y: number },
  damage: number,
): EnemyShot {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dx / len;
  const ny = dy / len;
  return {
    worldX: from.x + nx * RANGED_SHOT_SPAWN_OFFSET,
    worldY: from.y + ny * RANGED_SHOT_SPAWN_OFFSET,
    vx: nx * RANGED_SHOT_SPEED,
    vy: ny * RANGED_SHOT_SPEED,
    damage,
    traveled: 0,
  };
}

/**
 * Advance one shot by dt seconds. Checks hit against target position first tick
 * semantics included (point-blank allowed). Returns {hit, expired}.
 * On hit, the shot should not continue flying (caller removes it).
 */
export function advanceEnemyShot(
  shot: EnemyShot,
  dt: number,
  target: { worldX: number; worldY: number },
): AdvanceEnemyShotResult {
  shot.worldX += shot.vx * dt;
  shot.worldY += shot.vy * dt;
  shot.traveled += RANGED_SHOT_SPEED * dt;

  const d = Math.hypot(
    shot.worldX - target.worldX,
    shot.worldY - target.worldY,
  );
  if (d <= RANGED_SHOT_HIT_RADIUS) {
    return { hit: true, expired: false };
  }
  if (shot.traveled >= RANGED_SHOT_MAX_TRAVEL) {
    return { hit: false, expired: true };
  }
  return { hit: false, expired: false };
}
