import { describe, expect, test } from 'bun:test';
import {
  COMBAT_FEEL,
  HITSTOP_FLOOR_MS,
  basicAttackHitstopKind,
  basicAttackShakeKind,
  combatHitstopMs,
  combatShakeParams,
  critFlashPlan,
  hitstopMsScaled,
  isCombatCrit,
} from './CombatFeel';

describe('isCombatCrit', () => {
  test('threshold sits above level-1 basics so skills punch', () => {
    expect(COMBAT_FEEL.critDamageThreshold).toBeGreaterThanOrEqual(18);
    expect(COMBAT_FEEL.critDamageThreshold).toBeLessThanOrEqual(22);
    expect(isCombatCrit(12)).toBe(false);
    expect(isCombatCrit(13)).toBe(false);
    expect(isCombatCrit(COMBAT_FEEL.critDamageThreshold - 1)).toBe(false);
    expect(isCombatCrit(COMBAT_FEEL.critDamageThreshold)).toBe(true);
  });
});

describe('basicAttackHitstopKind', () => {
  test('single non-crit connect is light', () => {
    expect(
      basicAttackHitstopKind({ anyCrit: false, anyBoss: false, hitCount: 1 }),
    ).toBe('light');
  });

  test('multi-cleave upgrades to hit', () => {
    expect(
      basicAttackHitstopKind({ anyCrit: false, anyBoss: false, hitCount: 2 }),
    ).toBe('hit');
  });

  test('crit or boss upgrades to crit', () => {
    expect(
      basicAttackHitstopKind({ anyCrit: true, anyBoss: false, hitCount: 1 }),
    ).toBe('crit');
    expect(
      basicAttackHitstopKind({ anyCrit: false, anyBoss: true, hitCount: 1 }),
    ).toBe('crit');
  });
});

describe('basicAttackShakeKind', () => {
  test('boss beats multi-cleave', () => {
    expect(
      basicAttackShakeKind({ anyCrit: false, anyBoss: true, hitCount: 3 }),
    ).toBe('boss');
  });

  test('multi-cleave reads as crit shake without boss', () => {
    expect(
      basicAttackShakeKind({ anyCrit: false, anyBoss: false, hitCount: 2 }),
    ).toBe('crit');
  });
});

describe('combatHitstopMs', () => {
  test('crit is longer than light', () => {
    expect(combatHitstopMs('crit')).toBeGreaterThan(combatHitstopMs('light'));
    expect(combatHitstopMs('hit')).toBeGreaterThan(combatHitstopMs('light'));
  });
});

describe('hitstopMsScaled', () => {
  test('phone juice cannot shrink below the readable floor', () => {
    expect(hitstopMsScaled('light', 0.4)).toBe(HITSTOP_FLOOR_MS.light);
    expect(hitstopMsScaled('hit', 0.4)).toBe(HITSTOP_FLOOR_MS.hit);
    expect(hitstopMsScaled('crit', 0.4)).toBe(HITSTOP_FLOOR_MS.crit);
    expect(HITSTOP_FLOOR_MS.light).toBe(28);
    expect(HITSTOP_FLOOR_MS.hit).toBe(45);
    expect(HITSTOP_FLOOR_MS.crit).toBe(70);
  });

  test('desktop juice keeps the longer base durations', () => {
    expect(hitstopMsScaled('light', 1)).toBe(COMBAT_FEEL.hitstopLightMs);
    expect(hitstopMsScaled('hit', 1)).toBe(COMBAT_FEEL.hitstopMs);
    expect(hitstopMsScaled('crit', 1)).toBe(COMBAT_FEEL.hitstopCritMs);
  });
});

describe('critFlashPlan', () => {
  test('crits flash white and pop harder than a normal hit', () => {
    expect(critFlashPlan(false)).toEqual({ whiteMs: 0, scale: 1.14 });
    const crit = critFlashPlan(true);
    expect(crit.whiteMs).toBe(40);
    expect(crit.scale).toBeGreaterThan(critFlashPlan(false).scale);
  });
});

describe('combatShakeParams', () => {
  test('returns finite non-negative values when enabled', () => {
    const p = combatShakeParams('hit');
    expect(p.ms).toBeGreaterThanOrEqual(0);
    expect(p.intensity).toBeGreaterThanOrEqual(0);
  });
});
