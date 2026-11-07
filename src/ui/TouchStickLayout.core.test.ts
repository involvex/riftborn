import { describe, expect, test } from 'bun:test';
import { clampStickKnobOffset, shouldResetStickOnLayout } from './TouchStick';

describe('shouldResetStickOnLayout', () => {
  test('resets when no active drag (pointer null)', () => {
    expect(shouldResetStickOnLayout(null)).toBe(true);
  });

  test('does not reset during active drag (pointer captured)', () => {
    expect(shouldResetStickOnLayout(1)).toBe(false);
    expect(shouldResetStickOnLayout(0)).toBe(false);
  });
});

describe('clampStickKnobOffset', () => {
  test('returns zero offset unchanged', () => {
    expect(clampStickKnobOffset(0, 0, 52)).toEqual({ dx: 0, dy: 0 });
  });

  test('returns offset unchanged when inside radius', () => {
    expect(clampStickKnobOffset(10, -20, 52)).toEqual({ dx: 10, dy: -20 });
  });

  test('clamps offset to max radius', () => {
    const out = clampStickKnobOffset(30, 40, 25); // len 50
    const len = Math.hypot(out.dx, out.dy);
    expect(len).toBeCloseTo(25, 5);
    expect(out.dx).toBeCloseTo(15, 5);
    expect(out.dy).toBeCloseTo(20, 5);
  });

  test('clamps exactly on radius boundary', () => {
    const out = clampStickKnobOffset(3, 4, 5);
    expect(out).toEqual({ dx: 3, dy: 4 });
  });

  test('handles max <= 0', () => {
    expect(clampStickKnobOffset(5, 5, 0)).toEqual({ dx: 0, dy: 0 });
  });
});
