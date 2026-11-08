import { describe, expect, test } from 'bun:test';
import {
  KITE_INNER,
  KITE_OUTER,
  WAIL_RANGE,
  WAIL_RADIUS,
  WAIL_WINDUP,
  isWraithEnemy,
  kiteDirection,
  wailHits,
} from './EnemyWraith';

describe('EnemyWraith', () => {
  test('constants match spec', () => {
    expect(KITE_INNER).toBe(1.9);
    expect(KITE_OUTER).toBe(2.9);
    expect(WAIL_RANGE).toBe(3.2);
    expect(WAIL_RADIUS).toBe(3.0);
    expect(WAIL_WINDUP).toBe(0.42);
  });

  test('isWraithEnemy is true only for enemy_rift_wraith', () => {
    expect(isWraithEnemy('enemy_rift_wraith')).toBe(true);
    for (const id of [
      'shade',
      'crawler',
      'wisp',
      'ash_scamp',
      'ash_scout',
      'ash_bat',
      'rift_lord',
      'enemy_bone_archer',
      'enemy_shadow_wolf',
      'enemy_rift_goblin',
    ]) {
      expect(isWraithEnemy(id)).toBe(false);
    }
  });

  test('kiteDirection: dist < KITE_INNER moves away from player', () => {
    const from = { x: 1.0, y: 0 };
    const player = { x: 0, y: 0 };
    const dir = kiteDirection(from, player, 1);
    // away from player (at origin) means toward +x
    expect(dir.x).toBeCloseTo(1, 6);
    expect(dir.y).toBeCloseTo(0, 6);
  });

  test('kiteDirection: dist > KITE_OUTER moves toward player', () => {
    const from = { x: 5.0, y: 0 };
    const player = { x: 0, y: 0 };
    const dir = kiteDirection(from, player, 1);
    expect(dir.x).toBeCloseTo(-1, 6);
    expect(dir.y).toBeCloseTo(0, 6);
  });

  test('kiteDirection: band strafes perpendicular, orientation follows strafeSign', () => {
    const from = { x: 2.4, y: 0 }; // between INNER and OUTER
    const player = { x: 0, y: 0 };
    const toPlayer = { x: -1, y: 0 }; // direction from wraith to player
    const dir1 = kiteDirection(from, player, 1);
    const dirM1 = kiteDirection(from, player, -1);
    const len1 = Math.hypot(dir1.x, dir1.y);
    const lenM1 = Math.hypot(dirM1.x, dirM1.y);
    expect(len1).toBeCloseTo(1, 6);
    expect(lenM1).toBeCloseTo(1, 6);
    // perpendicular to direction toward player
    const dot1 = dir1.x * toPlayer.x + dir1.y * toPlayer.y;
    const dotM1 = dirM1.x * toPlayer.x + dirM1.y * toPlayer.y;
    expect(Math.abs(dot1)).toBeLessThan(1e-6);
    expect(Math.abs(dotM1)).toBeLessThan(1e-6);
    // opposite sides
    expect(dir1.y * dirM1.y).toBeLessThan(0);
  });

  test('too-close wraith does not get closer after one kite tick', () => {
    const player = { x: 0, y: 0 };
    const from = { x: 1.2, y: 0 }; // < KITE_INNER
    const dist0 = Math.hypot(from.x - player.x, from.y - player.y);
    const dir = kiteDirection(from, player, 1);
    const speed = 2.4;
    const dt = 0.1;
    const moved = {
      x: from.x + dir.x * speed * dt,
      y: from.y + dir.y * speed * dt,
    };
    const dist1 = Math.hypot(moved.x - player.x, moved.y - player.y);
    expect(dist1).toBeGreaterThanOrEqual(dist0 - 1e-9);
  });

  test('wailHits is true only when distance <= WAIL_RADIUS', () => {
    expect(wailHits({ x: 0, y: 0 }, { x: 3.0, y: 0 })).toBe(true);
    expect(wailHits({ x: 0, y: 0 }, { x: 2.0, y: 1.0 })).toBe(true);
    expect(wailHits({ x: 0, y: 0 }, { x: 3.01, y: 0 })).toBe(false);
    expect(wailHits({ x: 0, y: 0 }, { x: 5, y: 0 })).toBe(false);
  });
});
