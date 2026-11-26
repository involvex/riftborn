import Phaser from 'phaser';
import { getAppliedRenderScale } from '../core/GraphicsQuality';
import { uiFontPx } from '../core/UiFont';
import { riftHudLabel } from '../systems/RiftGoalCopy';
import { MiniMap } from './MiniMap';
import { RIFT_PROGRESS_BASE, riftProgressLayout } from './RiftProgressLayout';
import { shouldShowTouchControls } from './TouchControls';
import { computeGameTouchLayout } from './TouchLayout';

export { riftProgressLayout } from './RiftProgressLayout';

/** Side progress bar for rift kill → boss → exit flow. */
export class RiftProgressHud {
  readonly root: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private barH: number = RIFT_PROGRESS_BASE.barH;
  private barW: number = RIFT_PROGRESS_BASE.barW;
  private lastPhase: 'fill' | 'boss' | 'exit' | null = null;
  private lastRatio = 0;

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
        fontSize: uiFontPx(
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
    const touch = shouldShowTouchControls();
    const s = getAppliedRenderScale();
    const mapClearance = MiniMap.displaySize(this.scene) + 24;
    let minimap: { x: number; y: number; w: number; h: number } | undefined;
    let atk: { x: number; y: number; r: number } | undefined;
    let act: { x: number; y: number; r: number } | undefined;
    if (touch) {
      const m = computeGameTouchLayout(
        this.scene.scale.width,
        this.scene.scale.height,
      );
      minimap = m.minimap;
      atk = m.atk;
      act = m.shift;
    }
    const L = riftProgressLayout({
      touch,
      renderScale: s,
      gameW: this.scene.scale.width,
      gameH: this.scene.scale.height,
      mapClearance,
      minimap,
      atk,
      act,
    });
    this.barW = L.barW;
    this.barH = L.barH;
    this.bg.setSize(L.barW, L.barH);
    this.fill.width = Math.max(2, L.barW - 2);
    this.fill.height = Math.max(2, (L.barH - 2) * this.lastRatio);
    this.label.setFontSize(L.labelFont);
    this.label.setPosition(
      touch ? -Math.round(10 * Math.min(1, Math.max(0.35, s))) : -18,
      -Math.round(L.barH * 0.5),
    );
    this.root.setPosition(L.x, L.y);
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
    this.lastRatio = phase === 'fill' ? ratio : 1;
    this.fill.height = Math.max(2, (this.barH - 2) * this.lastRatio);
    if (phase === 'fill') this.fill.setFillStyle(0xc62868, 1);
    else if (phase === 'boss') {
      this.fill.setFillStyle(0xff7043, 1);
    } else {
      this.fill.setFillStyle(0x4db6ff, 1);
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
