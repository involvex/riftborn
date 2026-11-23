import { describe, expect, test } from 'bun:test';
import { ashenCryptRules, biomeRoomPlan, generateDungeon } from './DungeonGen';
import {
  ASHEN_CRYPT_BIOME,
  CRYSTAL_CAVERN_BIOME,
  SALT_WASTES_BIOME,
  SHATTERED_WOODS_BIOME,
  RIFT_BIOMES,
} from '../data/biomes';

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

  test('crystal, woods, and salt each follow their room rules', () => {
    expect(biomeRoomPlan(CRYSTAL_CAVERN_BIOME)?.corridor).toBe('jagged');
    expect(biomeRoomPlan(CRYSTAL_CAVERN_BIOME)?.bossMinShort).toBe(8);
    expect(biomeRoomPlan(SHATTERED_WOODS_BIOME)?.niches).toBe(true);
    expect(biomeRoomPlan(SALT_WASTES_BIOME)?.corridor).toBe('straight');
    expect(biomeRoomPlan(SALT_WASTES_BIOME)?.bossMinLong).toBe(12);

    const seen = new Map<string, number>();
    for (let seed = 1; seed <= 80; seed++) {
      const map = generateDungeon(seed, 1);
      if (map.biome.id === 'ashen_crypt') continue;
      const count = seen.get(map.biome.id) ?? 0;
      if (count >= 4) continue;
      seen.set(map.biome.id, count + 1);
      const middles = map.rooms.slice(1, -1);
      expect(middles.length, `${map.biome.id} seed ${seed}`).toBeGreaterThan(0);
      const boss = map.rooms[map.rooms.length - 1]!;
      if (map.biome.id === 'crystal_cavern') {
        for (const room of middles) {
          expect(Math.min(room.w, room.h)).toBeGreaterThanOrEqual(6);
        }
        expect(Math.min(boss.w, boss.h)).toBeGreaterThanOrEqual(8);
      } else if (map.biome.id === 'shattered_woods') {
        for (const room of middles) {
          expect(Math.max(room.w, room.h)).toBeLessThanOrEqual(8);
          expect(Math.min(room.w, room.h)).toBeGreaterThanOrEqual(5);
        }
        expect(Math.min(boss.w, boss.h)).toBeGreaterThanOrEqual(8);
      } else if (map.biome.id === 'salt_wastes') {
        for (const room of middles) {
          expect(Math.max(room.w, room.h)).toBeGreaterThanOrEqual(11);
        }
        expect(Math.max(boss.w, boss.h)).toBeGreaterThanOrEqual(12);
      }
    }
    expect(seen.size).toBe(3);
    for (const count of seen.values()) expect(count).toBe(4);
  });
});
