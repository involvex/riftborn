import { describe, expect, test } from 'bun:test';
import {
  worldLabelPx,
  worldLabelStyle,
  type WorldLabelKind,
} from './WorldLabelStyle';

const KINDS: WorldLabelKind[] = [
  'name',
  'prompt',
  'building',
  'poiTitle',
  'poiSub',
];

describe('worldLabelPx', () => {
  test('touch name/building/prompt are 16px', () => {
    expect(worldLabelPx('name', 'touch')).toBe(16);
    expect(worldLabelPx('building', 'touch')).toBe(16);
    expect(worldLabelPx('prompt', 'touch')).toBe(16);
    expect(worldLabelPx('poiTitle', 'touch')).toBe(16);
  });

  test('touch poiSub is 13px', () => {
    expect(worldLabelPx('poiSub', 'touch')).toBe(13);
  });

  test('desktop stays near legacy 10–13', () => {
    expect(worldLabelPx('name', 'desktop')).toBe(12);
    expect(worldLabelPx('prompt', 'desktop')).toBe(11);
    expect(worldLabelPx('building', 'desktop')).toBe(13);
    expect(worldLabelPx('poiTitle', 'desktop')).toBe(13);
    expect(worldLabelPx('poiSub', 'desktop')).toBe(10);
  });
});

describe('worldLabelStyle', () => {
  test('always resolution 2 by default', () => {
    for (const kind of KINDS) {
      expect(worldLabelStyle(kind, 'touch').resolution).toBe(2);
      expect(worldLabelStyle(kind, 'desktop').resolution).toBe(2);
    }
  });

  test('prompt gets a dark chip', () => {
    const s = worldLabelStyle('prompt', 'touch');
    expect(s.backgroundColor).toBe('#0a0c10aa');
    expect(s.padding?.x).toBeGreaterThanOrEqual(4);
  });

  test('non-prompt kinds omit background chip', () => {
    expect(worldLabelStyle('name', 'touch').backgroundColor).toBeUndefined();
    expect(
      worldLabelStyle('building', 'desktop').backgroundColor,
    ).toBeUndefined();
  });

  test('stroke is at least 3', () => {
    for (const kind of KINDS) {
      expect(
        worldLabelStyle(kind, 'touch').strokeThickness,
      ).toBeGreaterThanOrEqual(3);
    }
  });
});
