import { describe, expect, test } from 'bun:test';
import { cooldownSweepProgress } from './CooldownOverlay';

describe('cooldownSweepProgress', () => {
  test('returns 0 when no cooldown', () => {
    expect(cooldownSweepProgress(0, 5)).toBe(0);
  });

  test('returns 1 at full remaining', () => {
    expect(cooldownSweepProgress(5, 5)).toBe(1);
  });

  test('returns fraction mid-cooldown', () => {
    expect(cooldownSweepProgress(2.5, 5)).toBeCloseTo(0.5);
  });

  test('clamps overshoot', () => {
    expect(cooldownSweepProgress(9, 4)).toBe(1);
    expect(cooldownSweepProgress(-1, 4)).toBe(0);
  });
});
