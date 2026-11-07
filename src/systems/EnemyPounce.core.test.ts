import { describe, expect, test } from 'bun:test';
import {
  POUNCE_COOLDOWN,
  POUNCE_HIT_RADIUS,
  POUNCE_MAX_TRAVEL,
  POUNCE_MIN_RANGE,
  POUNCE_SPEED,
  POUNCE_TRIGGER_RANGE,
  POUNCE_WINDUP,
  advancePounce,
  createPounce,
  isPounceEnemy,
} from './EnemyPounce';

describe('EnemyPounce', () => {
  test('isPounceEnemy is true only for enemy_shadow_wolf', () => {
    expect(isPounceEnemy('enemy_shadow_wolf')).toBe(true);
    for (const id of [
      'shade',
      'crawler',
      'wisp',
      'ash_scamp',
      'ash_bat',
      'rift_lord',
      'ash_scout',
      'enemy_bone_archer',
      'enemy_rift_goblin',
      'enemy_rift_wraith',
    ]) {
      expect(isPounceEnemy(id)).toBe(false);
    }
  });

  test('constants match spec', () => {
    expect(POUNCE_TRIGGER_RANGE).toBe(3.2);
    expect(POUNCE_MIN_RANGE).toBe(1.15);
    expect(POUNCE_SPEED).toBe(9);
    expect(POUNCE_MAX_TRAVEL).toBe(3.6);
    expect(POUNCE_WINDUP).toBe(0.28);
    expect(POUNCE_HIT_RADIUS).toBe(0.45);
    expect(POUNCE_COOLDOWN).toBe(1.4);
  });

  test('createPounce normalizes direction and sets remaining', () => {
    const from = { x: 0, y: 0 };
    const to = { x: 3, y: 4 }; // dist 5
    const p = createPounce(from, to);
    expect(p.vx).toBeCloseTo((3 / 5) * POUNCE_SPEED, 6);
    expect(p.vy).toBeCloseTo((4 / 5) * POUNCE_SPEED, 6);
    // remaining = min(dist + 0.3, POUNCE_MAX_TRAVEL) = min(5.3, 3.6) = 3.6
    expect(p.remaining).toBeCloseTo(POUNCE_MAX_TRAVEL, 6);
  });

  test('createPounce remaining is dist+0.3 when under max travel', () => {
    const from = { x: 0, y: 0 };
    const to = { x: 2, y: 0 }; // dist 2
    const p = createPounce(from, to);
    expect(p.remaining).toBeCloseTo(2.3, 6);
  });

  test('flight moves toward the leap-time target when target stands still', () => {
    const from = { x: 0, y: 0 };
    const target = { worldX: 3, worldY: 0 };
    const p = createPounce(from, { x: target.worldX, y: target.worldY });
    const pos = { worldX: from.x, worldY: from.y };
    const d0 = Math.hypot(
      pos.worldX - target.worldX,
      pos.worldY - target.worldY,
    );
    advancePounce(p, pos, 0.05, target);
    const d1 = Math.hypot(
      pos.worldX - target.worldX,
      pos.worldY - target.worldY,
    );
    expect(d1).toBeLessThan(d0);
  });

  test('no homing: if target moves sideways far away, leap lands without hit', () => {
    const from = { x: 0, y: 0 };
    const leapTarget = { x: 2.5, y: 0 };
    const p = createPounce(from, leapTarget);
    const pos = { worldX: from.x, worldY: from.y };
    // Target dodges far to the side after leap starts
    const dodged = { worldX: 2.5, worldY: 50 };
    let hit = false;
    let landed = false;
    for (let i = 0; i < 200 && !landed; i++) {
      const r = advancePounce(p, pos, 0.02, dodged);
      hit = r.hit;
      landed = r.landed;
    }
    expect(hit).toBe(false);
    expect(landed).toBe(true);
  });

  test('point-blank in first tick can hit', () => {
    const from = { x: 5, y: 5 };
    const target = { worldX: 5.1, worldY: 5 };
    const p = createPounce(from, { x: target.worldX, y: target.worldY });
    const pos = { worldX: from.x, worldY: from.y };
    const r = advancePounce(p, pos, 0.016, target);
    expect(r.hit).toBe(true);
    expect(r.landed).toBe(true);
  });

  test('miss lands after remaining is exhausted', () => {
    const from = { x: 0, y: 0 };
    const to = { x: 2, y: 0 };
    const p = createPounce(from, to);
    const pos = { worldX: from.x, worldY: from.y };
    const farTarget = { worldX: 100, worldY: 100 };
    let hit = false;
    let landed = false;
    for (let i = 0; i < 500 && !landed; i++) {
      const r = advancePounce(p, pos, 0.02, farTarget);
      hit = r.hit;
      landed = r.landed;
    }
    expect(hit).toBe(false);
    expect(landed).toBe(true);
    expect(p.remaining).toBeLessThanOrEqual(0);
  });

  test('advancePounce decreases remaining by POUNCE_SPEED * dt', () => {
    const p = createPounce({ x: 0, y: 0 }, { x: 3, y: 0 });
    const startRemaining = p.remaining;
    const pos = { worldX: 0, worldY: 0 };
    advancePounce(p, pos, 0.1, { worldX: 100, worldY: 100 });
    expect(p.remaining).toBeCloseTo(startRemaining - POUNCE_SPEED * 0.1, 6);
  });
});
