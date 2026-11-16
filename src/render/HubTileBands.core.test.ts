import { describe, expect, test } from 'bun:test';
import { pickHubTileKey } from './HubTileBands';

describe('hub tile bands vs real assets', () => {
  test('plaza never picks the green grass tile (hub_0)', () => {
    for (let i = 0; i < 40; i++) {
      const key = pickHubTileKey(10 + i, 20 + (i % 7), 'plaza');
      expect(key).not.toBe('tile_hub_0');
      expect(['tile_hub_1', 'tile_hub_2']).toContain(key);
    }
  });

  test('wild prefers the green grass tile (hub_0)', () => {
    const keys = new Set<string>();
    for (let i = 0; i < 40; i++) {
      keys.add(pickHubTileKey(3 + i, 5 + (i % 5), 'wild'));
    }
    expect(keys.has('tile_hub_0')).toBe(true);
    expect(keys.has('tile_hub_1')).toBe(false);
  });
});
