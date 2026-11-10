import { DEFAULT_HOTKEYS, type HotkeyAction } from './SettingsStore';

/** How the player reaches a keyboard action without a physical key. */
export type TouchPathKind =
  'pad' | 'chrome' | 'ability' | 'context-e' | 'inventory' | 'menu';

export type HotkeyTouchPath = {
  action: HotkeyAction;
  /** Human-readable route shown in the mobile audit. */
  path: string;
  kind: TouchPathKind;
};

/**
 * Source of truth: every HotkeyAction → touch affordance.
 * Unit test fails if any action is missing or empty.
 */
export const HOTKEY_TOUCH_PATHS: Record<HotkeyAction, HotkeyTouchPath> = {
  gather: {
    action: 'gather',
    path: 'E pad (context: Loot / Talk / Mine / …)',
    kind: 'context-e',
  },
  craft: {
    action: 'craft',
    path: 'E near Bram or Forge (label Craft)',
    kind: 'context-e',
  },
  character: {
    action: 'character',
    path: 'Chrome CHAR (☰ / minimap tray)',
    kind: 'chrome',
  },
  inventory: {
    action: 'inventory',
    path: 'Chrome BAG',
    kind: 'chrome',
  },
  skills: {
    action: 'skills',
    path: 'Chrome SKILL',
    kind: 'chrome',
  },
  skill1: {
    action: 'skill1',
    path: 'Right skill column slot 1',
    kind: 'ability',
  },
  skill2: {
    action: 'skill2',
    path: 'Right skill column slot 2',
    kind: 'ability',
  },
  skill3: {
    action: 'skill3',
    path: 'Right skill column slot 3',
    kind: 'ability',
  },
  skill4: {
    action: 'skill4',
    path: 'Right skill column slot 4',
    kind: 'ability',
  },
  portal: {
    action: 'portal',
    path: 'E near Obelisk / Exit (label Rift / Exit)',
    kind: 'context-e',
  },
  town: {
    action: 'town',
    path: 'Town ⌂ left of minimap (outside hub)',
    kind: 'pad',
  },
  dash: {
    action: 'dash',
    path: 'DASH pad',
    kind: 'pad',
  },
  coop: {
    action: 'coop',
    path: 'Pause menu → Co-op',
    kind: 'menu',
  },
  menu: {
    action: 'menu',
    path: 'Chrome ☰ (expand tray, then Pause)',
    kind: 'chrome',
  },
  equipTool: {
    action: 'equipTool',
    path: 'Inventory double-tap tool stack',
    kind: 'inventory',
  },
  map: {
    action: 'map',
    path: 'Chrome MAP / minimap',
    kind: 'chrome',
  },
  shift: {
    action: 'shift',
    path: 'SHIFT pad above DASH',
    kind: 'pad',
  },
};

export function touchPathFor(action: HotkeyAction): HotkeyTouchPath {
  return HOTKEY_TOUCH_PATHS[action];
}

/** Actions with no mapped path — must stay empty for the suite to pass. */
export function hotkeysMissingTouchPath(): HotkeyAction[] {
  const actions = Object.keys(DEFAULT_HOTKEYS) as HotkeyAction[];
  return actions.filter((a) => {
    const entry = HOTKEY_TOUCH_PATHS[a];
    return !entry || entry.path.trim().length === 0;
  });
}
