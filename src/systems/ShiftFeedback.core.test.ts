import { describe, expect, test } from 'bun:test';
import {
  shiftLayerColor,
  shiftLayerLabel,
  shiftTransitionText,
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
});
