import { describe, expect, test } from 'bun:test';
import { RIFT_BIOMES } from '../data/biomes';
import {
  assignOpeningPackSpots,
  BIOME_OPENING_PACKS,
  biomeSignatureEnemyIds,
  openingPacksForBiome,
} from './BiomePackIdentity';

describe('BiomePackIdentity', () => {
  test('every rift biome has a non-empty opening recipe', () => {
    for (const b of RIFT_BIOMES) {
      const packs = openingPacksForBiome(b.id);
      expect(packs.length, b.id).toBeGreaterThanOrEqual(2);
      expect(BIOME_OPENING_PACKS[b.id].length).toBe(packs.length);
    }
  });

  test('signatures diverge across biomes', () => {
    const sets = RIFT_BIOMES.map((b) =>
      biomeSignatureEnemyIds(b.id).slice().sort().join(','),
    );
    expect(new Set(sets).size).toBe(RIFT_BIOMES.length);
  });

  test('assignOpeningPackSpots uses nearest free tiles', () => {
    const used = new Set<string>();
    const spots = assignOpeningPackSpots({
      specs: [
        { enemyId: 'crawler', count: 4 },
        { enemyId: 'shade', count: 2 },
      ],
      candidates: [
        { x: 10.5, y: 10.5 },
        { x: 4.5, y: 4.5 },
        { x: 5.5, y: 4.5 },
      ],
      spawn: { x: 1.5, y: 1.5 },
      used,
    });
    expect(spots).toHaveLength(2);
    expect(spots[0]).toMatchObject({
      enemyId: 'crawler',
      count: 4,
      x: 4.5,
      y: 4.5,
    });
    expect(spots[1]).toMatchObject({
      enemyId: 'shade',
      count: 2,
      x: 5.5,
      y: 4.5,
    });
    expect(used.has('4,4')).toBe(true);
    expect(used.has('5,4')).toBe(true);
  });

  test('ash grind / salt poke / woods rush / crystal kite ids', () => {
    expect(biomeSignatureEnemyIds('ashen_crypt')).toContain('crawler');
    expect(biomeSignatureEnemyIds('salt_wastes')).toContain(
      'enemy_bone_archer',
    );
    expect(biomeSignatureEnemyIds('shattered_woods')).toContain(
      'enemy_rift_goblin',
    );
    expect(biomeSignatureEnemyIds('crystal_cavern')).toContain(
      'enemy_rift_wraith',
    );
  });
});
