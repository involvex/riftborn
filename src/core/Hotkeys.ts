import Phaser from 'phaser';
import type { HotkeyAction } from './SettingsStore';
import { settingsStore } from './SettingsStore';

/** Map setting string → Phaser KeyCodes value. */
export function keyCodeFromSetting(name: string): number {
  const n = name.toUpperCase();
  if (n === 'SPACE' || n === ' ') return Phaser.Input.Keyboard.KeyCodes.SPACE;
  if (n === 'ESC' || n === 'ESCAPE') return Phaser.Input.Keyboard.KeyCodes.ESC;
  if (n === 'ONE' || n === '1') return Phaser.Input.Keyboard.KeyCodes.ONE;
  if (n === 'TWO' || n === '2') return Phaser.Input.Keyboard.KeyCodes.TWO;
  if (n === 'THREE' || n === '3') return Phaser.Input.Keyboard.KeyCodes.THREE;
  if (n === 'FOUR' || n === '4') return Phaser.Input.Keyboard.KeyCodes.FOUR;
  if (n === 'FIVE' || n === '5') return Phaser.Input.Keyboard.KeyCodes.FIVE;
  if (n === 'SIX' || n === '6') return Phaser.Input.Keyboard.KeyCodes.SIX;
  if (n === 'SEVEN' || n === '7') return Phaser.Input.Keyboard.KeyCodes.SEVEN;
  if (n === 'EIGHT' || n === '8') return Phaser.Input.Keyboard.KeyCodes.EIGHT;
  if (n === 'NINE' || n === '9') return Phaser.Input.Keyboard.KeyCodes.NINE;
  if (n.length === 1) {
    const code =
      Phaser.Input.Keyboard.KeyCodes[
        n as keyof typeof Phaser.Input.Keyboard.KeyCodes
      ];
    if (typeof code === 'number') return code;
  }
  return Phaser.Input.Keyboard.KeyCodes.ESC;
}

export function bindAction(
  keyboard: Phaser.Input.Keyboard.KeyboardPlugin,
  action: HotkeyAction,
): Phaser.Input.Keyboard.Key {
  const name = settingsStore.get().hotkeys[action];
  return keyboard.addKey(keyCodeFromSetting(name));
}

export function formatHotkey(action: HotkeyAction): string {
  const raw = settingsStore.get().hotkeys[action];
  if (raw === 'ONE') return '1';
  if (raw === 'TWO') return '2';
  if (raw === 'THREE') return '3';
  if (raw === 'SPACE') return 'Space';
  if (raw === 'ESC') return 'Esc';
  return raw;
}

export const HOTKEY_LABELS: Record<HotkeyAction, string> = {
  gather: 'Gather',
  craft: 'Craft / Bench',
  character: 'Character',
  inventory: 'Inventory',
  skills: 'Skill tree',
  skill1: 'Ability 1',
  skill2: 'Ability 2',
  skill3: 'Ability 3',
  portal: 'Rift portal',
  town: 'Return to town',
  dash: 'Dash',
  coop: 'Co-op',
  menu: 'Pause menu',
  equipTool: 'Equip tool',
  map: 'Map',
};
