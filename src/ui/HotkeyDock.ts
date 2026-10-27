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

/** Space reserved at bottom for the desktop ability strip. */
export const ABILITY_BAR_CLEARANCE = 78;

/**
 * Bottom-left hotkey reminder chips. Stays clear of the ability bar
 * and packs tighter on narrow windows.
 */
export class HotkeyDock {
  readonly root: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly chips: Phaser.GameObjects.Container;
  private rows = 1;

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
    const rowH = 20;
    const y =
      h -
      ABILITY_BAR_CLEARANCE -
      8 -
      (this.rows > 1 ? rowH * (this.rows - 1) : 0);
    this.root.setPosition(10, y);
  }

  refresh(): void {
    this.chips.removeAll(true);
    const w = this.scene.scale.width;
    const narrow = w < 900;
    const tiny = w < 700;
    // Keep chips in the left band so they never sit under center skills
    const maxBand = Math.max(160, Math.floor(w * (tiny ? 0.42 : 0.36)));
    const gap = tiny ? 3 : narrow ? 4 : 6;
    const perRow = tiny ? 3 : narrow ? 4 : 99;

    let x = 0;
    let y = 0;
    let row = 0;
    let col = 0;

    ENTRIES.forEach((e) => {
      if (col >= perRow || (col > 0 && x > maxBand - 40)) {
        x = 0;
        y += 20;
        row += 1;
        col = 0;
      }
      const key =
        e.action === 'menu' ? formatHotkey('menu') : formatHotkey(e.action);
      const chip = this.makeChip(x, y, key, e.symbol, e.label, tiny);
      this.chips.add(chip);
      x += (chip.getData('w') as number) + gap;
      col += 1;
    });
    this.rows = row + 1;
    this.layout();
  }

  private makeChip(
    x: number,
    y: number,
    key: string,
    symbol: string,
    label: string,
    tiny: boolean,
  ): Phaser.GameObjects.Container {
    const body = tiny ? `${symbol}${key}` : `${symbol} [${key}] ${label}`;
    const text = this.scene.add
      .text(0, 0, body, {
        fontFamily: 'Segoe UI, Consolas, monospace',
        fontSize: tiny ? '10px' : '11px',
        color: '#c8d0d8',
        backgroundColor: '#121820cc',
        padding: { x: tiny ? 4 : 6, y: tiny ? 2 : 3 },
      })
      .setOrigin(0, 0.5);
    const c = this.scene.add.container(x, y, [text]);
    c.setData('w', text.width + 2);
    return c;
  }
}
