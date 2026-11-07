import Phaser from 'phaser';
import { uiFontSize } from '../core/UiFont';
import {
  firstSessionHintText,
  type FirstSessionStep,
} from '../systems/FirstSession';
import { shouldShowTouchControls } from './TouchControls';

/** Non-modal, non-blocking first-session guidance banner. */
export class FirstSessionHint {
  readonly root: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text;
  private _step: FirstSessionStep | null = null;

  constructor(scene: Phaser.Scene) {
    const touch = shouldShowTouchControls();
    const profile = touch ? 'touch' : 'desktop';
    this.text = scene.add
      .text(0, 0, '', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: uiFontSize('label', profile),
        color: '#e8e4d8',
        align: 'center',
        resolution: 2,
        stroke: '#0a0c10',
        strokeThickness: 3,
        padding: { x: 14, y: 6 },
      })
      .setOrigin(0.5);
    this.bg = scene.add
      .rectangle(0, 0, 10, 10, 0x121820, 0.88)
      .setStrokeStyle(1, 0xc4a574, 0.75)
      .setOrigin(0.5);
    this.root = scene.add
      .container(0, 0, [this.bg, this.text])
      .setScrollFactor(0)
      .setDepth(9_998)
      .setVisible(false);
    this.layout();
  }

  get step(): FirstSessionStep | null {
    return this._step;
  }

  setStep(step: FirstSessionStep | null): void {
    this._step = step;
    if (!step) {
      this.root.setVisible(false);
      return;
    }
    const touch = shouldShowTouchControls();
    this.text.setText(firstSessionHintText(step, touch));
    this.bg.setSize(this.text.width + 4, this.text.height + 2);
    this.layout();
    this.root.setVisible(true);
  }

  layout(): void {
    const scene = this.root.scene;
    const touch = shouldShowTouchControls();
    // Upper-middle, below HP/XP/bounty; avoids minimap/stick/ATK/skills.
    const y = touch ? 86 : 94;
    this.root.setPosition(Math.round(scene.scale.width / 2), y);
  }

  destroy(): void {
    this.root.destroy(true);
  }
}
