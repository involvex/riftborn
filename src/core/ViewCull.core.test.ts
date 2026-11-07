import { describe, expect, test } from 'bun:test';
import { TILE_WIDTH } from './IsoMath';
import {
  DECOR_CULL_PAD,
  isScreenPointVisible,
  TILE_CULL_MIN_PAD,
  TILE_CULL_PAD,
} from './ViewCull';

const view = { x: 100, y: 200, width: 800, height: 450 };

describe('isScreenPointVisible', () => {
  test('point inside view is visible', () => {
    expect(isScreenPointVisible(400, 400, view, 0)).toBe(true);
    expect(isScreenPointVisible(100, 200, view, 0)).toBe(true);
    expect(isScreenPointVisible(900, 650, view, 0)).toBe(true);
  });

  test('point clearly outside view is hidden', () => {
    expect(isScreenPointVisible(0, 400, view, 0)).toBe(false);
    expect(isScreenPointVisible(400, 0, view, 0)).toBe(false);
    expect(isScreenPointVisible(1200, 400, view, 96)).toBe(false);
    expect(isScreenPointVisible(400, 900, view, 96)).toBe(false);
  });

  test('edge point with pad stays visible (no holes at border)', () => {
    // Just outside right edge, but within pad
    expect(isScreenPointVisible(980, 400, view, TILE_CULL_PAD)).toBe(true);
    expect(isScreenPointVisible(996, 400, view, TILE_CULL_PAD)).toBe(true);
    // Just beyond pad
    expect(isScreenPointVisible(997, 400, view, TILE_CULL_PAD)).toBe(false);
    // All four edges
    expect(isScreenPointVisible(100 - 90, 400, view, 96)).toBe(true);
    expect(isScreenPointVisible(400, 200 - 90, view, 96)).toBe(true);
    expect(isScreenPointVisible(400, 650 + 90, view, 96)).toBe(true);
  });

  test('pad covers at least a tile width', () => {
    expect(TILE_CULL_PAD).toBeGreaterThanOrEqual(TILE_WIDTH);
    expect(TILE_CULL_PAD).toBeGreaterThanOrEqual(96);
    expect(TILE_CULL_MIN_PAD).toBe(TILE_WIDTH);
    expect(DECOR_CULL_PAD).toBeGreaterThan(TILE_CULL_PAD);
  });
});
