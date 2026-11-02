import { describe, expect, test } from 'bun:test';
import { findDiagonalCorridorCell, generateDungeon } from '../world/DungeonGen';
import { isWalkableOnLayer } from '../world/ShiftGateMap';
import { FIGURE_COLLISION_RADIUS, footprintFits } from './FigureScale';
import { slideMove, slideMoveAxisOnly } from './Movement';
import { simulateRiftWalks } from './RiftWalkSim';

/** Hold diagonal input along a stair sample; return max stuck seconds. */
function maxStuckOnDiagonal(
  map: ReturnType<typeof generateDungeon>,
  nudge: boolean,
): number {
  const cell = findDiagonalCorridorCell(map);
  if (!cell) return 0;
  const gates = map.layerGates;
  const walk = (x: number, y: number) =>
    footprintFits(
      (a, b) => isWalkableOnLayer(map.cells, gates, a, b, 'ash'),
      x,
      y,
      FIGURE_COLLISION_RADIUS,
    ) ||
    footprintFits(
      (a, b) => isWalkableOnLayer(map.cells, gates, a, b, 'shadow'),
      x,
      y,
      FIGURE_COLLISION_RADIUS,
    );
  // Prefer ash if both work at start
  const walkAsh = (x: number, y: number) =>
    footprintFits(
      (a, b) => isWalkableOnLayer(map.cells, gates, a, b, 'ash'),
      x,
      y,
      FIGURE_COLLISION_RADIUS,
    );
  const start = { x: cell.x + 0.5, y: cell.y + 0.5 };
  if (!walk(start.x, start.y)) return 0;
  const layerWalk = walkAsh(start.x, start.y) ? walkAsh : walk;
  let x = start.x;
  let y = start.y;
  const slide = nudge ? slideMove : slideMoveAxisOnly;
  const speed = 4.2;
  const dt = 1 / 30;
  let stuck = 0;
  let maxStuck = 0;
  // Push along the stair diagonal for 2s
  for (let i = 0; i < 60; i++) {
    const len = Math.SQRT2;
    const res = slide(
      layerWalk,
      x,
      y,
      (1 / len) * speed * dt,
      (1 / len) * speed * dt,
    );
    x = res.x;
    y = res.y;
    if (!res.moved) {
      stuck += dt;
      maxStuck = Math.max(maxStuck, stuck);
    } else stuck = 0;
  }
  return maxStuck;
}

describe('M1f rift corridor walk simulation', () => {
  test('axis-only slide sticks >0.5s on some diagonal corridor seeds', () => {
    let stuckSeeds = 0;
    for (let i = 1; i <= 50; i++) {
      const map = generateDungeon(i * 997, 3 + (i % 5));
      if (maxStuckOnDiagonal(map, false) > 0.5) stuckSeeds += 1;
    }
    expect(stuckSeeds).toBeGreaterThan(0);
  });

  test('corner-nudge clears diagonal samples and all 50 room walks', () => {
    let stuckSeeds = 0;
    for (let i = 1; i <= 50; i++) {
      const map = generateDungeon(i * 997, 3 + (i % 5));
      if (maxStuckOnDiagonal(map, true) > 0.5) stuckSeeds += 1;
    }
    expect(stuckSeeds).toBe(0);

    const res = simulateRiftWalks({
      seeds: 50,
      cornerNudge: true,
      stuckLimitSec: 0.5,
    });
    expect(res.ok, JSON.stringify(res.failures.slice(0, 3))).toBe(true);
    expect(res.failures).toHaveLength(0);
  });
});
