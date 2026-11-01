import Phaser from 'phaser';
import { depthFromWorld, worldToScreen } from '../core/IsoMath';
import {
  rarityCss,
  rarityGlowAlpha,
  rarityPhaser,
} from '../systems/RarityVisual';
import type { GearInstance } from '../types/game';

/** World gear drop — rarity glow, pop-in, click or E to pick up. */
export class GroundLoot {
  readonly id: string;
  readonly item: GearInstance;
  worldX: number;
  worldY: number;
  picked = false;
  readonly body: Phaser.GameObjects.Container;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly beam: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly scene: Phaser.Scene;

  constructor(
    scene: Phaser.Scene,
    id: string,
    worldX: number,
    worldY: number,
    item: GearInstance,
  ) {
    this.scene = scene;
    this.id = id;
    this.item = item;
    this.worldX = worldX;
    this.worldY = worldY;

    const color = rarityPhaser(item.rarity);
    const glow = rarityGlowAlpha(item.rarity);

    this.beam = scene.add.graphics();
    this.beam.fillStyle(color, glow * 0.35);
    this.beam.fillRect(-3, -52, 6, 48);
    this.beam.fillStyle(color, glow * 0.55);
    this.beam.fillRect(-1.5, -52, 3, 48);

    this.gfx = scene.add.graphics();
    this.drawJewel(color, glow);

    this.label = scene.add
      .text(0, -58, item.name, {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '11px',
        color: rarityCss(item.rarity),
        stroke: '#0a0c10',
        strokeThickness: 3,
        resolution: 2,
      })
      .setOrigin(0.5);

    this.body = scene.add.container(0, 0, [this.beam, this.gfx, this.label]);
    this.body.setScale(0.2);
    this.syncScreen();

    scene.tweens.add({
      targets: this.body,
      scaleX: 1,
      scaleY: 1,
      duration: 280,
      ease: 'Back.easeOut',
    });
    scene.tweens.add({
      targets: this.body,
      y: '-=10',
      duration: 180,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
    scene.tweens.add({
      targets: this.beam,
      alpha: { from: 0.45, to: 1 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private drawJewel(color: number, glow: number): void {
    this.gfx.clear();
    this.gfx.fillStyle(0x000000, 0.35);
    this.gfx.fillEllipse(0, 6, 22, 8);
    this.gfx.fillStyle(color, glow * 0.45);
    this.gfx.fillCircle(0, -6, 14);
    this.gfx.fillStyle(color, 1);
    this.gfx.fillCircle(0, -6, 8);
    this.gfx.lineStyle(2, 0xffffff, 0.55);
    this.gfx.strokeCircle(0, -6, 8);
    this.gfx.fillStyle(0xffffff, 0.7);
    this.gfx.fillCircle(-2.5, -9, 2);
  }

  syncScreen(): void {
    const { screenX, screenY } = worldToScreen(this.worldX, this.worldY);
    this.body.setPosition(screenX, screenY);
    this.body.setDepth(depthFromWorld(this.worldX, this.worldY) + 4);
  }

  /** True if camera-space point is near this drop jewel. */
  hitTest(screenX: number, screenY: number): boolean {
    if (this.picked) return false;
    const dx = screenX - this.body.x;
    const dy = screenY - this.body.y + 8;
    return Math.hypot(dx, dy) < 28;
  }

  playPickup(): void {
    this.picked = true;
    this.scene.tweens.killTweensOf(this.beam);
    this.scene.tweens.add({
      targets: this.body,
      scaleX: 0.15,
      scaleY: 0.15,
      alpha: 0,
      y: '-=28',
      duration: 180,
      ease: 'Quad.easeIn',
      onComplete: () => this.destroy(),
    });
  }

  destroy(): void {
    this.body.destroy(true);
  }
}
