import { describe, expect, test } from 'bun:test';
import {
  ANIM_RANGES,
  CORE_FRAMES,
  DEATH_COUNT,
  HIT_COUNT,
  TOTAL_FRAMES,
  deathMotion,
  deathSourceFrame,
  hitMotion,
  hitSourceFrame,
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
});
