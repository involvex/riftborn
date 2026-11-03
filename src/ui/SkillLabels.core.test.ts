import { describe, expect, test } from 'bun:test';
import { uiFontPx } from '../core/UiFont';
import skills from '../data/skills.json';
import {
  estimateLabelWidthPx,
  shortTouchSkillLabel,
  touchSkillFontPx,
  touchSkillLabelFits,
} from './SkillLabels';
import { computeTouchLayout } from './TouchLayout';

const ALL_NAMES = Object.values(skills.abilities).map((a) => a.name);

describe('shortTouchSkillLabel', () => {
  test('every ability has a complete label (no mid-word cut like STRIK)', () => {
    for (const name of ALL_NAMES) {
      const label = shortTouchSkillLabel(name);
      expect(label.length, name).toBeGreaterThan(0);
      expect(label, name).not.toBe('STRIK');
      expect(label, name).toMatch(/^[A-Z0-9]+$/);
    }
  });

  test('known warrior starters map to short full words', () => {
    expect(shortTouchSkillLabel('War Leap')).toBe('LEAP');
    expect(shortTouchSkillLabel('Cleaving Strike')).toBe('SWEEP');
    expect(shortTouchSkillLabel('Shield Bash')).toBe('BASH');
  });

  test('each label fits the 1024x473 skill pad at skill font size', () => {
    const m = computeTouchLayout(1024, 473);
    const padR = m.skillSlots[0]!.r;
    const maxFont = uiFontPx('skill', 'touch');
    expect(padR).toBeGreaterThanOrEqual(22);
    for (const name of ALL_NAMES) {
      const label = shortTouchSkillLabel(name);
      const fontPx = touchSkillFontPx(label, padR, maxFont);
      expect(
        touchSkillLabelFits(label, padR, fontPx),
        `${name} → ${label} w=${estimateLabelWidthPx(label, fontPx)} r=${padR} font=${fontPx}`,
      ).toBe(true);
    }
  });
});
