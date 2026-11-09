import { describe, expect, test } from 'bun:test';
import enemiesData from './enemies.json';
import {
  ASHEN_CRYPT_BIOME,
  CRYSTAL_CAVERN_BIOME,
  RIFT_BIOMES,
  SHATTERED_WOODS_BIOME,
} from './biomes';
import { generateDungeon } from '../world/DungeonGen';
import { enemySpriteKey } from '../render/SpriteAtlas';
import { ENEMY_SHIFT_LAYER } from './shiftLayers';

const defs = enemiesData as Record<
  string,
  { isElite?: boolean; name?: string; hp: number }
>;

describe('biome bosses (P2)', () => {
  test('every rift biome names a boss def that exists and is elite', () => {
    for (const biome of RIFT_BIOMES) {
      const bossId = biome.bossId ?? 'rift_lord';
      expect(defs[bossId], `${biome.id} boss ${bossId}`).toBeDefined();
      expect(defs[bossId]!.isElite).toBe(true);
      expect(defs[bossId]!.hp).toBeGreaterThan(0);
    }
  });

  test('biome bosses reuse existing sheets (no new art)', () => {
    for (const bossId of ['rift_lord', 'crystal_lord', 'grove_alpha']) {
      const key = enemySpriteKey(bossId);
      expect(key).not.toBe('spr_shade');
      expect(key).toMatch(/^spr_/);
    }
  });

  test('each biome has its own boss identity', () => {
    expect(ASHEN_CRYPT_BIOME.bossId).toBe('rift_lord');
    expect(CRYSTAL_CAVERN_BIOME.bossId).toBe('crystal_lord');
    expect(SHATTERED_WOODS_BIOME.bossId).toBe('grove_alpha');
  });

  test('new boss defs are visible on both shift layers', () => {
    expect(ENEMY_SHIFT_LAYER.crystal_lord).toBe('both');
    expect(ENEMY_SHIFT_LAYER.grove_alpha).toBe('both');
  });

  test('generated rifts carry the biome boss id', () => {
    for (let s = 1; s <= 12; s++) {
      const map = generateDungeon(s * 977 + 1, 1);
      expect(map.layout.bossId).toBe(map.biome.bossId ?? 'rift_lord');
      expect(defs[map.layout.bossId!]).toBeDefined();
    }
  });
});
