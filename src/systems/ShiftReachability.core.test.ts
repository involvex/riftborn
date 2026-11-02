import { describe, expect, test } from 'bun:test';
import { generateDungeon } from '../world/DungeonGen';
import { canReachWithShift, pathRequiresShift } from './ShiftReachability';

describe('ShiftReachability', () => {
  test('boss and exit stay reachable for many rift seeds', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const map = generateDungeon(seed * 997, 3 + (seed % 5));
      const spawn = map.layout.spawn!;
      const boss = map.layout.elite!;
      // Exit opens on boss tile after kill — same cell family.
      const exit = { x: boss.x, y: boss.y };
      expect(
        canReachWithShift(map, spawn, boss, 'ash'),
        `seed ${seed} ash→boss`,
      ).toBe(true);
      expect(
        canReachWithShift(map, spawn, boss, 'shadow'),
        `seed ${seed} shadow→boss`,
      ).toBe(true);
      expect(
        canReachWithShift(map, boss, exit, 'ash'),
        `seed ${seed} ash exit`,
      ).toBe(true);
      expect(
        canReachWithShift(map, boss, exit, 'shadow'),
        `seed ${seed} shadow exit`,
      ).toBe(true);
    }
  });

  test('at least one seed forces a shift on the route to boss', () => {
    let forced = false;
    for (let seed = 1; seed <= 80; seed++) {
      const map = generateDungeon(seed * 131, 4);
      const spawn = map.layout.spawn!;
      const boss = map.layout.elite!;
      if (pathRequiresShift(map, spawn, boss)) {
        forced = true;
        break;
      }
    }
    expect(forced).toBe(true);
  });
});
