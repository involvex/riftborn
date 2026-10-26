import Phaser from 'phaser';
import {
  depthFromWorld,
  facingFromDelta,
  worldToScreen,
} from '../core/IsoMath';
import {
  ensureGameSprites,
  isPaintedSprite,
  playerSpriteKey,
} from '../render/SpriteAtlas';
import { gameState } from '../systems/GameState';

type AnimKind = 'idle' | 'walk' | 'attack';

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
  private readonly scene: Phaser.Scene;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly label: Phaser.GameObjects.Text;
  private readonly slash: Phaser.GameObjects.Graphics;
  /** +1 = screen-right (SE), -1 = screen-left (mirrored). */
  private facing: 1 | -1 = 1;
  private animKind: AnimKind = 'idle';
  private moving = false;
  private textureKey: string;
  private slashUntil = 0;

  constructor(scene: Phaser.Scene, worldX: number, worldY: number) {
    ensureGameSprites(scene);
    this.scene = scene;
    this.worldX = worldX;
    this.worldY = worldY;
    this.textureKey = playerSpriteKey(
      gameState.gender,
      gameState.progression.classId,
    );
    this.sprite = scene.add.sprite(0, -4, this.textureKey, 0);
    this.sprite.setOrigin(0.5, 0.88);
    this.applyScale();
    this.slash = scene.add.graphics();
    this.label = scene.add
      .text(0, -52, gameState.name, {
        fontFamily: 'Georgia, serif',
        fontSize: '12px',
        color: '#e8e4d8',
        stroke: '#0a0c10',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.body = scene.add.container(0, 0, [
      this.sprite,
      this.slash,
      this.label,
    ]);
    this.applyClassTint();
    this.applyFacing();
    this.playAnim('idle', true);
    this.syncScreen();
  }

  redraw(): void {
    const next = playerSpriteKey(
      gameState.gender,
      gameState.progression.classId,
    );
    if (next !== this.textureKey) {
      this.textureKey = next;
      this.sprite.setTexture(next);
      this.applyScale();
      this.playAnim(this.animKind, true);
    }
    this.label.setText(gameState.name);
    this.applyClassTint();
    this.applyFacing();
  }

  private applyScale(): void {
    this.sprite.setScale(isPaintedSprite(this.textureKey) ? 0.78 : 1.35);
  }

  private applyFacing(): void {
    this.sprite.setFlipX(this.facing < 0);
  }

  private applyClassTint(): void {
    if (isPaintedSprite(this.textureKey)) {
      this.sprite.clearTint();
      return;
    }
    const color = Phaser.Display.Color.HexStringToColor(
      gameState.progression.classDef().color,
    ).color;
    this.sprite.setTint(
      Phaser.Display.Color.GetColor(
        Math.min(255, ((color >> 16) & 0xff) + 40),
        Math.min(255, ((color >> 8) & 0xff) + 30),
        Math.min(255, (color & 0xff) + 20),
      ),
    );
  }

  syncScreen(): void {
    const { screenX, screenY } = worldToScreen(this.worldX, this.worldY);
    this.body.setPosition(screenX, screenY);
    this.body.setDepth(depthFromWorld(this.worldX, this.worldY));
  }

  move(dx: number, dy: number, dt: number): void {
    if (dx === 0 && dy === 0) {
      this.moving = false;
      if (this.animKind !== 'attack') this.playAnim('idle');
      return;
    }
    this.moving = true;
    this.facing = facingFromDelta(dx, dy);
    this.applyFacing();

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
    if (this.animKind !== 'attack') this.playAnim('walk');
    this.syncScreen();
  }

  /** +1 screen-right / -1 screen-left (dash skills). */
  getFacing(): number {
    return this.facing;
  }

  /** Face toward a world point (click-attack / skills). */
  faceToward(worldX: number, worldY: number): void {
    const dx = worldX - this.worldX;
    const dy = worldY - this.worldY;
    if (Math.abs(dx) + Math.abs(dy) < 0.05) return;
    this.facing = facingFromDelta(dx, dy);
    this.applyFacing();
  }

  playAttack(): void {
    this.playAnim('attack', true);
    this.showSlash();
    // Punch the sprite forward slightly so the swing reads in-world.
    const dir = this.facing;
    this.sprite.setScale(
      (isPaintedSprite(this.textureKey) ? 0.78 : 1.35) * 1.06,
    );
    this.sprite.x = dir * 5;
    this.scene.time.delayedCall(90, () => {
      this.applyScale();
      this.sprite.x = 0;
    });
  }

  private showSlash(): void {
    this.slash.clear();
    const dir = this.facing;
    const cls = gameState.progression.classId;
    const color = Phaser.Display.Color.HexStringToColor(
      gameState.progression.classDef().color,
    ).color;
    const ox = dir * 8;
    const oy = -12;
    if (cls === 'mage') {
      // Bolt-style radial burst
      this.slash.lineStyle(3, color, 0.9);
      this.slash.strokeCircle(ox + dir * 18, oy, 10);
      this.slash.lineStyle(2, 0xe8f0ff, 0.7);
      this.slash.beginPath();
      this.slash.moveTo(ox, oy);
      this.slash.lineTo(ox + dir * 34, oy - 4);
      this.slash.strokePath();
      this.slash.fillStyle(color, 0.35);
      this.slash.fillCircle(ox + dir * 30, oy - 2, 5);
    } else if (cls === 'mystic') {
      // Twin crescent
      this.slash.lineStyle(3, color, 0.85);
      this.slash.beginPath();
      this.slash.arc(ox, oy, 30, -1.2, 0.7, dir < 0);
      this.slash.strokePath();
      this.slash.lineStyle(2, 0xd0ffe0, 0.55);
      this.slash.beginPath();
      this.slash.arc(ox, oy + 2, 22, -1.0, 0.5, dir < 0);
      this.slash.strokePath();
    } else {
      // Warrior sword arc + tip flare
      this.slash.lineStyle(5, color, 0.55);
      this.slash.beginPath();
      this.slash.arc(ox, oy, 34, -1.25, 0.75, dir < 0);
      this.slash.strokePath();
      this.slash.lineStyle(3, 0xfff0d0, 0.9);
      this.slash.beginPath();
      this.slash.arc(ox, oy, 28, -1.1, 0.6, dir < 0);
      this.slash.strokePath();
      this.slash.fillStyle(0xffffff, 0.75);
      this.slash.fillCircle(ox + dir * 26, oy + 8, 3);
    }
    this.slashUntil = this.scene.time.now + 200;
  }

  private playAnim(kind: AnimKind, force = false): void {
    if (!force && this.animKind === kind) return;
    if (kind !== 'attack' && this.animKind === 'attack' && !force) return;
    this.animKind = kind;
    const key = `${this.textureKey}_${kind}`;
    this.sprite.play(key, true);
    if (kind === 'attack') {
      this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (this.animKind !== 'attack') return;
        this.animKind = this.moving ? 'walk' : 'idle';
        this.sprite.play(`${this.textureKey}_${this.animKind}`, true);
      });
    }
  }

  tick(dt: number): void {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.skillCooldown = Math.max(0, this.skillCooldown - dt);
    this.speed = 4.2 * gameState.progression.moveSpeedMult();
    if (this.slashUntil && this.scene.time.now > this.slashUntil) {
      this.slash.clear();
      this.slashUntil = 0;
    }
  }

  destroy(): void {
    this.body.destroy(true);
  }
}
