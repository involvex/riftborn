import { describe, expect, test } from 'bun:test';
import {
  ANIM_RANGES,
  CORE_FRAMES,
  DEATH_COUNT,
  DIR_STRIDE,
  HIT_COUNT,
  TOTAL_FRAMES,
  animRangeForRow,
  deathMotion,
  deathSourceFrame,
  hitMotion,
  hitSourceFrame,
  octantSheetRow,
  sheetAnimKey,
  sheetRowCount,
} from './AnimFrames';

describe('AnimFrames layout', () => {
  test('total frames = core + hit + death', () => {
    expect(TOTAL_FRAMES).toBe(CORE_FRAMES + HIT_COUNT + DEATH_COUNT);
    expect(TOTAL_FRAMES).toBe(20);
    expect(ANIM_RANGES.hit.start).toBe(CORE_FRAMES);
    expect(ANIM_RANGES.death.end).toBe(TOTAL_FRAMES - 1);
  });

  test('hit motions flash then squash harder', () => {
    const a = hitMotion(0);
    const b = hitMotion(1);
    expect(a.flash).toBeGreaterThan(b.flash);
    expect(Math.abs(b.knockPx)).toBeGreaterThanOrEqual(Math.abs(a.knockPx));
    expect(b.squashY).toBeLessThan(a.squashY);
  });

  test('death motions shrink and fade across frames', () => {
    const first = deathMotion(0);
    const last = deathMotion(DEATH_COUNT - 1);
    expect(last.shrink).toBeLessThan(first.shrink);
    expect(last.alpha).toBeLessThan(first.alpha);
    expect(last.settleY).toBeGreaterThan(first.settleY);
  });

  test('hit/death source frames stay in core or hit range', () => {
    for (let i = 0; i < HIT_COUNT; i++) {
      const src = hitSourceFrame(i);
      expect(src).toBeGreaterThanOrEqual(0);
      expect(src).toBeLessThan(CORE_FRAMES);
    }
    for (let i = 0; i < DEATH_COUNT; i++) {
      const src = deathSourceFrame(i);
      expect(src).toBeGreaterThanOrEqual(0);
      expect(src).toBeLessThan(TOTAL_FRAMES);
    }
  });

  test('sheetRowCount treats 20 as 1-row and 80 as 4-dir', () => {
    expect(sheetRowCount(20)).toBe(1);
    expect(sheetRowCount(80)).toBe(4);
    expect(sheetRowCount(160)).toBe(8);
    expect(DIR_STRIDE).toBe(20);
  });

  test('octantSheetRow maps 4-dir LPC and 8-dir strips', () => {
    expect(octantSheetRow('e', 1)).toBe(0);
    expect(octantSheetRow('n', 4)).toBe(0);
    expect(octantSheetRow('w', 4)).toBe(1);
    expect(octantSheetRow('s', 4)).toBe(2);
    expect(octantSheetRow('e', 4)).toBe(3);
    expect(octantSheetRow('e', 8)).toBe(0);
    expect(octantSheetRow('s', 8)).toBe(2);
    expect(octantSheetRow('n', 8)).toBe(6);
  });

  test('animRangeForRow offsets by DIR_STRIDE', () => {
    const walk = animRangeForRow('walk', 2);
    expect(walk.start).toBe(ANIM_RANGES.walk.start + 40);
    expect(walk.end).toBe(ANIM_RANGES.walk.end + 40);
  });

  test('sheetAnimKey suffixes octant only for multi-row', () => {
    expect(sheetAnimKey('spr_shade', 'walk', 'n', 1)).toBe('spr_shade_walk');
    expect(sheetAnimKey('spr_shade', 'walk', 'n', 4)).toBe('spr_shade_walk_n');
  });
});
