import { describe, expect, test } from 'bun:test';
import { pickRiftBiome, RIFT_BIOMES, type BiomeDef } from './biomes';

const BIOME_IDS = ['ashen_crypt', 'crystal_cavern', 'shattered_woods'] as const;
const TILE_KEYS = [
  'tile_dungeon_0',
  'tile_dungeon_1',
  'tile_dungeon_2',
] as const;
const FORBIDDEN_PROP_KEYS = ['tree', 'crystal_vein'] as const;
const ALLOWED_ENEMY_IDS = new Set([
  'shade',
  'crawler',
  'wisp',
  'ash_scamp',
  'ash_bat',
  'ash_scout',
  'rift_lord',
]);

function assertBiomeShape(b: BiomeDef): void {
  expect(BIOME_IDS as readonly string[]).toContain(b.id);
  for (const k of TILE_KEYS) {
    expect(typeof b.tileWeights[k]).toBe('number');
    expect((b.tileWeights[k] ?? 0) > 0).toBe(true);
  }
  const propKeys = Object.keys(b.propWeights);
  expect(propKeys.length).toBeGreaterThan(0);
  for (const k of propKeys) {
    expect(k.startsWith('prop_')).toBe(false);
    expect((FORBIDDEN_PROP_KEYS as readonly string[]).includes(k)).toBe(false);
    expect((b.propWeights[k as keyof typeof b.propWeights] ?? 0) > 0).toBe(
      true,
    );
  }
  expect(b.enemyMix.length).toBeGreaterThan(0);
  for (const e of b.enemyMix) {
    expect(ALLOWED_ENEMY_IDS.has(e.enemyId)).toBe(true);
    expect(e.enemyId.startsWith('enemy_rift_')).toBe(false);
  }
}

describe('biomes', () => {
  test('pickRiftBiome is deterministic for same seed+depth', () => {
    for (let seed = 1; seed <= 40; seed += 7) {
      for (let depth = 1; depth <= 10; depth += 3) {
        const a = pickRiftBiome(seed * 997, depth);
        const b = pickRiftBiome(seed * 997, depth);
        expect(a.id).toBe(b.id);
        expect(a).toBe(b);
      }
    }
  });

  test('all three biome IDs appear across seed/depth pairs', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 120; seed++) {
      for (let depth = 1; depth <= 10; depth++) {
        seen.add(pickRiftBiome(seed * 7919 + 17, depth).id);
      }
    }
    for (const id of BIOME_IDS) {
      expect(seen.has(id), `missing biome ${id}`).toBe(true);
    }
  });

  test('each biome has valid tileWeights, propWeights, and enemyMix', () => {
    expect(RIFT_BIOMES.length).toBe(3);
    for (const b of RIFT_BIOMES) {
      assertBiomeShape(b);
    }
  });
});
