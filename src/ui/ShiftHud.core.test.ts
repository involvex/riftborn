import { describe, expect, test } from 'bun:test';
import { shiftHudTouchMetrics } from './ShiftHudLayout';
import { computeTouchLayout, scaleTouchLayout } from './TouchLayout';

describe('shiftHudTouchMetrics', () => {
  test('sits below the status block so it cannot cover HP/XP', () => {
    const css = computeTouchLayout(854, 480);
    const m = scaleTouchLayout(css, 0.65);
    const L = shiftHudTouchMetrics({
      statusX: m.status.x,
      statusY: m.status.y,
      statusH: m.status.h,
      renderScale: 0.65,
    });
    expect(L.y).toBeGreaterThanOrEqual(m.status.y + m.status.h);
    expect(L.barH).toBeLessThan(12);
    expect(L.barW).toBeLessThan(m.status.w);
  });
});
