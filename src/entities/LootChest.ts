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

  constructor(
    scene: Phaser.Scene,
    id: string,
    worldX: number,
    worldY: number,
    lootTier: LootTier = 2,
  ) {
    this.id = id;
    this.worldX = worldX;
    this.worldY = worldY;
    this.lootTier = lootTier;

    this.lid = scene.add.graphics();
    this.drawClosed();
    this.label = scene.add
      .text(0, -28, 'Chest · E', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '10px',
        color: '#e0c890',
        stroke: '#0a0c10',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.body = scene.add.container(0, 0, [this.lid, this.label]);
    this.syncScreen();
  }

  private drawClosed(): void {
    this.lid.clear();
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
  }

  destroy(): void {
    this.body.destroy(true);
  }
}
