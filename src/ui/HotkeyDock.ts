import Phaser from 'phaser';
import { formatHotkey } from '../core/Hotkeys';
import type { HotkeyAction } from '../core/SettingsStore';

type DockEntry = {
  action: HotkeyAction | 'menu';
  symbol: string;
  label: string;
};

const ENTRIES: DockEntry[] = [
  { action: 'inventory', symbol: '▣', label: 'bag' },
  { action: 'character', symbol: '◉', label: 'char' },
  { action: 'skills', symbol: '✦', label: 'skills' },
  { action: 'map', symbol: '◫', label: 'map' },
  { action: 'portal', symbol: '◈', label: 'rift' },
  { action: 'town', symbol: '⌂', label: 'town' },
  { action: 'menu', symbol: '☰', label: 'menu' },
];

/**
 * Bottom-left hotkey reminder chips with clear symbols.
 */
export class HotkeyDock {
  readonly root: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly chips: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(10_000);
    this.chips = scene.add.container(0, 0);
    this.root.add(this.chips);
    this.refresh();
    this.layout();
  }

  setVisible(v: boolean): void {
    this.root.setVisible(v);
  }

  layout(): void {
    const h = this.scene.scale.height;
    this.root.setPosition(16, h - 52);
  }

  refresh(): void {
    this.chips.removeAll(true);
    const narrow = this.scene.scale.width < 720;
    const gap = narrow ? 4 : 6;
    let x = 0;
    let y = 0;
    const rowBreak = narrow ? 4 : 99;

    ENTRIES.forEach((e, i) => {
      if (i === rowBreak) {
        x = 0;
        y = 22;
      }
      const key =
        e.action === 'menu' ? formatHotkey('menu') : formatHotkey(e.action);
      const chip = this.makeChip(x, y, key, e.symbol, e.label);
      this.chips.add(chip);
      x += chip.getData('w') as number;
      x += gap;
    });
  }

  private makeChip(
    x: number,
    y: number,
    key: string,
    symbol: string,
    label: string,
  ): Phaser.GameObjects.Container {
    const text = this.scene.add
      .text(0, 0, `${symbol} [${key}] ${label}`, {
        fontFamily: 'Segoe UI, Consolas, monospace',
        fontSize: '11px',
        color: '#c8d0d8',
        backgroundColor: '#121820cc',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0, 0.5);
    const w = text.width + 2;
    const c = this.scene.add.container(x, y, [text]);
    c.setData('w', w);
    return c;
  }
}
