import { describe, expect, test } from 'bun:test';
import skillsData from '../data/skills.json';
import type { AbilityDef } from '../types/game';
import { mergeDamageBuff } from './SkillDamageBuff';

const abilities = skillsData.abilities as Record<string, AbilityDef>;

describe('mergeDamageBuff', () => {
  test('Battle Cry does not shorten a longer shrine window', () => {
    const next = mergeDamageBuff({
      remaining: 45,
      currentMult: 1.4,
      nextMult: 1.45,
      nextDuration: 5,
    });
    expect(next.duration).toBeCloseTo(45, 5);
    expect(next.mult).toBeCloseTo(1.45, 5);
  });

  test('Battle Cry replaces a shorter remaining buff', () => {
    const next = mergeDamageBuff({
      remaining: 3,
      currentMult: 1.4,
      nextMult: 1.45,
      nextDuration: 5,
    });
    expect(next.duration).toBeCloseTo(5, 5);
    expect(next.mult).toBeCloseTo(1.45, 5);
  });

  test('fresh buff with no remaining starts clean', () => {
    const next = mergeDamageBuff({
      remaining: 0,
      currentMult: 1.4,
      nextMult: 1.45,
      nextDuration: 5,
    });
    expect(next.duration).toBeCloseTo(5, 5);
    expect(next.mult).toBeCloseTo(1.45, 5);
  });
});

describe('cleave and seal data jobs', () => {
  test('Cleaving Strike is a forward arc; Whirlwind stays radius', () => {
    expect(abilities['war_cleave']!.forwardArc).toBe(true);
    expect(abilities['war_whirl']!.forwardArc).toBeUndefined();
  });

  test('Binding Seal roots; Pulse still slows', () => {
    const seal = abilities['mys_seal']!;
    expect(seal.root).toBeCloseTo(1.2, 5);
    expect(seal.slow).toBeUndefined();
    const pulse = abilities['mys_pulse']!;
    expect(pulse.slow).toBeCloseTo(0.4, 5);
    expect(pulse.root).toBeUndefined();
  });
});
