import { describe, expect, test } from 'bun:test';
import { shiftShakeParams } from './ShiftFeel';

describe('shiftShakeParams', () => {
  test('returns zero when shake strength is Off', () => {
    expect(shiftShakeParams(1, { shakeStrength: 0, juiceScale: 1 })).toEqual({
      ms: 0,
      intensity: 0,
    });
  });

  test('returns zero when fx intensity is zero', () => {
    expect(shiftShakeParams(0, { shakeStrength: 1, juiceScale: 1 })).toEqual({
      ms: 0,
      intensity: 0,
    });
  });

  test('returns a punch at full intensity', () => {
    const p = shiftShakeParams(1, { shakeStrength: 1, juiceScale: 1 });
    expect(p.ms).toBeGreaterThan(0);
    expect(p.intensity).toBeGreaterThan(0);
  });

  test('scales intensity by shakeStrength', () => {
    const full = shiftShakeParams(1, { shakeStrength: 1, juiceScale: 1 });
    const half = shiftShakeParams(1, { shakeStrength: 0.5, juiceScale: 1 });
    expect(half.ms).toBe(full.ms);
    expect(half.intensity).toBeCloseTo(full.intensity * 0.5);
  });

  test('scales down ms on low juiceScale', () => {
    const high = shiftShakeParams(1, { shakeStrength: 1, juiceScale: 1 });
    const low = shiftShakeParams(1, { shakeStrength: 1, juiceScale: 0.45 });
    expect(low.ms).toBeLessThan(high.ms);
  });

  test('scales down with lower fx intensity', () => {
    const full = shiftShakeParams(1, { shakeStrength: 1, juiceScale: 1 });
    const half = shiftShakeParams(0.5, { shakeStrength: 1, juiceScale: 1 });
    expect(half.ms < full.ms || half.intensity < full.intensity).toBe(true);
  });
});
