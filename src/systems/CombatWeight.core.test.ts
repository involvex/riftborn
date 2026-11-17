import { describe, expect, test } from 'bun:test';
import {
  ASSIST_STICK_BLEND,
  DASH_INVULN_SEC,
  MELEE_WINDUP_SEC,
  RUSH_WINDUP_SEC,
  SWING_SLOW_MULT,
  SWING_SLOW_SEC,
  blendStickWithAssist,
  isDashInvulnerable,
  swingMoveMult,
  tickTimer,
} from './CombatWeight';

describe('CombatWeight timers', () => {
  test('dash and melee windups are about 0.3s', () => {
    expect(DASH_INVULN_SEC).toBeCloseTo(0.3, 5);
    expect(MELEE_WINDUP_SEC).toBeCloseTo(0.3, 5);
    expect(RUSH_WINDUP_SEC).toBeGreaterThanOrEqual(0.25);
    expect(RUSH_WINDUP_SEC).toBeLessThanOrEqual(0.35);
  });

  test('isDashInvulnerable gates on remaining time', () => {
    expect(isDashInvulnerable(0)).toBe(false);
    expect(isDashInvulnerable(DASH_INVULN_SEC)).toBe(true);
    expect(isDashInvulnerable(tickTimer(DASH_INVULN_SEC, 0.31))).toBe(false);
  });

  test('swing slow lasts a short commit window', () => {
    expect(SWING_SLOW_SEC).toBeGreaterThanOrEqual(0.1);
    expect(SWING_SLOW_SEC).toBeLessThanOrEqual(0.2);
    expect(swingMoveMult(SWING_SLOW_SEC)).toBe(SWING_SLOW_MULT);
    expect(swingMoveMult(0)).toBe(1);
  });
});

describe('blendStickWithAssist', () => {
  test('pulls stick toward the target while keeping analog length', () => {
    const out = blendStickWithAssist(1, 0, 0, 10, 0, 0);
    expect(out.y).toBeGreaterThan(0);
    expect(out.x).toBeGreaterThan(0);
    expect(Math.hypot(out.x, out.y)).toBeCloseTo(1, 5);
    // Chase share dominates stick share after normalize.
    expect(out.y).toBeGreaterThan(out.x);
    expect(ASSIST_STICK_BLEND).toBeLessThan(0.5);
  });

  test('pure chase when stick is idle', () => {
    const out = blendStickWithAssist(0, 0, 5, 0, 0, 0);
    expect(out.x).toBeCloseTo(1, 5);
    expect(out.y).toBeCloseTo(0, 5);
  });
});
