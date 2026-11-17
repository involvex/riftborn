import { describe, expect, test } from 'bun:test';
import { depthRuleFor } from './RiftDepth';
import {
  PRESSURE_MAX,
  applyPressureToRule,
  clampPressureStep,
  nextPressureStep,
  pressureHudLabel,
  pressureMults,
} from './RiftPressure';

describe('RiftPressure', () => {
  test('clamps and advances', () => {
    expect(clampPressureStep(undefined)).toBe(0);
    expect(clampPressureStep(-3)).toBe(0);
    expect(nextPressureStep(0)).toBe(1);
    expect(nextPressureStep(PRESSURE_MAX)).toBe(PRESSURE_MAX);
  });

  test('scales apex rule without wiping its identity', () => {
    const apex = depthRuleFor(10);
    const scaled = applyPressureToRule(apex, 5);
    expect(scaled.id).toBe('apex');
    expect(scaled.hpMult).toBeGreaterThan(apex.hpMult);
    expect(scaled.dmgMult).toBeGreaterThan(apex.dmgMult);
    expect(scaled.lootBump).toBeGreaterThan(apex.lootBump);
  });

  test('clear payouts grow with pressure', () => {
    const p0 = pressureMults(0);
    const p4 = pressureMults(4);
    expect(p4.clearGold).toBeGreaterThan(p0.clearGold);
    expect(p4.clearShards).toBeGreaterThanOrEqual(p0.clearShards);
  });

  test('hud label only when pressure is active', () => {
    expect(pressureHudLabel(0)).toBeNull();
    expect(pressureHudLabel(3)).toBe('P3');
  });
});
