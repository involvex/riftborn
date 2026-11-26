import { describe, expect, test } from 'bun:test';
import {
  cycleShakeStrength,
  parseShakeStrength,
  shakeStrengthLabel,
} from './SettingsStore';

describe('parseShakeStrength', () => {
  test('migrates legacy screenShake false to Off', () => {
    expect(parseShakeStrength({ screenShake: false })).toBe(0);
  });

  test('migrates legacy screenShake true to Full', () => {
    expect(parseShakeStrength({ screenShake: true })).toBe(1);
  });

  test('prefers explicit shakeStrength over legacy flag', () => {
    expect(parseShakeStrength({ shakeStrength: 0.5, screenShake: false })).toBe(
      0.5,
    );
  });

  test('missing fields default to Full', () => {
    expect(parseShakeStrength({})).toBe(1);
  });
});

describe('cycleShakeStrength', () => {
  test('cycles Full → Off → Low → Full', () => {
    expect(cycleShakeStrength(1)).toBe(0);
    expect(cycleShakeStrength(0)).toBe(0.5);
    expect(cycleShakeStrength(0.5)).toBe(1);
  });
});

describe('shakeStrengthLabel', () => {
  test('labels Off / Low / Full', () => {
    expect(shakeStrengthLabel(0)).toBe('Off');
    expect(shakeStrengthLabel(0.5)).toBe('Low');
    expect(shakeStrengthLabel(1)).toBe('Full');
  });
});
