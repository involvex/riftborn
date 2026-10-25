import Phaser from 'phaser';
import { depthFromWorld, worldDistance, worldToScreen } from '../core/IsoMath';
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
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly bar: Phaser.GameObjects.Graphics;
  private patrolAngle: number;
  private readonly homeX: number;
  private readonly homeY: number;
  maxBound = 35;

  constructor(
    scene: Phaser.Scene,
    id: string,
    defId: string,
    worldX: number,
    worldY: number,
  ) {
    this.id = id;
    this.def = enemies[defId] ?? enemies.shade;
    this.worldX = worldX;
    this.worldY = worldY;
    this.homeX = worldX;
    this.homeY = worldY;
    this.maxHp = this.def.hp;
    this.hp = this.maxHp;
    this.patrolAngle = Math.random() * Math.PI * 2;
    this.gfx = scene.add.graphics();
    this.bar = scene.add.graphics();
    this.body = scene.add.container(0, 0, [this.gfx, this.bar]);
    this.redraw();
    this.syncScreen();
  }

  redraw(): void {
    this.gfx.clear();
    if (!this.alive) return;
    const color = Phaser.Display.Color.HexStringToColor(this.def.color).color;
    const r = this.def.radius;
    this.gfx.fillStyle(color, 1);
    this.gfx.fillEllipse(0, 0, r * 2, r * 1.2);
    if (this.def.isElite) {
      this.gfx.lineStyle(3, 0x6ec6ff, 1);
      this.gfx.strokeEllipse(0, 0, r * 2.4, r * 1.5);
    }
    this.bar.clear();
    const w = Math.max(24, r * 2);
    const ratio = this.hp / this.maxHp;
    this.bar.fillStyle(0x1a1a1a, 0.85);
    this.bar.fillRect(-w / 2, -r - 14, w, 4);
    this.bar.fillStyle(0xd94a4a, 1);
    this.bar.fillRect(-w / 2, -r - 14, w * ratio, 4);
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
      this.worldX += Math.cos(this.patrolAngle) * this.def.speed * 0.35 * dt;
      this.worldY += Math.sin(this.patrolAngle) * this.def.speed * 0.35 * dt;
      const homeDist = worldDistance(
        { x: this.worldX, y: this.worldY },
        { x: this.homeX, y: this.homeY },
      );
      if (homeDist > 3) {
        this.worldX += (this.homeX - this.worldX) * dt;
        this.worldY += (this.homeY - this.worldY) * dt;
      }
    } else if (this.state === 'chase') {
      const dx = playerX - this.worldX;
      const dy = playerY - this.worldY;
      const len = Math.hypot(dx, dy) || 1;
      this.worldX += (dx / len) * this.def.speed * dt;
      this.worldY += (dy / len) * this.def.speed * dt;
    } else if (this.state === 'attack' && this.attackTimer <= 0) {
      hitPlayer = true;
      damage = this.def.damage;
      this.attackTimer = this.def.attackCooldown;
    }

    this.worldX = Phaser.Math.Clamp(this.worldX, 0.5, this.maxBound);
    this.worldY = Phaser.Math.Clamp(this.worldY, 0.5, this.maxBound);
    this.syncScreen();
    return { hitPlayer, damage };
  }

  applyDamage(amount: number): boolean {
    if (!this.alive) return false;
    this.hp -= amount;
    this.redraw();
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
