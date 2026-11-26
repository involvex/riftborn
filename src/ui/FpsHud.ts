import Phaser from 'phaser';
import { uiFontGameSize, uiFontSize } from '../core/UiFont';
import { shouldShowTouchControls } from './TouchControls';
import { computeGameTouchLayout } from './TouchLayout';

/**
 * Corner FPS readout. Top-left under HP strip on phones so it isn't
 * buried under the stick.
 */
export class FpsHud {
  readonly root: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly label: Phaser.GameObjects.Text;
  private acc = 0;
  private frames = 0;
  private shown = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(10_050);
    const touch = shouldShowTouchControls();
    this.label = scene.add
      .text(0, 0, '— fps', {
        fontFamily: 'Consolas, monospace',
        fontSize: touch
          ? uiFontGameSize('fps', 'touch')
          : uiFontSize('fps', 'desktop'),
        color: '#8a9aaa',
        backgroundColor: '#0a0c10aa',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0, 0);
    this.root.add(this.label);
    this.layout();
  }

  layout(): void {
    const touch = shouldShowTouchControls();
    // Above the stick on touch — keeps FPS off set-chase / SHIFT lines.
    if (touch) {
      const m = computeGameTouchLayout(
        this.scene.scale.width,
        this.scene.scale.height,
      );
      this.label.setFontSize(uiFontGameSize('fps', 'touch'));
      this.label.setOrigin(0, 1);
      const stickTop = m.stick.y - m.stick.r;
      this.root.setPosition(
        m.stick.x - m.stick.r,
        Math.max(m.status.y + m.status.h + 8, stickTop - 6),
      );
    } else {
      this.label.setOrigin(0, 1);
      this.root.setPosition(10, this.scene.scale.height - 8);
    }
  }

  tick(deltaMs: number): void {
    this.acc += deltaMs;
    this.frames += 1;
    if (this.acc < 400) return;
    const fps = Math.round((this.frames * 1000) / this.acc);
    this.shown = fps;
    this.frames = 0;
    this.acc = 0;
    this.label.setText(`${fps} fps`);
    if (fps >= 55) this.label.setColor('#8ab4a0');
    else if (fps >= 40) this.label.setColor('#c4a574');
    else this.label.setColor('#c45c3a');
  }

  get fps(): number {
    return this.shown;
  }
}
