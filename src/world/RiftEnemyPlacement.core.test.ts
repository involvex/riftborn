import { describe, expect, test } from 'bun:test';
import { generateDungeon } from './DungeonGen';
import {
  minRiftEnemyCount,
  placeRiftEnemyPacks,
  reachableFloorCells,
} from './RiftEnemyPlacement';
import { ASHEN_CRYPT_BIOME, CRYSTAL_CAVERN_BIOME } from '../data/biomes';

/** Deterministic rnd for reproducible placement. */
function seededRnd(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1103515245 + 12345) % 0x80000000;
    return s / 0x80000000;
  };
}

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

  test('20 seeds: crystal_cavern spawns exactly one lone mender, reachable and clear', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const depth = 1 + (seed % 4);
      const map = generateDungeon(seed * 131, depth);
      const spawn = map.layout.spawn!;
      const packs = placeRiftEnemyPacks(
        map,
        depth,
        seededRnd(seed),
        3,
        CRYSTAL_CAVERN_BIOME.enemyMix,
      );
      const menders = packs.filter((p) => p.enemyId === 'rift_mender');
      expect(menders.length, `seed ${seed} mender count`).toBe(1);
      expect(menders[0]!.count, `seed ${seed} mender pack size`).toBe(1);

      const reachable = reachableFloorCells(map, spawn, 'ash');
      const tx = Math.floor(menders[0]!.x);
      const ty = Math.floor(menders[0]!.y);
      expect(
        reachable.has(`${tx},${ty},ash`) || reachable.has(`${tx},${ty},shadow`),
        `seed ${seed} mender @${tx},${ty} not reachable`,
      ).toBe(true);
      expect(
        Math.hypot(menders[0]!.x - spawn.x, menders[0]!.y - spawn.y),
        `seed ${seed} mender too close to spawn`,
      ).toBeGreaterThanOrEqual(3);

      // Beside a pack: close enough to heal, clear of its tile.
      const others = packs.filter((p) => p.enemyId !== 'rift_mender');
      const nearestPackDist = Math.min(
        ...others.map((p) =>
          Math.hypot(p.x - menders[0]!.x, p.y - menders[0]!.y),
        ),
      );
      expect(
        nearestPackDist,
        `seed ${seed} mender not beside a pack (${nearestPackDist.toFixed(2)})`,
      ).toBeGreaterThanOrEqual(2);
      expect(nearestPackDist).toBeLessThanOrEqual(4.5);

      // The floor count still holds with the mender on top.
      const total = packs.reduce((s, p) => s + p.count, 0);
      expect(total).toBeGreaterThanOrEqual(minRiftEnemyCount(depth));
    }
  });

  test('ashen_crypt mix never spawns a mender', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const map = generateDungeon(seed * 77, 1 + (seed % 3));
      const packs = placeRiftEnemyPacks(
        map,
        2,
        seededRnd(seed + 500),
        3,
        ASHEN_CRYPT_BIOME.enemyMix,
      );
      expect(
        packs.some((p) => p.enemyId === 'rift_mender'),
        `seed ${seed} leaked a mender`,
      ).toBe(false);
    }
  });
});
