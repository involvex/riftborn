import { describe, expect, test } from 'bun:test';
import {
  pickWeightedTileKey,
  TILE_ART_SCALE,
  WORLD_TILE_KEYS,
} from './WorldTiles';

describe('WorldArt floor tiles', () => {
  test('2× diamonds draw at TILE_ART_SCALE 0.25', () => {
    expect(TILE_ART_SCALE).toBe(0.25);
  });

  test('WORLD_TILE_KEYS includes biome + hub plaza variants', () => {
    expect(WORLD_TILE_KEYS).toContain('tile_dungeon_ashen');
    expect(WORLD_TILE_KEYS).toContain('tile_dungeon_crystal');
    expect(WORLD_TILE_KEYS).toContain('tile_dungeon_grove');
    expect(WORLD_TILE_KEYS).toContain('tile_dungeon_salt');
    expect(WORLD_TILE_KEYS).toContain('tile_hub_plaza_warm');
    expect(WORLD_TILE_KEYS).toContain('tile_hub_cobble_wet');
  });

  test('pickWeightedTileKey respects weights and fallback', () => {
    expect(pickWeightedTileKey(0.1, {}, 'tile_dungeon_0')).toBe(
      'tile_dungeon_0',
    );
    const weights = {
      tile_dungeon_ashen: 0.5,
      tile_dungeon_ash_grit: 0.35,
      tile_dungeon_0: 0.15,
    };
    expect(pickWeightedTileKey(0, weights)).toBe('tile_dungeon_ashen');
    expect(pickWeightedTileKey(0.99, weights)).toBe('tile_dungeon_0');
    const mid = pickWeightedTileKey(0.6, weights);
    expect(['tile_dungeon_ashen', 'tile_dungeon_ash_grit']).toContain(mid);
  });
});
