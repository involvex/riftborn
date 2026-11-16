import Phaser from 'phaser';
import { depthFromWorld, worldToScreen } from '../core/IsoMath';
import type { LootTier } from '../types/game';

/** World chest — open with E for gold, mats, and gear. */
export class LootChest {
  readonly id: string;
  readonly worldX: number;
  readonly worldY: number;
  readonly lootTier: LootTier;
  looted = false;
  readonly body: Phaser.GameObjects.Container;
  private readonly lid: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly scene: Phaser.Scene;
  private readonly isBoss: boolean;

  constructor(
    scene: Phaser.Scene,
    id: string,
    worldX: number,
    worldY: number,
    lootTier: LootTier = 2,
  ) {
    this.scene = scene;
    this.id = id;
    this.worldX = worldX;
    this.worldY = worldY;
    this.lootTier = lootTier;
    this.isBoss = lootTier >= 4 || id.includes('boss');

    this.lid = scene.add.graphics();
    this.drawClosed();
    this.label = scene.add
      .text(
        0,
        this.isBoss ? -36 : -28,
        this.isBoss ? 'Boss Chest · E' : 'Chest · E',
        {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: this.isBoss ? '11px' : '10px',
          color: this.isBoss ? '#ffd080' : '#e0c890',
          stroke: '#0a0c10',
          strokeThickness: 3,
        },
      )
      .setOrigin(0.5);
    this.body = scene.add.container(0, 0, [this.lid, this.label]);
    if (this.isBoss) {
      this.body.setScale(1.12);
      scene.tweens.add({
        targets: this.label,
        alpha: { from: 0.65, to: 1 },
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    this.syncScreen();
  }

  get isBossChest(): boolean {
    return this.isBoss;
  }

  private drawClosed(): void {
    this.lid.clear();
    if (this.isBoss) {
      this.lid.fillStyle(0x000000, 0.45);
      this.lid.fillEllipse(0, 8, 40, 14);
      this.lid.fillStyle(0x6a4820, 1);
      this.lid.fillRoundedRect(-16, -14, 32, 22, 4);
      this.lid.fillStyle(0xffc050, 1);
      this.lid.fillRect(-3, -6, 6, 8);
      this.lid.lineStyle(2, 0xffe090, 0.95);
      this.lid.strokeRoundedRect(-16, -14, 32, 22, 4);
      this.lid.lineStyle(1.5, 0xffd070, 0.7);
      this.lid.strokeEllipse(0, 6, 36, 12);
      return;
    }
    this.lid.fillStyle(0x000000, 0.35);
    this.lid.fillEllipse(0, 6, 28, 10);
    this.lid.fillStyle(0x8a6230, 1);
    this.lid.fillRoundedRect(-12, -10, 24, 16, 3);
    this.lid.fillStyle(0xc4a040, 1);
    this.lid.fillRect(-2, -4, 4, 6);
    this.lid.lineStyle(1, 0x3a2810, 0.9);
    this.lid.strokeRoundedRect(-12, -10, 24, 16, 3);
  }

  private drawOpen(): void {
    this.lid.clear();
    if (this.isBoss) {
      this.lid.fillStyle(0x000000, 0.3);
      this.lid.fillEllipse(0, 8, 40, 14);
      this.lid.fillStyle(0x4a3018, 1);
      this.lid.fillRoundedRect(-16, -4, 32, 14, 3);
      this.lid.fillStyle(0xffc050, 0.85);
      this.lid.fillRect(-10, -2, 20, 5);
      this.lid.lineStyle(1.5, 0x2a1c0c, 0.75);
      this.lid.strokeRoundedRect(-16, -4, 32, 14, 3);
      return;
    }
    this.lid.fillStyle(0x000000, 0.25);
    this.lid.fillEllipse(0, 6, 28, 10);
    this.lid.fillStyle(0x5a4020, 1);
    this.lid.fillRoundedRect(-12, -4, 24, 10, 2);
    this.lid.fillStyle(0x3a2810, 0.9);
    this.lid.fillRect(-8, -2, 16, 4);
    this.lid.lineStyle(1, 0x2a1c0c, 0.7);
    this.lid.strokeRoundedRect(-12, -4, 24, 10, 2);
  }

  syncScreen(): void {
    const { screenX, screenY } = worldToScreen(this.worldX, this.worldY);
    this.body.setPosition(screenX, screenY);
    this.body.setDepth(depthFromWorld(this.worldX, this.worldY) + 2);
  }

  markLooted(): void {
    this.looted = true;
    this.drawOpen();
    this.label.setText('Empty');
    this.label.setColor('#6a7080');
    this.scene.tweens.killTweensOf(this.label);
    this.label.setAlpha(1);
  }

  /** Short pop when the lid opens (boss chests punch harder). */
  playOpenPop(): void {
    const peak = this.isBoss ? 1.28 : 1.12;
    this.scene.tweens.killTweensOf(this.body);
    this.body.setScale(this.isBoss ? 1.12 : 1);
    this.scene.tweens.add({
      targets: this.body,
      scaleX: peak,
      scaleY: peak,
      duration: this.isBoss ? 160 : 110,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  destroy(): void {
    this.body.destroy(true);
  }
}
