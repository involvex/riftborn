import { describe, expect, test } from 'bun:test';
import { biomeLook } from './BiomeLook';
import {
  arenaRingColor,
  bossArenaFloorTint,
  bossArenaSpeckEvery,
  dungeonBossRoom,
  tileInArenaRoom,
} from './BossArenaLook';

describe('BossArenaLook', () => {
  test('dungeonBossRoom picks the last room', () => {
    expect(dungeonBossRoom([])).toBeNull();
    expect(
      dungeonBossRoom([
        { x: 1, y: 1, w: 4, h: 4 },
        { x: 10, y: 8, w: 6, h: 5 },
      ]),
    ).toEqual({ x: 10, y: 8, w: 6, h: 5 });
  });

  test('tileInArenaRoom is inclusive of origin, exclusive of far edge', () => {
    const room = { x: 2, y: 3, w: 4, h: 3 };
    expect(tileInArenaRoom(2, 3, room)).toBe(true);
    expect(tileInArenaRoom(5, 5, room)).toBe(true);
    expect(tileInArenaRoom(6, 3, room)).toBe(false);
    expect(tileInArenaRoom(2, 6, room)).toBe(false);
  });

  test('arena floor tint differs from base biome floor', () => {
    for (const id of [
      'ashen_crypt',
      'crystal_cavern',
      'shattered_woods',
      'salt_wastes',
    ] as const) {
      const look = biomeLook(id);
      expect(bossArenaFloorTint(look)).not.toBe(look.floorTint);
      expect(bossArenaSpeckEvery(look)).toBeLessThan(look.speckEvery);
    }
  });

  test('phase ring colors diverge', () => {
    const look = biomeLook('ashen_crypt');
    expect(arenaRingColor(look, 'boss')).not.toBe(arenaRingColor(look, 'exit'));
    expect(arenaRingColor(look, 'idle')).toBe(look.accent);
  });
});
