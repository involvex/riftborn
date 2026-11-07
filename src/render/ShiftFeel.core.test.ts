import { describe, expect, test } from 'bun:test';
import { shiftShakeParams } from './ShiftFeel';

describe('shiftShakeParams', () => {
  test('returns zero when screen shake is disabled', () => {
    expect(shiftShakeParams(1, { screenShake: false, juiceScale: 1 })).toEqual({
      ms: 0,
      intensity: 0,
    });
  });

  test('returns zero when fx intensity is zero', () => {
    expect(shiftShakeParams(0, { screenShake: true, juiceScale: 1 })).toEqual({
      ms: 0,
      intensity: 0,
    });
  });

  test('returns a punch at full intensity', () => {
    const p = shiftShakeParams(1, { screenShake: true, juiceScale: 1 });
    expect(p.ms).toBeGreaterThan(0);
    expect(p.intensity).toBeGreaterThan(0);
  });

  test('scales down ms on low juiceScale', () => {
    const high = shiftShakeParams(1, { screenShake: true, juiceScale: 1 });
    const low = shiftShakeParams(1, { screenShake: true, juiceScale: 0.45 });
    expect(low.ms).toBeLessThan(high.ms);
  });

  test('scales down with lower fx intensity', () => {
    const full = shiftShakeParams(1, { screenShake: true, juiceScale: 1 });
    const half = shiftShakeParams(0.5, { screenShake: true, juiceScale: 1 });
    expect(half.ms < full.ms || half.intensity < full.intensity).toBe(true);
  });
});
