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
  'enemy_rift_goblin',
  'enemy_shadow_wolf',
  'enemy_bone_archer',
  'enemy_rift_wraith',
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

  test('original biome enemy mixes remain unchanged', () => {
    const ashen = RIFT_BIOMES.find((b) => b.id === 'ashen_crypt')!;
    expect(ashen.enemyMix.slice(0, 3)).toEqual([
      { enemyId: 'shade', weight: 0.35, minCount: 2, maxCount: 4 },
      { enemyId: 'crawler', weight: 0.45, minCount: 3, maxCount: 5 },
      { enemyId: 'wisp', weight: 0.2, minCount: 1, maxCount: 2 },
    ]);
    const crystal = RIFT_BIOMES.find((b) => b.id === 'crystal_cavern')!;
    expect(crystal.enemyMix.slice(0, 3)).toEqual([
      { enemyId: 'wisp', weight: 0.35, minCount: 2, maxCount: 3 },
      { enemyId: 'ash_bat', weight: 0.4, minCount: 2, maxCount: 4 },
      { enemyId: 'crawler', weight: 0.25, minCount: 2, maxCount: 4 },
    ]);
    const woods = RIFT_BIOMES.find((b) => b.id === 'shattered_woods')!;
    expect(woods.enemyMix.slice(0, 3)).toEqual([
      { enemyId: 'ash_scamp', weight: 0.35, minCount: 3, maxCount: 5 },
      { enemyId: 'wisp', weight: 0.35, minCount: 2, maxCount: 4 },
      { enemyId: 'shade', weight: 0.3, minCount: 2, maxCount: 3 },
    ]);
  });

  test('all four new enemy ids appear across biomes', () => {
    const allIds = new Set<string>();
    for (const b of RIFT_BIOMES) {
      for (const e of b.enemyMix) {
        allIds.add(e.enemyId);
      }
    }
    expect(allIds.has('enemy_rift_goblin')).toBe(true);
    expect(allIds.has('enemy_shadow_wolf')).toBe(true);
    expect(allIds.has('enemy_bone_archer')).toBe(true);
    expect(allIds.has('enemy_rift_wraith')).toBe(true);
  });
});
