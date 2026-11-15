import { describe, expect, test } from 'bun:test';
import {
  BossShiftBrain,
  BOSS_SHIFT_INTERVAL_MS,
  BOSS_SHIFT_WARN_MS,
} from './BossShift';

describe('BossShiftBrain', () => {
  test('starts on ash and is quiet before the warn window', () => {
    const brain = new BossShiftBrain();
    expect(brain.layer).toBe('ash');
    expect(brain.tick(BOSS_SHIFT_INTERVAL_MS - BOSS_SHIFT_WARN_MS - 1)).toBe(
      null,
    );
    expect(brain.layer).toBe('ash');
  });

  test('warn then hop within one interval', () => {
    const brain = new BossShiftBrain();
    const warn = brain.tick(BOSS_SHIFT_INTERVAL_MS - BOSS_SHIFT_WARN_MS);
    expect(warn).toEqual({ phase: 'warn', nextLayer: 'shadow' });
    expect(brain.layer).toBe('ash');

    // Still inside the warn window — no second warn, no hop yet.
    expect(brain.tick(BOSS_SHIFT_WARN_MS - 1)).toBe(null);

    const hop = brain.tick(1);
    expect(hop).toEqual({ phase: 'hop', layer: 'shadow' });
    expect(brain.layer).toBe('shadow');
  });

  test('toggles layer each full interval', () => {
    const brain = new BossShiftBrain();
    brain.tick(BOSS_SHIFT_INTERVAL_MS - BOSS_SHIFT_WARN_MS);
    expect(brain.tick(BOSS_SHIFT_WARN_MS)?.phase).toBe('hop');
    expect(brain.layer).toBe('shadow');

    brain.tick(BOSS_SHIFT_INTERVAL_MS - BOSS_SHIFT_WARN_MS);
    expect(brain.tick(BOSS_SHIFT_WARN_MS)).toEqual({
      phase: 'hop',
      layer: 'ash',
    });
    expect(brain.layer).toBe('ash');
  });

  test('reset returns to ash and clears warn state', () => {
    const brain = new BossShiftBrain();
    brain.tick(BOSS_SHIFT_INTERVAL_MS - BOSS_SHIFT_WARN_MS);
    brain.reset();
    expect(brain.layer).toBe('ash');
    expect(brain.tick(BOSS_SHIFT_INTERVAL_MS - BOSS_SHIFT_WARN_MS - 10)).toBe(
      null,
    );
    const warn = brain.tick(10);
    expect(warn?.phase).toBe('warn');
    expect(warn && warn.phase === 'warn' ? warn.nextLayer : null).toBe(
      'shadow',
    );
  });

  test('one-shot tick across the full interval still warns then hops', () => {
    const brain = new BossShiftBrain();
    // Large dt that crosses both thresholds in one call — warn first.
    const first = brain.tick(BOSS_SHIFT_INTERVAL_MS);
    expect(first).toEqual({ phase: 'warn', nextLayer: 'shadow' });
    const second = brain.tick(0);
    // elapsed already past interval; next tick with 0 still past → hop
    expect(second).toEqual({ phase: 'hop', layer: 'shadow' });
  });
});
