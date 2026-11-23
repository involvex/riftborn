import { describe, expect, test } from 'bun:test';
import { ashenCryptRules, generateDungeon } from './DungeonGen';
import { ASHEN_CRYPT_BIOME, RIFT_BIOMES } from '../data/biomes';

describe('DungeonGen biomes', () => {
  test('generateDungeon sets map.biome and keeps layerGates', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const map = generateDungeon(seed * 1237, 2 + (seed % 6));
      expect(map.biome).toBeTruthy();
      expect(RIFT_BIOMES.map((b) => b.id)).toContain(map.biome.id);
      expect(map.layerGates).toBeTruthy();
      expect(map.layerGates.length).toBe(map.height);
      expect(map.layerGates[0]?.length).toBe(map.width);
    }
  });

  test('biome choice is deterministic for seed+depth', () => {
    const a = generateDungeon(4242, 5);
    const b = generateDungeon(4242, 5);
    expect(a.biome.id).toBe(b.biome.id);
  });

  test('ashen crypt roomTypeRules produce long halls', () => {
    const rules = ashenCryptRules(ASHEN_CRYPT_BIOME);
    expect(rules.halls).toBe(true);
    expect(rules.narrow).toBe(true);
    expect(rules.niches).toBe(true);
    expect(rules.bossHall).toBe(true);
    expect(ashenCryptRules(RIFT_BIOMES[1]!).halls).toBe(false);

    let found = 0;
    for (let seed = 1; seed <= 48 && found < 6; seed++) {
      const map = generateDungeon(seed, 1);
      if (map.biome.id !== 'ashen_crypt') continue;
      found += 1;
      const halls = map.rooms.slice(1, -1);
      expect(halls.length, `seed ${seed} middle halls`).toBeGreaterThan(0);
      const elongated = halls.filter(
        (r) => Math.max(r.w, r.h) / Math.min(r.w, r.h) >= 2,
      );
      expect(elongated.length, `seed ${seed} aspect`).toBeGreaterThan(0);
      const boss = map.rooms[map.rooms.length - 1]!;
      expect(
        Math.max(boss.w, boss.h),
        `seed ${seed} boss hall`,
      ).toBeGreaterThanOrEqual(10);
    }
    expect(found).toBeGreaterThan(0);
  });
});
