import { describe, expect, test } from 'bun:test';
import { worldToScreen } from '../core/IsoMath';
import { STICK_ACCEL_MS, stickAccelFactor, stickToMove } from './TouchStick';

describe('stickToMove', () => {
  test('deadzone kills input (release must stop the figure)', () => {
    const r = stickToMove(3, 4, 50); // len 5 => mag 0.1 < 0.12
    expect(r.speed01).toBe(0);
  });

  test('half deflection reaches full speed (analog band is tight)', () => {
    const r = stickToMove(25, 0, 50); // mag 0.5
    expect(r.speed01).toBeCloseTo(1, 5);
  });

  test('full deflection clamps speed at 1', () => {
    const r = stickToMove(48, 0, 50); // mag 0.96
    expect(r.speed01).toBe(1);
    const over = stickToMove(120, 0, 50); // beyond the knob clamp
    expect(over.speed01).toBe(1);
  });

  test('linear ramp inside the analog band', () => {
    const mid = stickToMove(31, 0, 50); // mag 0.62 > 0.5 => full
    expect(mid.speed01).toBe(1);
    const low = stickToMove(15, 0, 50); // mag 0.3
    // (0.3 - 0.12) / (0.5 - 0.12) = 0.4737
    expect(low.speed01).toBeCloseTo((0.3 - 0.12) / 0.38, 4);
  });

  test('zero radius never moves', () => {
    const r = stickToMove(10, 10, 0);
    expect(r.speed01).toBe(0);
  });

  test('16 screen angles map to world within 5 degrees', () => {
    for (let i = 0; i < 16; i++) {
      const screenAngle = (i / 16) * Math.PI * 2;
      const dx = Math.cos(screenAngle) * 50;
      const dy = Math.sin(screenAngle) * 50;
      const { worldDir } = stickToMove(dx, dy, 50);
      // Project the world direction back to screen space and compare angles.
      const screen = worldToScreen(worldDir.x, worldDir.y);
      const back = Math.atan2(screen.screenY, screen.screenX);
      let diff = Math.abs(back - screenAngle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      const deg = (diff * 180) / Math.PI;
      expect(deg, `angle ${i} deviates`).toBeLessThanOrEqual(5);
    }
  });

  test('world direction is normalized', () => {
    const r = stickToMove(30, 40, 50);
    const len = Math.hypot(r.worldDir.x, r.worldDir.y);
    expect(len).toBeCloseTo(1, 5);
  });
});

describe('stickAccelFactor', () => {
  test('no elapsed time means no speed', () => {
    expect(stickAccelFactor(0)).toBe(0);
    expect(stickAccelFactor(-5)).toBe(0);
  });

  test('reaches full speed at the ramp end and stays there', () => {
    expect(stickAccelFactor(STICK_ACCEL_MS)).toBeCloseTo(1, 6);
    expect(stickAccelFactor(STICK_ACCEL_MS * 2)).toBe(1);
  });

  test('sqrt curve is front-loaded vs a linear ramp', () => {
    const linear = (ms: number) => Math.min(1, ms / STICK_ACCEL_MS);
    for (const ms of [20, 30, 45, 60]) {
      expect(stickAccelFactor(ms)).toBeGreaterThan(linear(ms));
    }
    // Half ramp speed by a quarter of the duration.
    expect(stickAccelFactor(STICK_ACCEL_MS / 4)).toBeGreaterThanOrEqual(0.5);
  });

  test('monotonically increasing', () => {
    let prev = -1;
    for (let ms = 0; ms <= STICK_ACCEL_MS; ms += 8) {
      const v = stickAccelFactor(ms);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  test('stays inside 0..1', () => {
    for (let ms = 0; ms <= 200; ms += 5) {
      const v = stickAccelFactor(ms);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
