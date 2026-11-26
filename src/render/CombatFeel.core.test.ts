import { describe, expect, test } from 'bun:test';
import {
  COMBAT_FEEL,
  HITSTOP_FLOOR_MS,
  basicAttackHitstopKind,
  basicAttackShakeKind,
  combatHitstopMs,
  combatShakeParams,
  LOW_JUICE_CRIT_SHAKE,
  SHAKE_FLOOR_MS,
  critFlashPlan,
  hitstopMsScaled,
  isCombatCrit,
  playerHurtSquashPlan,
  shakeParamsScaled,
  shouldPlayCameraFlash,
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

  test('reduceFlashing zeros the white frame and keeps the pop', () => {
    const crit = critFlashPlan(true, true);
    expect(crit.whiteMs).toBe(0);
    expect(crit.scale).toBe(1.28);
  });
});

describe('shouldPlayCameraFlash', () => {
  test('reduceFlashing blocks every flash', () => {
    expect(
      shouldPlayCameraFlash({
        kind: 'beat',
        reduceFlashing: true,
        nowMs: 1000,
        lastLootFlashAtMs: 0,
      }).play,
    ).toBe(false);
  });

  test('loot inside the gap is denied; a beat still plays', () => {
    const loot = shouldPlayCameraFlash({
      kind: 'loot',
      reduceFlashing: false,
      rarityAllows: true,
      nowMs: 200,
      lastLootFlashAtMs: 0,
      gapMs: 350,
    });
    expect(loot.play).toBe(true);
    expect(
      shouldPlayCameraFlash({
        kind: 'loot',
        reduceFlashing: false,
        rarityAllows: true,
        nowMs: 200 + 100,
        lastLootFlashAtMs: loot.nextLootFlashAtMs,
        gapMs: 350,
      }).play,
    ).toBe(false);
    expect(
      shouldPlayCameraFlash({
        kind: 'beat',
        reduceFlashing: false,
        nowMs: 200 + 100,
        lastLootFlashAtMs: loot.nextLootFlashAtMs,
      }).play,
    ).toBe(true);
  });

  test('loot without rarity allow is denied', () => {
    expect(
      shouldPlayCameraFlash({
        kind: 'loot',
        reduceFlashing: false,
        rarityAllows: false,
        nowMs: 1000,
        lastLootFlashAtMs: 0,
      }).play,
    ).toBe(false);
  });
});

describe('playerHurtSquashPlan', () => {
  test('keeps area roughly constant and finishes under 150ms', () => {
    const p = playerHurtSquashPlan();
    expect(p.scaleX * p.scaleY).toBeCloseTo(1, 1);
    expect(p.ms).toBeLessThanOrEqual(150);
  });
});

describe('combatShakeParams', () => {
  test('returns finite non-negative values when enabled', () => {
    const p = combatShakeParams('hit', { shakeStrength: 1, juiceScale: 1 });
    expect(p.ms).toBeGreaterThanOrEqual(0);
    expect(p.intensity).toBeGreaterThanOrEqual(0);
  });

  test('scales intensity by shakeStrength; Off zeros shake', () => {
    const full = combatShakeParams('hit', {
      shakeStrength: 1,
      juiceScale: 1,
    });
    const half = combatShakeParams('hit', {
      shakeStrength: 0.5,
      juiceScale: 1,
    });
    const off = combatShakeParams('hit', {
      shakeStrength: 0,
      juiceScale: 1,
    });
    expect(half.ms).toBe(full.ms);
    expect(half.intensity).toBeCloseTo(full.intensity * 0.5);
    expect(off).toEqual({ ms: 0, intensity: 0 });
  });
});

describe('shakeParamsScaled', () => {
  test('phone juice holds crit shake at the hitstop floor and lifts it', () => {
    const crit = shakeParamsScaled(
      'crit',
      0.4,
      COMBAT_FEEL.shakeCritMs,
      COMBAT_FEEL.shakeCritIntensity,
    );
    const hit = shakeParamsScaled(
      'hit',
      0.4,
      COMBAT_FEEL.shakeHitMs,
      COMBAT_FEEL.shakeHitIntensity,
    );
    expect(crit.ms).toBe(SHAKE_FLOOR_MS.crit);
    expect(crit.ms).toBe(70);
    expect(crit.intensity).toBeGreaterThan(hit.intensity);
    const unboosted = COMBAT_FEEL.shakeCritIntensity * Math.min(1, 0.4 + 0.25);
    expect(crit.intensity).toBeCloseTo(unboosted * LOW_JUICE_CRIT_SHAKE);
  });

  test('desktop juice keeps the authored crit shake', () => {
    const crit = shakeParamsScaled(
      'crit',
      1,
      COMBAT_FEEL.shakeCritMs,
      COMBAT_FEEL.shakeCritIntensity,
    );
    expect(crit.ms).toBe(COMBAT_FEEL.shakeCritMs);
    expect(crit.intensity).toBeCloseTo(COMBAT_FEEL.shakeCritIntensity);
  });
});
