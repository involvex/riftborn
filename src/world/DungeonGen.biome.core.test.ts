import { describe, expect, test } from 'bun:test';
import { generateDungeon } from './DungeonGen';
import { RIFT_BIOMES } from '../data/biomes';

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
});
