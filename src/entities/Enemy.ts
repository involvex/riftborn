import Phaser from 'phaser';
import { depthFromWorld, worldDistance, worldToScreen } from '../core/IsoMath';
import {
  enemySpriteKey,
  ensureGameSprites,
  isPaintedSprite,
} from '../render/SpriteAtlas';
import type { EnemyDef } from '../types/game';
import enemiesData from '../data/enemies.json';

const enemies = enemiesData as Record<string, EnemyDef>;

export type AiState = 'patrol' | 'chase' | 'attack';

export class Enemy {
  readonly id: string;
  readonly def: EnemyDef;
  worldX: number;
  worldY: number;
  hp: number;
  maxHp: number;
  state: AiState = 'patrol';
  attackTimer = 0;
  alive = true;
  readonly body: Phaser.GameObjects.Container;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly bar: Phaser.GameObjects.Graphics;
  private patrolAngle: number;
  private readonly homeX: number;
  private readonly homeY: number;
  private readonly textureKey: string;
  private animKind: 'idle' | 'walk' | 'attack' = 'idle';
  maxBound = 35;

  constructor(
    scene: Phaser.Scene,
    id: string,
    defId: string,
    worldX: number,
    worldY: number,
  ) {
    ensureGameSprites(scene);
    this.id = id;
    this.def = enemies[defId] ?? enemies.shade;
    this.worldX = worldX;
    this.worldY = worldY;
    this.homeX = worldX;
    this.homeY = worldY;
    this.maxHp = this.def.hp;
    this.hp = this.maxHp;
    this.patrolAngle = Math.random() * Math.PI * 2;
    this.textureKey = enemySpriteKey(this.def.id);
    this.sprite = scene.add.sprite(0, -2, this.textureKey, 0);
    this.sprite.setOrigin(0.5, 0.82);
    const painted = isPaintedSprite(this.textureKey);
    const scale = painted
      ? this.def.isElite
        ? 0.62
        : 0.48
      : this.def.isElite
        ? 1.55
        : 1.2;
    this.sprite.setScale(scale);
    if (this.def.isElite && !painted) this.sprite.setTint(0xa0d8ff);
    this.bar = scene.add.graphics();
    this.body = scene.add.container(0, 0, [this.sprite, this.bar]);
    this.playAnim('idle');
    this.redrawBar();
    this.syncScreen();
  }

  redraw(): void {
    this.redrawBar();
  }

  private redrawBar(): void {
    this.bar.clear();
    if (!this.alive) return;
    const w = Math.max(28, this.def.radius * 2.2);
    const ratio = this.hp / this.maxHp;
    const y = -this.def.radius - 22;
    this.bar.fillStyle(0x1a1a1a, 0.85);
    this.bar.fillRect(-w / 2, y, w, 4);
    this.bar.fillStyle(0xd94a4a, 1);
    this.bar.fillRect(-w / 2, y, w * ratio, 4);
  }

  syncScreen(): void {
    const { screenX, screenY } = worldToScreen(this.worldX, this.worldY);
    this.body.setPosition(screenX, screenY);
    this.body.setDepth(depthFromWorld(this.worldX, this.worldY));
  }

  update(
    dt: number,
    playerX: number,
    playerY: number,
  ): { hitPlayer: boolean; damage: number } {
    if (!this.alive) return { hitPlayer: false, damage: 0 };
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    const dist = worldDistance(
      { x: this.worldX, y: this.worldY },
      { x: playerX, y: playerY },
    );
    const aggro = this.def.isElite ? 7 : 5;
    if (dist < this.def.attackRange) {
      this.state = 'attack';
    } else if (dist < aggro) {
      this.state = 'chase';
    } else if (dist > aggro + 2) {
      this.state = 'patrol';
    }

    let hitPlayer = false;
    let damage = 0;

    if (this.state === 'patrol') {
      this.patrolAngle += dt * 0.6;
      const dx = Math.cos(this.patrolAngle);
      this.worldX += dx * this.def.speed * 0.35 * dt;
      this.worldY += Math.sin(this.patrolAngle) * this.def.speed * 0.35 * dt;
      this.sprite.setFlipX(dx < 0);
      const homeDist = worldDistance(
        { x: this.worldX, y: this.worldY },
        { x: this.homeX, y: this.homeY },
      );
      if (homeDist > 3) {
        this.worldX += (this.homeX - this.worldX) * dt;
        this.worldY += (this.homeY - this.worldY) * dt;
      }
      this.playAnim('walk');
    } else if (this.state === 'chase') {
      const dx = playerX - this.worldX;
      const dy = playerY - this.worldY;
      const len = Math.hypot(dx, dy) || 1;
      this.worldX += (dx / len) * this.def.speed * dt;
      this.worldY += (dy / len) * this.def.speed * dt;
      this.sprite.setFlipX(dx < 0);
      this.playAnim('walk');
    } else if (this.state === 'attack') {
      this.sprite.setFlipX(playerX < this.worldX);
      if (this.attackTimer <= 0) {
        hitPlayer = true;
        damage = this.def.damage;
        this.attackTimer = this.def.attackCooldown;
        this.playAnim('attack', true);
      } else if (this.animKind !== 'attack') {
        this.playAnim('idle');
      }
    }

    this.worldX = Phaser.Math.Clamp(this.worldX, 0.5, this.maxBound);
    this.worldY = Phaser.Math.Clamp(this.worldY, 0.5, this.maxBound);
    this.syncScreen();
    return { hitPlayer, damage };
  }

  private playAnim(kind: 'idle' | 'walk' | 'attack', force = false): void {
    if (!force && this.animKind === kind) return;
    if (kind !== 'attack' && this.animKind === 'attack' && !force) return;
    this.animKind = kind;
    this.sprite.play(`${this.textureKey}_${kind}`, true);
    if (kind === 'attack') {
      this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        this.animKind =
          this.state === 'chase' || this.state === 'patrol' ? 'walk' : 'idle';
        this.sprite.play(`${this.textureKey}_${this.animKind}`, true);
      });
    }
  }

  applyDamage(amount: number): boolean {
    if (!this.alive) return false;
    this.hp -= amount;
    this.redrawBar();
    this.sprite.setTint(0xffffff);
    this.sprite.scene.time.delayedCall(60, () => {
      if (!this.alive) return;
      this.sprite.clearTint();
      if (this.def.isElite && !isPaintedSprite(this.textureKey)) {
        this.sprite.setTint(0xa0d8ff);
      }
    });
    if (this.hp <= 0) {
      this.alive = false;
      this.body.setVisible(false);
      return true;
    }
    return false;
  }

  destroy(): void {
    this.body.destroy(true);
  }
}

export function getEnemyDef(id: string): EnemyDef {
  return enemies[id] ?? enemies.shade;
}
