import Phaser from 'phaser';
import { uiFontSize } from '../core/UiFont';
import { riftHudLabel } from '../systems/RiftGoalCopy';
import { MiniMap } from './MiniMap';
import { shouldShowTouchControls } from './TouchControls';

/** Side progress bar for rift kill → boss → exit flow. */
export class RiftProgressHud {
  readonly root: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private readonly barH = 160;
  private readonly barW = 14;
  private lastPhase: 'fill' | 'boss' | 'exit' | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(10_004);
    this.bg = scene.add
      .rectangle(0, 0, this.barW, this.barH, 0x1a1218, 0.92)
      .setOrigin(0.5, 1)
      .setStrokeStyle(1, 0x6a4060, 0.9);
    this.fill = scene.add
      .rectangle(0, 0, this.barW - 2, 0, 0xc62868, 1)
      .setOrigin(0.5, 1);
    this.label = scene.add
      .text(-18, -80, 'Rift', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: uiFontSize(
          'rift',
          shouldShowTouchControls() ? 'touch' : 'desktop',
        ),
        color: '#e8c0d0',
        align: 'right',
      })
      .setOrigin(1, 0.5);
    this.root.add([this.bg, this.fill, this.label]);
    this.root.setVisible(false);
    this.layout();
  }

  layout(): void {
    // Sit below the top-right minimap so frames don't overlap
    const mapClearance = MiniMap.displaySize(this.scene) + 24;
    this.root.setPosition(
      this.scene.scale.width - 28,
      Math.max(mapClearance + this.barH / 2, this.scene.scale.height / 2 + 40),
    );
  }

  show(): void {
    this.root.setVisible(true);
    this.layout();
  }

  hide(): void {
    this.root.setVisible(false);
  }

  setProgress(
    kills: number,
    goal: number,
    phase: 'fill' | 'boss' | 'exit',
    depth = 1,
    modName?: string,
    ruleName?: string,
    biomeName?: string,
    championAlive = false,
  ): void {
    const ratio = goal <= 0 ? 1 : Phaser.Math.Clamp(kills / goal, 0, 1);
    this.fill.height = Math.max(2, (this.barH - 2) * ratio);
    if (phase === 'fill') this.fill.setFillStyle(0xc62868, 1);
    else if (phase === 'boss') {
      this.fill.setFillStyle(0xff7043, 1);
      this.fill.height = this.barH - 2;
    } else {
      this.fill.setFillStyle(0x4db6ff, 1);
      this.fill.height = this.barH - 2;
    }
    this.label.setText(
      riftHudLabel({
        biomeName,
        depth,
        kills,
        goal,
        phase,
        modName,
        ruleName,
        championAlive,
      }),
    );
    if (phase !== this.lastPhase) {
      this.lastPhase = phase;
      this.pulsePhase();
    }
  }

  /** Short scale punch when Kill → Boss → Exit advances. */
  private pulsePhase(): void {
    this.scene.tweens.killTweensOf(this.root);
    this.root.setScale(1);
    this.scene.tweens.add({
      targets: this.root,
      scaleX: 1.14,
      scaleY: 1.14,
      duration: 140,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }
}
