import { describe, expect, test } from 'bun:test';
import {
  RANGED_SHOT_HIT_RADIUS,
  RANGED_SHOT_MAX_TRAVEL,
  RANGED_SHOT_SPEED,
  advanceEnemyShot,
  createEnemyShot,
  isRangedEnemy,
} from './EnemyRanged';

describe('EnemyRanged', () => {
  test('isRangedEnemy is true only for enemy_bone_archer', () => {
    expect(isRangedEnemy('enemy_bone_archer')).toBe(true);
    for (const id of [
      'shade',
      'crawler',
      'wisp',
      'ash_scamp',
      'ash_scout',
      'ash_bat',
      'rift_lord',
      'enemy_rift_goblin',
      'enemy_shadow_wolf',
      'enemy_rift_wraith',
    ]) {
      expect(isRangedEnemy(id)).toBe(false);
    }
  });

  test('createEnemyShot normalizes velocity to speed 7 and applies spawn offset', () => {
    const from = { x: 10, y: 5 };
    const to = { x: 13, y: 9 }; // dx=3,dy=4,len=5
    const shot = createEnemyShot(from, to, 42);
    expect(shot.damage).toBe(42);
    expect(shot.traveled).toBe(0);
    expect(shot.vx).toBeCloseTo((3 / 5) * RANGED_SHOT_SPEED, 6);
    expect(shot.vy).toBeCloseTo((4 / 5) * RANGED_SHOT_SPEED, 6);
    expect(shot.worldX).toBeCloseTo(10 + (3 / 5) * 0.25, 6);
    expect(shot.worldY).toBeCloseTo(5 + (4 / 5) * 0.25, 6);
  });

  test('flight direction moves toward a still target outside start radius', () => {
    const from = { x: 0, y: 0 };
    const target = { worldX: 5, worldY: 0 };
    const shot = createEnemyShot(from, { x: target.worldX, y: 0 }, 10);
    const d0 = Math.hypot(
      shot.worldX - target.worldX,
      shot.worldY - target.worldY,
    );
    advanceEnemyShot(shot, 0.1, target);
    const d1 = Math.hypot(
      shot.worldX - target.worldX,
      shot.worldY - target.worldY,
    );
    expect(d1).toBeLessThan(d0);
  });

  test('point-blank can hit on first tick', () => {
    const from = { x: 5, y: 5 };
    const target = { worldX: 5.1, worldY: 5 };
    const shot = createEnemyShot(
      from,
      { x: target.worldX, y: target.worldY },
      7,
    );
    const res = advanceEnemyShot(shot, 0.016, target);
    expect(res.hit).toBe(true);
    expect(res.expired).toBe(false);
  });

  test('miss expires after max travel and never hits', () => {
    const from = { x: 0, y: 0 };
    const to = { x: 10, y: 0 };
    const shot = createEnemyShot(from, to, 3);
    const farTarget = { worldX: 100, worldY: 100 };
    let hit = false;
    let expired = false;
    for (let i = 0; i < 200 && !expired && !hit; i++) {
      const r = advanceEnemyShot(shot, 0.05, farTarget);
      hit = r.hit;
      expired = r.expired;
    }
    expect(hit).toBe(false);
    expect(expired).toBe(true);
    expect(shot.traveled).toBeGreaterThanOrEqual(RANGED_SHOT_MAX_TRAVEL);
  });

  test('hit radius and max travel constants match spec', () => {
    expect(RANGED_SHOT_SPEED).toBe(7);
    expect(RANGED_SHOT_HIT_RADIUS).toBe(0.35);
    expect(RANGED_SHOT_MAX_TRAVEL).toBe(3.2);
  });
});
