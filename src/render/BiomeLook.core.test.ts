import { describe, expect, test } from 'bun:test';
import { RIFT_BIOMES } from '../data/biomes';
import { biomeLook, biomeLooksDistinct } from './BiomeLook';

describe('BiomeLook', () => {
  test('every rift biome has a look with sane fields', () => {
    for (const b of RIFT_BIOMES) {
      const look = biomeLook(b.id);
      expect(look.id).toBe(b.id);
      expect(look.floorTint).toBeGreaterThan(0);
      expect(look.accent).toBeGreaterThan(0);
      expect(look.edgeAlpha).toBeGreaterThan(0.2);
      expect(look.edgeAlpha).toBeLessThanOrEqual(1);
      expect(look.speckEvery).toBeGreaterThan(5);
      expect(look.speckRadius).toBeGreaterThan(1);
      expect(look.background.startsWith('#')).toBe(true);
    }
  });

  test('each biome is visually distinct from the others', () => {
    for (let i = 0; i < RIFT_BIOMES.length; i++) {
      for (let j = i + 1; j < RIFT_BIOMES.length; j++) {
        const a = biomeLook(RIFT_BIOMES[i]!.id);
        const b = biomeLook(RIFT_BIOMES[j]!.id);
        expect(biomeLooksDistinct(a, b), `${a.id} vs ${b.id}`).toBe(true);
      }
    }
  });

  test('crystal is denser/brighter than ashen; salt is the lightest floor', () => {
    const ashen = biomeLook('ashen_crypt');
    const crystal = biomeLook('crystal_cavern');
    const salt = biomeLook('salt_wastes');
    expect(crystal.speckEvery).toBeLessThan(ashen.speckEvery);
    expect(crystal.edgeAlpha).toBeGreaterThan(ashen.edgeAlpha);
    // Salt floor channel average should beat ashen (bleached).
    const avg = (c: number) =>
      ((c >> 16) & 0xff) + ((c >> 8) & 0xff) + (c & 0xff);
    expect(avg(salt.floorTint)).toBeGreaterThan(avg(ashen.floorTint));
  });

  test('unknown ids fall back to ashen', () => {
    expect(biomeLook('nope').id).toBe('ashen_crypt');
  });
});
