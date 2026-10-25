import Phaser from 'phaser';
import { depthFromWorld, worldToScreen } from '../core/IsoMath';
import { gameState } from '../systems/GameState';

export class Player {
  readonly body: Phaser.GameObjects.Container;
  worldX: number;
  worldY: number;
  speed = 4.2;
  attackCooldown = 0;
  skillCooldown = 0;
  readonly gatherRange = 1.4;
  maxX = 23.5;
  maxY = 23.5;
  walkCheck: ((x: number, y: number) => boolean) | null = null;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, worldX: number, worldY: number) {
    this.worldX = worldX;
    this.worldY = worldY;
    this.gfx = scene.add.graphics();
    this.label = scene.add
      .text(0, -28, gameState.name, {
        fontFamily: 'Georgia, serif',
        fontSize: '12px',
        color: '#e8e4d8',
      })
      .setOrigin(0.5);
    this.body = scene.add.container(0, 0, [this.gfx, this.label]);
    this.redraw();
    this.syncScreen();
  }

  private redraw(): void {
    this.gfx.clear();
    this.gfx.fillStyle(0xc4a574, 1);
    this.gfx.fillEllipse(0, 0, 22, 14);
    this.gfx.fillStyle(0xd8c4a0, 1);
    this.gfx.fillCircle(0, -10, 8);
    this.gfx.lineStyle(2, 0x2a2018, 1);
    this.gfx.strokeEllipse(0, 0, 22, 14);
  }

  syncScreen(): void {
    const { screenX, screenY } = worldToScreen(this.worldX, this.worldY);
    this.body.setPosition(screenX, screenY);
    this.body.setDepth(depthFromWorld(this.worldX, this.worldY));
  }

  move(dx: number, dy: number, dt: number): void {
    if (dx === 0 && dy === 0) return;
    const len = Math.hypot(dx, dy) || 1;
    const nx = this.worldX + (dx / len) * this.speed * dt;
    const ny = this.worldY + (dy / len) * this.speed * dt;
    const tryX = Phaser.Math.Clamp(nx, 0.5, this.maxX);
    const tryY = Phaser.Math.Clamp(ny, 0.5, this.maxY);

    if (!this.walkCheck || this.walkCheck(tryX, this.worldY)) {
      this.worldX = tryX;
    }
    if (!this.walkCheck || this.walkCheck(this.worldX, tryY)) {
      this.worldY = tryY;
    }

    gameState.worldX = this.worldX;
    gameState.worldY = this.worldY;
    this.syncScreen();
  }

  tick(dt: number): void {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.skillCooldown = Math.max(0, this.skillCooldown - dt);
  }

  destroy(): void {
    this.body.destroy(true);
  }
}
