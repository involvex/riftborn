import Phaser from 'phaser';
import { formatHotkey } from '../core/Hotkeys';
import { audioBus } from '../core/AudioBus';
import { shouldShowTouchControls } from './TouchControls';

const STORAGE_KEY = 'riftborn.tutorial.v1';

export function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markTutorialSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // ignore quota / private mode
  }
}

function isSmokeBoot(): boolean {
  try {
    return new URLSearchParams(window.location.search).has('smoke');
  } catch {
    return false;
  }
}

/**
 * First-run control hints. Skipped for smoke boots and after dismiss.
 */
export class TutorialOverlay {
  readonly root: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  open = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(20_000)
      .setVisible(false);
  }

  /** Show once for new players (not smoke / touch-only sessions). */
  maybeShow(): void {
    if (isSmokeBoot() || hasSeenTutorial()) return;
    this.show();
  }

  show(): void {
    if (this.open) return;
    this.open = true;
    this.root.removeAll(true);
    const { width, height } = this.scene.scale;
    const panelW = Math.min(420, width - 32);
    const panelH = shouldShowTouchControls() ? 280 : 310;

    const dim = this.scene.add
      .rectangle(width / 2, height / 2, width, height, 0x05070a, 0.72)
      .setInteractive();
    dim.on('pointerup', () => this.dismiss());

    const bg = this.scene.add
      .rectangle(width / 2, height / 2, panelW, panelH, 0x121820, 0.97)
      .setStrokeStyle(2, 0xc4a574);

    const title = this.scene.add
      .text(width / 2, height / 2 - panelH / 2 + 28, 'Welcome to Riftborn', {
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        color: '#e8e4d8',
      })
      .setOrigin(0.5);

    const lines = shouldShowTouchControls()
      ? [
          'Stick — move',
          'ATK — attack · E — interact',
          'DASH — burst · 1/2/3 — skills',
          '',
          'Explore the hub, open a rift (R),',
          'fight, loot, return to town (B).',
        ]
      : [
          `WASD — move · LMB — attack`,
          `${formatHotkey('gather')} — interact / gather / chest`,
          `${formatHotkey('skill1')} / ${formatHotkey('skill2')} / ${formatHotkey('skill3')} — class skills`,
          `${formatHotkey('dash')} — dash · ${formatHotkey('portal')} — rift · ${formatHotkey('town')} — town`,
          `${formatHotkey('map')} map · ${formatHotkey('inventory')} bag · ${formatHotkey('character')} attrs`,
          '',
          'Loop: hub → wilderness / rift → loot → town.',
        ];

    const body = this.scene.add
      .text(width / 2, height / 2 - 18, lines.join('\n'), {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '14px',
        color: '#a8b8c8',
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5);

    const btn = this.scene.add
      .text(width / 2, height / 2 + panelH / 2 - 36, 'Got it', {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        color: '#0a0c10',
        backgroundColor: '#c4a574',
        padding: { x: 18, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    btn.on('pointerup', () => this.dismiss());

    this.root.add([dim, bg, title, body, btn]);
    this.root.setVisible(true);
  }

  dismiss(): void {
    if (!this.open) return;
    this.open = false;
    markTutorialSeen();
    audioBus.uiClick();
    this.root.setVisible(false);
    this.root.removeAll(true);
  }

  destroy(): void {
    this.root.destroy(true);
  }
}
