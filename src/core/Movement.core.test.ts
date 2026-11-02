import { describe, expect, test } from 'bun:test';
import { isWalkableOnLayer } from '../world/ShiftGateMap';
import { FIGURE_COLLISION_RADIUS, footprintFits } from './FigureScale';
import { slideMove, slideMoveAxisOnly } from './Movement';

/** 2×2-brush stair-step corridor (M1e geometry), no gates. */
function makeStairCells(): number[][] {
  const cells = Array.from({ length: 14 }, () =>
    Array.from({ length: 14 }, () => 0),
  );
  for (const [x, y] of [
    [2, 2],
    [2, 3],
    [2, 4],
    [3, 4],
    [3, 5],
    [3, 6],
    [4, 6],
    [4, 7],
    [4, 8],
  ] as const) {
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) cells[y + dy]![x + dx] = 1;
    }
  }
  return cells;
}

function stairWalk() {
  const cells = makeStairCells();
  const gates = Array.from({ length: 14 }, () =>
    Array.from({ length: 14 }, () => null),
  );
  return (x: number, y: number) =>
    footprintFits(
      (a, b) => isWalkableOnLayer(cells as never, gates, a, b, 'ash'),
      x,
      y,
      FIGURE_COLLISION_RADIUS,
    );
}

/** Find a standable corner where both axis steps for (dx,dy) fail. */
function findCornerTrap(
  walk: (x: number, y: number) => boolean,
  dirX: number,
  dirY: number,
): { x: number; y: number } | null {
  const step = 0.1;
  for (let x = 2.3; x <= 5.7; x += 0.05) {
    for (let y = 2.3; y <= 9.7; y += 0.05) {
      if (!walk(x, y)) continue;
      const ax = slideMoveAxisOnly(walk, x, y, dirX * step, dirY * step);
      if (!ax.moved) return { x: +x.toFixed(3), y: +y.toFixed(3) };
    }
  }
  return null;
}

describe('M1f hypothesis: stair corner stick', () => {
  test('(b) axis-only slide stays stuck >0.5s at outer stair corner', () => {
    const walk = stairWalk();
    const trap = findCornerTrap(walk, -1, -1);
    expect(trap).not.toBeNull();
    let x = trap!.x;
    let y = trap!.y;
    const speed = 4.2;
    const dt = 1 / 30;
    let stuck = 0;
    let maxStuck = 0;
    for (let i = 0; i < 60; i++) {
      const len = Math.SQRT2;
      const r = slideMoveAxisOnly(
        walk,
        x,
        y,
        (-1 / len) * speed * dt,
        (-1 / len) * speed * dt,
      );
      x = r.x;
      y = r.y;
      if (!r.moved) {
        stuck += dt;
        maxStuck = Math.max(maxStuck, stuck);
      } else stuck = 0;
    }
    expect(maxStuck).toBeGreaterThan(0.5);
  });

  test('(b) corner-nudge slide escapes the same trap within 0.5s', () => {
    const walk = stairWalk();
    const trap = findCornerTrap(walk, -1, -1);
    expect(trap).not.toBeNull();
    let x = trap!.x;
    let y = trap!.y;
    const speed = 4.2;
    const dt = 1 / 30;
    let stuck = 0;
    let maxStuck = 0;
    let escaped = false;
    for (let i = 0; i < 60; i++) {
      const len = Math.SQRT2;
      const r = slideMove(
        walk,
        x,
        y,
        (-1 / len) * speed * dt,
        (-1 / len) * speed * dt,
      );
      x = r.x;
      y = r.y;
      if (!r.moved) {
        stuck += dt;
        maxStuck = Math.max(maxStuck, stuck);
      } else {
        stuck = 0;
        escaped = true;
      }
    }
    expect(escaped).toBe(true);
    expect(maxStuck).toBeLessThanOrEqual(0.5);
  });

  test('(a) gated tile blocks wrong layer but not matching layer', () => {
    const cells = [
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 0],
    ];
    const gates = [
      [null, null, null],
      [null, 'shadow', null],
      [null, null, null],
    ];
    expect(isWalkableOnLayer(cells as never, gates, 1.5, 1.5, 'ash')).toBe(
      false,
    );
    expect(isWalkableOnLayer(cells as never, gates, 1.5, 1.5, 'shadow')).toBe(
      true,
    );
  });

  test('(c) footprint radius matches FIGURE_COLLISION_RADIUS (0.32)', () => {
    expect(FIGURE_COLLISION_RADIUS).toBe(0.32);
  });
});
