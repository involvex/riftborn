import { describe, expect, test } from 'bun:test';
import {
  shiftFailToastText,
  shiftLayerColor,
  shiftLayerLabel,
  shiftReadyToastText,
  shiftTransitionText,
  shouldAnnounceShiftReady,
} from './ShiftFeedback';

describe('ShiftFeedback', () => {
  test('labels layers with fantasy names', () => {
    expect(shiftLayerLabel('ash')).toBe('Asche');
    expect(shiftLayerLabel('shadow')).toBe('Schatten');
  });

  test('builds a clear transition text', () => {
    expect(shiftTransitionText('ash', 'shadow')).toBe('Asche → Schatten');
    expect(shiftTransitionText('shadow', 'ash')).toBe('Schatten → Asche');
  });

  test('returns HUD colors', () => {
    expect(shiftLayerColor('ash')).toMatch(/^#/);
    expect(shiftLayerColor('shadow')).toMatch(/^#/);
  });

  test('ready toast names the live bind', () => {
    expect(shiftReadyToastText('Q')).toContain('Q');
    expect(shiftReadyToastText('SHIFT')).toContain('gates');
  });

  test('fail toast distinguishes energy vs cooldown', () => {
    expect(shiftFailToastText('energy', 'Q')).toMatch(/energy/i);
    expect(shiftFailToastText('cooldown', 'Q')).toMatch(/cool/i);
  });

  test('announces ready only on the first false→true edge', () => {
    expect(shouldAnnounceShiftReady(false, true, false)).toBe(true);
    expect(shouldAnnounceShiftReady(false, true, true)).toBe(false);
    expect(shouldAnnounceShiftReady(true, true, false)).toBe(false);
    expect(shouldAnnounceShiftReady(false, false, false)).toBe(false);
  });
});
