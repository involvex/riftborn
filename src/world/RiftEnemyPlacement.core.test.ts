import { describe, expect, test } from 'bun:test';
import { generateDungeon } from './DungeonGen';
import { minRiftEnemyCount, reachableFloorCells } from './RiftEnemyPlacement';

describe('RiftEnemyPlacement', () => {
  test('50 seeds: ≥min enemies, all on footprint-reachable cells', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const depth = 1 + (seed % 10);
      const map = generateDungeon(seed * 997, depth);
      const spawn = map.layout.spawn!;
      expect(spawn).toBeTruthy();

      const reachable = reachableFloorCells(map, spawn, 'ash');
      expect(reachable.size, `seed ${seed} reachable empty`).toBeGreaterThan(
        10,
      );

      const minCount = minRiftEnemyCount(depth);
      let total = 0;
      for (const pack of map.layout.packs) {
        total += pack.count;
        const tx = Math.floor(pack.x);
        const ty = Math.floor(pack.y);
        const onReachable =
          reachable.has(`${tx},${ty},ash`) ||
          reachable.has(`${tx},${ty},shadow`);
        expect(
          onReachable,
          `seed ${seed} pack @${tx},${ty} not reachable`,
        ).toBe(true);

        const dx = pack.x - spawn.x;
        const dy = pack.y - spawn.y;
        expect(
          Math.hypot(dx, dy),
          `seed ${seed} pack too close to spawn`,
        ).toBeGreaterThanOrEqual(3);
      }
      expect(
        total,
        `seed ${seed} enemy count ${total} < ${minCount}`,
      ).toBeGreaterThanOrEqual(minCount);
    }
  });
});
