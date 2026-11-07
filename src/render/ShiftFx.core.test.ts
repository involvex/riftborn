import { describe, expect, test } from 'bun:test';
import {
  SHIFT_WASH_MAX_ALPHA,
  ShiftFxTracker,
  shiftWashAlpha,
} from './ShiftFxLogic';

describe('shiftWashAlpha', () => {
  test('returns 0 at start and end', () => {
    expect(shiftWashAlpha(0, 300, 1)).toBe(0);
    expect(shiftWashAlpha(300, 300, 1)).toBe(0);
    expect(shiftWashAlpha(999, 300, 1)).toBe(0);
  });

  test('peaks mid-transition and stays within max', () => {
    const mid = shiftWashAlpha(150, 300, 1);
    expect(mid).toBeGreaterThan(0.3);
    expect(mid).toBeLessThanOrEqual(SHIFT_WASH_MAX_ALPHA);
  });

  test('scales with intensity and clamps', () => {
    const full = shiftWashAlpha(150, 300, 1);
    const half = shiftWashAlpha(150, 300, 0.5);
    expect(half).toBeCloseTo(full * 0.5, 5);
    expect(shiftWashAlpha(150, 300, 0)).toBe(0);
    expect(shiftWashAlpha(150, 300, 2)).toBeLessThanOrEqual(
      SHIFT_WASH_MAX_ALPHA,
    );
  });

  test('handles zero/invalid duration safely', () => {
    expect(shiftWashAlpha(0, 0, 1)).toBe(0);
    expect(shiftWashAlpha(10, -1, 1)).toBe(0);
  });
});

describe('ShiftFxTracker', () => {
  function handle() {
    let destroyed = false;
    return {
      destroy() {
        destroyed = true;
      },
      get destroyed() {
        return destroyed;
      },
    };
  }

  test('starts clear', () => {
    const t = new ShiftFxTracker();
    expect(t.isClear()).toBe(true);
    expect(t.activeCount()).toBe(0);
  });

  test('finish clears active overlay', () => {
    const t = new ShiftFxTracker();
    const h = handle();
    t.start(() => h);
    expect(t.activeCount()).toBe(1);
    t.finish(h);
    expect(t.isClear()).toBe(true);
    expect(t.activeCount()).toBe(0);
  });

  test('starting a new transition destroys the previous one', () => {
    const t = new ShiftFxTracker();
    const a = handle();
    const b = handle();
    t.start(() => a);
    t.start(() => b);
    expect(a.destroyed).toBe(true);
    expect(b.destroyed).toBe(false);
    expect(t.activeCount()).toBe(1);
  });

  test('repeated flashes leave no permanent overlay state', () => {
    const t = new ShiftFxTracker();
    const handles = Array.from({ length: 12 }, () => handle());
    for (const h of handles) t.start(() => h);
    // Only the last should remain active; all previous destroyed.
    for (let i = 0; i < handles.length - 1; i++) {
      expect(handles[i]!.destroyed).toBe(true);
    }
    expect(handles.at(-1)!.destroyed).toBe(false);
    t.cancelAll();
    expect(t.isClear()).toBe(true);
    expect(handles.every((h) => h.destroyed)).toBe(true);
  });

  test('cancelAll is safe when already clear', () => {
    const t = new ShiftFxTracker();
    t.cancelAll();
    expect(t.isClear()).toBe(true);
  });

  test('finish of stale handle does not clear current', () => {
    const t = new ShiftFxTracker();
    const a = handle();
    const b = handle();
    t.start(() => a);
    t.start(() => b);
    t.finish(a); // stale
    expect(b.destroyed).toBe(false);
    expect(t.activeCount()).toBe(1);
    t.finish(b);
    expect(t.isClear()).toBe(true);
  });
});
