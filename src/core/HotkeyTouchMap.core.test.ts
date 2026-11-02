import { describe, expect, test } from 'bun:test';
import { DEFAULT_HOTKEYS, type HotkeyAction } from './SettingsStore';
import {
  HOTKEY_TOUCH_PATHS,
  hotkeysMissingTouchPath,
  touchPathFor,
} from './HotkeyTouchMap';

describe('HotkeyTouchMap', () => {
  test('every HotkeyAction has a non-empty touch path', () => {
    const missing = hotkeysMissingTouchPath();
    expect(missing).toEqual([]);

    const actions = Object.keys(DEFAULT_HOTKEYS) as HotkeyAction[];
    for (const action of actions) {
      const entry = touchPathFor(action);
      expect(entry.action).toBe(action);
      expect(entry.path.trim().length).toBeGreaterThan(0);
      expect(HOTKEY_TOUCH_PATHS[action].path).toBe(entry.path);
    }
  });
});
