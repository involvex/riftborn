import { describe, expect, test } from 'bun:test';
import {
  COMBAT_FEEL,
  basicAttackHitstopKind,
  basicAttackShakeKind,
  combatHitstopMs,
  combatShakeParams,
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

describe('combatShakeParams', () => {
  test('returns finite non-negative values when enabled', () => {
    const p = combatShakeParams('hit');
    expect(p.ms).toBeGreaterThanOrEqual(0);
    expect(p.intensity).toBeGreaterThanOrEqual(0);
  });
});
