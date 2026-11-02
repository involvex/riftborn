import { describe, expect, test } from 'bun:test';
import {
  beginSkillAim,
  DEFAULT_SKILL_AIM,
  pickAimedEnemyIndex,
  resolveSkillAimRelease,
  screenDirToWorldDelta,
  skillAimDragDist,
  updateSkillAim,
} from './SkillAim';

describe('SkillAim', () => {
  test('short tap resolves to auto', () => {
    const s = beginSkillAim(0, 100, 100, 0);
    const r = resolveSkillAimRelease(s, 100, DEFAULT_SKILL_AIM);
    expect(r.action).toBe('auto');
  });

  test('drag then release far casts with direction', () => {
    let s = beginSkillAim(1, 100, 100, 0);
    s = updateSkillAim(s, 180, 100);
    expect(skillAimDragDist(s)).toBeGreaterThan(
      DEFAULT_SKILL_AIM.aimThresholdPx,
    );
    const r = resolveSkillAimRelease(s, 400, DEFAULT_SKILL_AIM);
    expect(r.action).toBe('cast');
    if (r.action === 'cast') {
      expect(r.dirX).toBeGreaterThan(0.9);
      expect(Math.abs(r.dirY)).toBeLessThan(0.2);
    }
  });

  test('release back on button cancels after hold', () => {
    let s = beginSkillAim(2, 100, 100, 0);
    s = updateSkillAim(s, 200, 100);
    s = updateSkillAim(s, 105, 102);
    const r = resolveSkillAimRelease(s, 500, DEFAULT_SKILL_AIM);
    expect(r.action).toBe('cancel');
  });

  test('screenDirToWorldDelta normalizes', () => {
    const d = screenDirToWorldDelta(1, 0);
    expect(Math.hypot(d.dx, d.dy)).toBeCloseTo(1, 5);
  });

  test('pickAimedEnemyIndex prefers aim point within range', () => {
    const enemies = [
      { x: 5, y: 0, alive: true },
      { x: 2, y: 0, alive: true },
      { x: 8, y: 0, alive: false },
    ];
    const idx = pickAimedEnemyIndex(enemies, 0, 0, 5.2, 0, 6);
    expect(idx).toBe(0);
  });

  test('pickAimedEnemyIndex returns -1 when none in range', () => {
    const enemies = [{ x: 20, y: 0, alive: true }];
    expect(pickAimedEnemyIndex(enemies, 0, 0, 20, 0, 5)).toBe(-1);
  });
});
