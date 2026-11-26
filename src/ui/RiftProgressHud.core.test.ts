import { describe, expect, test } from 'bun:test';
import { riftProgressLayout } from './RiftProgressLayout';
import { computeTouchLayout, scaleTouchLayout } from './TouchLayout';

describe('riftProgressLayout', () => {
  test('desktop keeps a tall strip clear of the left third', () => {
    const L = riftProgressLayout({
      touch: false,
      renderScale: 1,
      gameW: 1280,
      gameH: 720,
      mapClearance: 164,
    });
    expect(L.barH).toBe(160);
    expect(L.x).toBeGreaterThan(1280 * 0.7);
  });

  test('touch Low shrinks the bar and parks it under the minimap above ATK', () => {
    const css = computeTouchLayout(854, 480);
    const m = scaleTouchLayout(css, 0.65);
    const L = riftProgressLayout({
      touch: true,
      renderScale: 0.65,
      gameW: Math.round(854 * 0.65),
      gameH: Math.round(480 * 0.65),
      mapClearance: m.mapSize + 24,
      minimap: m.minimap,
      atk: m.atk,
      act: m.shift,
    });
    expect(L.barH).toBeLessThan(100);
    expect(L.barW).toBeLessThanOrEqual(10);
    // Bottom of strip (origin bottom) stays above ATK.
    expect(L.y).toBeLessThanOrEqual(m.atk.y - m.atk.r - 4);
    // Anchored near the minimap right edge.
    expect(L.x).toBeGreaterThan(m.minimap.x);
    expect(L.y - L.barH).toBeGreaterThanOrEqual(m.minimap.y + m.minimap.h - 2);
  });
});
