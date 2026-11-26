import { describe, expect, test } from 'bun:test';
import { enemyClampToWalk, enemyTryMove } from './EnemyWalk';

describe('enemyTryMove', () => {
  test('without walkAt only clamps to the box', () => {
    const p = enemyTryMove(null, 1, 1, 10, 10, 5);
    expect(p).toEqual({ x: 5, y: 5 });
  });

  test('rejects a step onto void when walkAt is set', () => {
    const floor = new Set(['2,2', '2,3', '3,2', '3,3']);
    const walkAt = (x: number, y: number) =>
      floor.has(`${Math.floor(x)},${Math.floor(y)}`);
    const start = { x: 2.5, y: 2.5 };
    const intoVoid = enemyTryMove(walkAt, start.x, start.y, 3, 0, 20);
    expect(walkAt(intoVoid.x, intoVoid.y)).toBe(true);
    expect(intoVoid.x).toBeLessThan(4);
  });
});

describe('enemyClampToWalk', () => {
  test('reverts a pounce landing in the black', () => {
    const walkAt = (x: number, y: number) =>
      Math.floor(x) === 2 && Math.floor(y) === 2;
    const landed = enemyClampToWalk(walkAt, 2.4, 2.4, 8.2, 1.1, 20);
    expect(landed.blocked).toBe(true);
    expect(landed.x).toBeCloseTo(2.4);
    expect(landed.y).toBeCloseTo(2.4);
  });
});
