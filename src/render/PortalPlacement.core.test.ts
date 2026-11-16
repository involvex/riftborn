import { describe, expect, test } from 'bun:test';
import { pickExitPortalPoint } from './PortalPlacement';

describe('pickExitPortalPoint', () => {
  test('uses preferred when that tile is walkable', () => {
    const p = pickExitPortalPoint({
      preferred: { x: 12.5, y: 10.5 },
      fallback: { x: 1.5, y: 1.5 },
      isWalkable: (tx, ty) => tx === 12 && ty === 10,
    });
    expect(p).toEqual({ x: 12.5, y: 10.5 });
  });

  test('rings out from preferred before falling back', () => {
    const blocked = new Set(['12,10']);
    const p = pickExitPortalPoint({
      preferred: { x: 12.5, y: 10.5 },
      fallback: { x: 1.5, y: 1.5 },
      isWalkable: (tx, ty) => !blocked.has(`${tx},${ty}`),
      maxRadius: 2,
    });
    // First ring neighbor of (12,10) — not the distant fallback.
    expect(Math.hypot(p.x - 12.5, p.y - 10.5)).toBeLessThan(2);
    expect(p.x).not.toBe(1.5);
  });

  test('falls back when preferred area is blocked', () => {
    const p = pickExitPortalPoint({
      preferred: { x: 12.5, y: 10.5 },
      fallback: { x: 3.2, y: 4.8 },
      isWalkable: (tx, ty) => tx === 3 && ty === 4,
      maxRadius: 1,
    });
    expect(p).toEqual({ x: 3.5, y: 4.5 });
  });

  test('snaps fallback when nothing is walkable', () => {
    const p = pickExitPortalPoint({
      preferred: null,
      fallback: { x: 7.2, y: 9.8 },
      isWalkable: () => false,
    });
    expect(p).toEqual({ x: 7.5, y: 9.5 });
  });
});
