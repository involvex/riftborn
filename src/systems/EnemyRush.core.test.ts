import { describe, expect, test } from 'bun:test';
import {
  RUSH_COOLDOWN,
  RUSH_DURATION,
  RUSH_MIN_RANGE,
  RUSH_SPEED_MULT,
  RUSH_TRIGGER_RANGE,
  isRushEnemy,
  rushSpeed,
  shouldStartRush,
} from './EnemyRush';

describe('EnemyRush', () => {
  test('isRushEnemy is true only for enemy_rift_goblin', () => {
    expect(isRushEnemy('enemy_rift_goblin')).toBe(true);
    for (const id of [
      'shade',
      'crawler',
      'wisp',
      'ash_scamp',
      'ash_bat',
      'rift_lord',
      'enemy_bone_archer',
      'enemy_shadow_wolf',
      'enemy_rift_wraith',
    ]) {
      expect(isRushEnemy(id)).toBe(false);
    }
  });

  test('constants match spec', () => {
    expect(RUSH_SPEED_MULT).toBe(2.15);
    expect(RUSH_DURATION).toBe(0.9);
    expect(RUSH_COOLDOWN).toBe(2.4);
    expect(RUSH_MIN_RANGE).toBe(1.2);
    expect(RUSH_TRIGGER_RANGE).toBe(4.8);
  });

  test('rushSpeed applies multiplier to base speed', () => {
    expect(rushSpeed(2.0)).toBe(4.3);
    expect(rushSpeed(2.0)).toBe(2.0 * RUSH_SPEED_MULT);
  });

  test('shouldStartRush is true within trigger window', () => {
    expect(shouldStartRush(1.2)).toBe(true);
    expect(shouldStartRush(2.0)).toBe(true);
    expect(shouldStartRush(4.8)).toBe(true);
  });

  test('shouldStartRush is false outside trigger window', () => {
    expect(shouldStartRush(0.9)).toBe(false);
    expect(shouldStartRush(1.19)).toBe(false);
    expect(shouldStartRush(4.81)).toBe(false);
    expect(shouldStartRush(6)).toBe(false);
  });
});
