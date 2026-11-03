import { describe, expect, test } from 'bun:test';
import {
  TOUCH_FONT_MIN_PX,
  UI_FONT_ROLES,
  uiFontPx,
  type UiFontRole,
} from './UiFont';

describe('uiFontPx', () => {
  test('every touch role is at least TOUCH_FONT_MIN_PX (~12 CSS-px)', () => {
    expect(TOUCH_FONT_MIN_PX).toBeGreaterThanOrEqual(12);
    for (const role of UI_FONT_ROLES) {
      const px = uiFontPx(role, 'touch');
      expect(px, `touch/${role}`).toBeGreaterThanOrEqual(TOUCH_FONT_MIN_PX);
    }
  });

  test('desktop roles stay readable without forced touch floor', () => {
    for (const role of UI_FONT_ROLES) {
      const px = uiFontPx(role, 'desktop');
      expect(px, `desktop/${role}`).toBeGreaterThanOrEqual(9);
      expect(px, `desktop/${role} upper`).toBeLessThanOrEqual(22);
    }
  });

  test('touch bump raises small HUD captions vs desktop', () => {
    const roles: UiFontRole[] = ['caption', 'slot', 'fps', 'rift'];
    for (const role of roles) {
      expect(uiFontPx(role, 'touch')).toBeGreaterThanOrEqual(
        uiFontPx(role, 'desktop'),
      );
    }
  });
});
