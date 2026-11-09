import { describe, expect, it } from 'bun:test';
import { canRepeatBasicAttack, shouldStartDesktopAttack } from './AttackHold';

describe('canRepeatBasicAttack', () => {
  it('repeats only while held and not ui-blocked', () => {
    expect(canRepeatBasicAttack({ held: true, uiBlocked: false })).toBe(true);
    expect(canRepeatBasicAttack({ held: false, uiBlocked: false })).toBe(false);
    expect(canRepeatBasicAttack({ held: true, uiBlocked: true })).toBe(false);
    expect(canRepeatBasicAttack({ held: false, uiBlocked: true })).toBe(false);
  });
});

describe('shouldStartDesktopAttack', () => {
  it('requires desktop LMB not over UI', () => {
    expect(
      shouldStartDesktopAttack({
        touchControlsActive: false,
        leftButtonDown: true,
        pointerOverUi: false,
      }),
    ).toBe(true);
  });

  it('blocks when touch controls own input', () => {
    expect(
      shouldStartDesktopAttack({
        touchControlsActive: true,
        leftButtonDown: true,
        pointerOverUi: false,
      }),
    ).toBe(false);
  });

  it('blocks non-left or UI hits', () => {
    expect(
      shouldStartDesktopAttack({
        touchControlsActive: false,
        leftButtonDown: false,
        pointerOverUi: false,
      }),
    ).toBe(false);
    expect(
      shouldStartDesktopAttack({
        touchControlsActive: false,
        leftButtonDown: true,
        pointerOverUi: true,
      }),
    ).toBe(false);
  });
});
