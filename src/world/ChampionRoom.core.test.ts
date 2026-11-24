import { describe, expect, test } from 'bun:test';
import { generateDungeon } from './DungeonGen';
import {
  championDisplayName,
  championEnemyForBiome,
  championEnterToast,
  championHudToken,
  floorPathExists,
  packsTowardKillGoal,
  stampChampionSideRoom,
} from './ChampionRoom';
import { mulberry32 } from './MapGen';

describe('ChampionRoom', () => {
  test('biome picks a named elite', () => {
    expect(championEnemyForBiome('ashen_crypt')).toBe('ash_scout');
    expect(championEnemyForBiome('crystal_cavern')).toBe('ash_bat');
    expect(championEnemyForBiome('shattered_woods')).toBe('ash_bramble');
    expect(championEnemyForBiome('salt_wastes')).toBe('ash_scout');
  });

  test('enter toast names the elite and side room', () => {
    const text = championEnterToast('ash_bat');
    expect(text).toContain(championDisplayName('ash_bat'));
    expect(text.toLowerCase()).toContain('optional');
    expect(text.toLowerCase()).toContain('side');
  });

  test('hud token is Elite only while alive', () => {
    expect(championHudToken(true)).toBe('Elite');
    expect(championHudToken(false)).toBeNull();
  });

  test('kill goal ignores champion packs', () => {
    expect(
      packsTowardKillGoal([
        { count: 4 },
        { count: 1, champion: true },
        { count: 3 },
      ]),
    ).toBe(7);
  });

  test('generated rift stamps a champion off the boss path', () => {
    let found = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const map = generateDungeon(seed, 3);
      const champ = map.layout.champion;
      if (!champ) continue;
      found += 1;
      expect(champ.enemyId).toBe(championEnemyForBiome(map.biome.id));
      const packs = map.layout.packs;
      const champPack = packs.find((p) => p.champion);
      expect(champPack).toBeTruthy();
      expect(champPack!.count).toBe(1);
      expect(packsTowardKillGoal(packs)).toBeLessThan(
        packs.reduce((s, p) => s + p.count, 0),
      );
      const spawn = map.layout.spawn!;
      const boss = map.layout.elite!;
      // Spur interior is a 5×5 around the champion; spine still reaches boss.
      expect(
        floorPathExists({
          cells: map.cells,
          from: spawn,
          to: boss,
          exclude: {
            x: Math.floor(champ.x) - 2,
            y: Math.floor(champ.y) - 2,
            w: 5,
            h: 5,
          },
        }),
      ).toBe(true);
    }
    expect(found).toBeGreaterThan(8);
  });

  test('stamp fails cleanly on a single-room arena', () => {
    const cells = Array.from({ length: 20 }, () =>
      Array.from({ length: 20 }, () => 0 as 0 | 1),
    );
    for (let y = 4; y < 16; y++) {
      for (let x = 4; x < 16; x++) cells[y]![x] = 1;
    }
    const rooms = [{ x: 4, y: 4, w: 12, h: 12 }];
    const result = stampChampionSideRoom({
      cells,
      rooms,
      rnd: mulberry32(7),
      width: 20,
      height: 20,
      biomeId: 'ashen_crypt',
    });
    expect(result).toBeNull();
  });
});
