import { describe, expect, test } from 'bun:test';
import {
  ASSIST_RANGE,
  directionTo,
  pickEnemiesAround,
  pickNearestEnemyIndex,
  shouldApproach,
} from './AutoTarget';

describe('AutoTarget', () => {
  test('ASSIST_RANGE is 8', () => {
    expect(ASSIST_RANGE).toBe(8);
  });

  test('pickNearestEnemyIndex returns nearest of several', () => {
    const enemies = [
      { x: 5, y: 0, alive: true },
      { x: 2, y: 0, alive: true },
      { x: 7, y: 0, alive: true },
    ];
    expect(pickNearestEnemyIndex(enemies, 0, 0, 10)).toBe(1);
  });

  test('pickNearestEnemyIndex ignores dead (alive false)', () => {
    const enemies = [
      { x: 1, y: 0, alive: false },
      { x: 3, y: 0, alive: true },
    ];
    expect(pickNearestEnemyIndex(enemies, 0, 0, 10)).toBe(1);
  });

  test('pickNearestEnemyIndex returns -1 when none in range', () => {
    const enemies = [{ x: 20, y: 0, alive: true }];
    expect(pickNearestEnemyIndex(enemies, 0, 0, 8)).toBe(-1);
  });

  test('pickNearestEnemyIndex returns -1 for empty list', () => {
    expect(pickNearestEnemyIndex([], 0, 0, 8)).toBe(-1);
  });

  test('pickEnemiesAround sorts by ascending distance and caps', () => {
    const enemies = [
      { x: 3, y: 0, alive: true },
      { x: 1, y: 0, alive: true },
      { x: 2, y: 0, alive: true },
      { x: 1.5, y: 0, alive: true },
    ];
    const result = pickEnemiesAround(enemies, 0, 0, 5, 2);
    expect(result).toEqual([1, 3]);
  });

  test('pickEnemiesAround only includes alive within radius', () => {
    const enemies = [
      { x: 1, y: 0, alive: true },
      { x: 1.2, y: 0, alive: false },
      { x: 9, y: 0, alive: true },
    ];
    expect(pickEnemiesAround(enemies, 0, 0, 2, 6)).toEqual([0]);
  });

  test('pickEnemiesAround returns empty when none match', () => {
    expect(
      pickEnemiesAround([{ x: 5, y: 0, alive: true }], 0, 0, 1, 6),
    ).toEqual([]);
  });

  test('shouldApproach boundaries with weaponRange 1.0', () => {
    expect(shouldApproach(1.0, 1.0)).toBe(false);
    expect(shouldApproach(1.01, 1.0)).toBe(true);
    expect(shouldApproach(8, 1.0)).toBe(true);
    expect(shouldApproach(8.01, 1.0)).toBe(false);
  });

  test('shouldApproach false when in range', () => {
    expect(shouldApproach(0.5, 1.0)).toBe(false);
  });

  test('directionTo normalizes and points to target', () => {
    const d = directionTo({ x: 0, y: 0 }, { x: 3, y: 4 });
    expect(d.x).toBeCloseTo(0.6, 5);
    expect(d.y).toBeCloseTo(0.8, 5);
    expect(Math.hypot(d.x, d.y)).toBeCloseTo(1, 5);
  });

  test('directionTo fallback at ~0 distance', () => {
    const d = directionTo({ x: 5, y: 5 }, { x: 5, y: 5 });
    expect(d).toEqual({ x: 1, y: 0 });
  });

  test('directionTo fallback for near-zero distance', () => {
    const d = directionTo({ x: 0, y: 0 }, { x: 1e-9, y: 0 });
    expect(d).toEqual({ x: 1, y: 0 });
  });
});
