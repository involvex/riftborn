import Phaser from 'phaser';
import { formatHotkey } from '../core/Hotkeys';
import { uiFontGameSize, uiFontSize } from '../core/UiFont';
import { getAppliedRenderScale } from '../core/GraphicsQuality';
import { computeGameTouchLayout } from './TouchLayout';
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
        fontSize: touch
          ? uiFontGameSize('label', 'touch')
          : uiFontSize('label', profile),
        color: '#e8e4d8',
        align: 'center',
        resolution: 2,
        stroke: '#0a0c10',
        strokeThickness: touch ? 2 : 3,
        padding: {
          x: touch ? Math.max(6, Math.round(10 * getAppliedRenderScale())) : 14,
          y: touch ? Math.max(2, Math.round(4 * getAppliedRenderScale())) : 6,
        },
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
    scene.scale.on('resize', () => this.layout());
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
    const shiftLabel = touch ? 'SHIFT' : formatHotkey('shift');
    const portalLabel = formatHotkey('portal');
    this.text.setText(
      firstSessionHintText(step, touch, shiftLabel, portalLabel),
    );
    this.bg.setSize(this.text.width + 4, this.text.height + 2);
    this.layout();
    this.root.setVisible(true);
  }

  layout(): void {
    const scene = this.root.scene;
    const touch = shouldShowTouchControls();
    if (!touch) {
      this.root.setPosition(Math.round(scene.scale.width / 2), 94);
      return;
    }
    const s = Math.min(1, Math.max(0.35, getAppliedRenderScale() || 1));
    this.text.setFontSize(uiFontGameSize('label', 'touch'));
    this.bg.setSize(this.text.width + 4, this.text.height + 2);
    const m = computeGameTouchLayout(scene.scale.width, scene.scale.height);
    this.root.setPosition(
      Math.round(scene.scale.width / 2),
      m.status.y + m.status.h + Math.round(8 * s),
    );
  }

  destroy(): void {
    this.root.destroy(true);
  }
}
