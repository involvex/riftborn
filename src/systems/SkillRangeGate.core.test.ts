import { describe, expect, test } from 'bun:test';
import type { AbilityKind } from '../types/game';
import {
  RANGE_HINT_COOLDOWN_MS,
  decideSkillRangeGate,
  shouldShowRangeHint,
  skillRangeKind,
  type SkillRangeKind,
} from './SkillRangeGate';

const ALL_KINDS: AbilityKind[] = [
  'cleave',
  'strike',
  'buff',
  'dash_strike',
  'blink',
  'slow_nova',
  'pulse',
  'leap',
  'bolt',
  'barrier',
  'chain',
];

const RANGE_KINDS: SkillRangeKind[] = ['targeted', 'aoe', 'mobility'];

describe('skillRangeKind', () => {
  test('classifies every ability kind', () => {
    for (const kind of ALL_KINDS) {
      expect(RANGE_KINDS).toContain(skillRangeKind(kind));
    }
  });

  test('targeted casts are strike, bolt and chain', () => {
    for (const kind of ALL_KINDS) {
      const targeted = kind === 'strike' || kind === 'bolt' || kind === 'chain';
      expect(skillRangeKind(kind) === 'targeted').toBe(targeted);
    }
  });

  test('mobility casts are leap, dash strike and blink', () => {
    expect(skillRangeKind('leap')).toBe('mobility');
    expect(skillRangeKind('dash_strike')).toBe('mobility');
    expect(skillRangeKind('blink')).toBe('mobility');
  });

  test('aoe covers cleave, nova, pulse and self buffs', () => {
    expect(skillRangeKind('cleave')).toBe('aoe');
    expect(skillRangeKind('slow_nova')).toBe('aoe');
    expect(skillRangeKind('pulse')).toBe('aoe');
    expect(skillRangeKind('buff')).toBe('aoe');
    expect(skillRangeKind('barrier')).toBe('aoe');
  });
});

describe('decideSkillRangeGate', () => {
  test('targeted casts in range', () => {
    expect(
      decideSkillRangeGate({
        kind: 'targeted',
        hasTargetInRange: true,
        hasTargetInAssistRange: true,
      }),
    ).toEqual({ action: 'cast' });
  });

  test('targeted in assist range asks to move closer', () => {
    expect(
      decideSkillRangeGate({
        kind: 'targeted',
        hasTargetInRange: false,
        hasTargetInAssistRange: true,
      }),
    ).toEqual({ action: 'skip', reason: 'out_of_range' });
  });

  test('targeted without any target is a silent skip', () => {
    expect(
      decideSkillRangeGate({
        kind: 'targeted',
        hasTargetInRange: false,
        hasTargetInAssistRange: false,
      }),
    ).toEqual({ action: 'skip', reason: 'no_target' });
  });

  test('aoe and mobility always cast, with or without a target', () => {
    for (const kind of ['aoe', 'mobility'] as const) {
      for (const inRange of [true, false]) {
        for (const inAssist of [true, false]) {
          expect(
            decideSkillRangeGate({
              kind,
              hasTargetInRange: inRange,
              hasTargetInAssistRange: inAssist,
            }),
          ).toEqual({ action: 'cast' });
        }
      }
    }
  });
});

describe('shouldShowRangeHint', () => {
  test('first hint is allowed', () => {
    expect(shouldShowRangeHint(0, Number.NEGATIVE_INFINITY)).toBe(true);
  });

  test('throttles repeated hints inside the window', () => {
    expect(shouldShowRangeHint(1000, 0)).toBe(false);
    expect(shouldShowRangeHint(RANGE_HINT_COOLDOWN_MS - 1, 0)).toBe(false);
  });

  test('allows a hint once the window elapses', () => {
    expect(shouldShowRangeHint(RANGE_HINT_COOLDOWN_MS, 0)).toBe(true);
    expect(shouldShowRangeHint(4000, 2000)).toBe(true);
  });
});
