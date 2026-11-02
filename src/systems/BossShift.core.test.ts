import { describe, expect, test } from 'bun:test';
import { BossShiftBrain, BOSS_SHIFT_INTERVAL_MS } from './BossShift';

describe('BossShiftBrain', () => {
  test('starts on ash and does not shift before interval', () => {
    const brain = new BossShiftBrain();
    expect(brain.layer).toBe('ash');
    expect(brain.tick(BOSS_SHIFT_INTERVAL_MS - 1)).toBe(null);
    expect(brain.layer).toBe('ash');
  });

  test('toggles layer each interval', () => {
    const brain = new BossShiftBrain();
    expect(brain.tick(BOSS_SHIFT_INTERVAL_MS)).toBe('shadow');
    expect(brain.layer).toBe('shadow');
    expect(brain.tick(BOSS_SHIFT_INTERVAL_MS)).toBe('ash');
    expect(brain.layer).toBe('ash');
  });

  test('reset returns to ash and clears timer', () => {
    const brain = new BossShiftBrain();
    brain.tick(BOSS_SHIFT_INTERVAL_MS);
    brain.reset();
    expect(brain.layer).toBe('ash');
    expect(brain.tick(BOSS_SHIFT_INTERVAL_MS - 10)).toBe(null);
  });
});
