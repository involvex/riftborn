import Phaser from 'phaser';
import {
  applyFlipFacing,
  depthFromWorld,
  spriteFacingFromDelta,
  worldDistance,
  worldToScreen,
  type FacingSign,
} from '../core/IsoMath';
import { figureDrawScale, figureEliteDrawScale } from '../core/FigureScale';
import {
  enemySpriteKey,
  ensureGameSprites,
  isPaintedSprite,
} from '../render/SpriteAtlas';
import type { EnemyDef } from '../types/game';
import enemiesData from '../data/enemies.json';
import {
  enemyActiveOnLayer,
  enemyShiftLayer,
  type EnemyShiftLayer,
  type ShiftLayerId,
} from '../data/shiftLayers';

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
  /** Layer this foe exists on ('both' = always solid). */
  shiftLayer: EnemyShiftLayer;
  /** True when player is on another layer — ghosted. */
  private ghosted = false;
  readonly body: Phaser.GameObjects.Container;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly bar: Phaser.GameObjects.Graphics;
  private patrolAngle: number;
  private readonly homeX: number;
  private readonly homeY: number;
  private readonly textureKey: string;
  private animKind: 'idle' | 'walk' | 'attack' | 'hit' | 'death' = 'idle';
  maxBound = 48;
  private slowMult = 1;
  private slowTimer = 0;
  private stunTimer = 0;
  /** Runtime elite (random pack upgrade), distinct from boss defs. */
  readonly elitePack: boolean;
  /** Boss flag for rift progress / exit portal. */
  readonly isBoss: boolean;
  /** Multiplier from player level / rift depth (HP + damage). */
  private readonly levelMult: number;
  private readonly modDmgMult: number;
  private lodPhase = 0;
  /** Bumps so stale attack ANIMATION_COMPLETE handlers no-op. */
  private attackGen = 0;
  /** Sticky 2-dir facing (avoids moonwalk on iso N/S). */
  private facing: FacingSign = 1;

  constructor(
    scene: Phaser.Scene,
    id: string,
    defId: string,
    worldX: number,
    worldY: number,
    opts: {
      elitePack?: boolean;
      boss?: boolean;
      levelScale?: number;
      hpMult?: number;
      dmgMult?: number;
    } = {},
  ) {
    ensureGameSprites(scene);
    this.id = id;
    this.def = enemies[defId] ?? enemies.shade;
    this.shiftLayer = enemyShiftLayer(this.def.id);
    this.worldX = worldX;
    this.worldY = worldY;
    this.homeX = worldX;
    this.homeY = worldY;
    this.elitePack = !!opts.elitePack && !this.def.isElite;
    this.isBoss = !!opts.boss || this.def.isElite;
    this.levelMult = 1 + Math.max(0, (opts.levelScale ?? 1) - 1) * 0.12;
    this.modDmgMult = opts.dmgMult ?? 1;
    let hpMult = this.levelMult * (opts.hpMult ?? 1);
    if (this.elitePack) hpMult *= 2.1;
    if (opts.boss) hpMult *= 1.35;
    this.maxHp = Math.max(1, Math.floor(this.def.hp * hpMult));
    this.hp = this.maxHp;
    this.patrolAngle = Math.random() * Math.PI * 2;
    this.textureKey = enemySpriteKey(this.def.id);
    this.sprite = scene.add.sprite(0, -2, this.textureKey, 0);
    this.sprite.setOrigin(0.5, 0.88);
    const drawScale =
      this.isBoss || this.def.isElite || this.elitePack
        ? figureEliteDrawScale()
        : figureDrawScale();
    this.sprite.setScale(drawScale);
    this.applyBaseTint();
    this.bar = scene.add.graphics();
    this.body = scene.add.container(0, 0, [this.sprite, this.bar]);
    this.playAnim('idle');
    this.redrawBar();
    this.syncScreen();
  }

  get awardsEliteLoot(): boolean {
    return this.def.isElite || this.elitePack || this.isBoss;
  }

  get isGhosted(): boolean {
    return this.ghosted;
  }

  /** Boss / scripted foes lock to ash or shadow (not both). */
  setCombatLayer(layer: ShiftLayerId): void {
    this.shiftLayer = layer;
  }

  /** Sync ghost alpha when the player shifts layers. */
  syncShiftLayer(playerLayer: ShiftLayerId): void {
    const active = enemyActiveOnLayer(this.shiftLayer, playerLayer);
    this.ghosted = !active;
    this.body.setAlpha(this.ghosted ? 0.35 : 1);
    if (this.ghosted) this.bar.setAlpha(0.25);
    else this.bar.setAlpha(1);
  }

  private applyBaseTint(): void {
    const painted = isPaintedSprite(this.textureKey);
    if (this.def.id === 'ash_scamp') {
      this.sprite.setTint(0xb08a60);
    } else if (this.def.id === 'ash_scout') {
      this.sprite.setTint(0xd4a060);
    } else if (this.def.id === 'ash_bat') {
      // Red-eye bat sheet already reads aggressive; light violet punch
      this.sprite.setTint(0xc8a0ff);
    } else if (
      (this.def.isElite || this.elitePack || this.isBoss) &&
      !painted
    ) {
      this.sprite.setTint(this.isBoss ? 0x80c8ff : 0xa0d8ff);
    } else if (this.elitePack && painted) {
      this.sprite.setTint(0xa8d0ff);
    } else {
      this.sprite.clearTint();
    }
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

  applySlow(mult: number, duration: number): void {
    this.slowMult = Math.min(this.slowMult, Math.max(0.2, mult));
    this.slowTimer = Math.max(this.slowTimer, duration);
  }

  applyStun(duration: number): void {
    this.stunTimer = Math.max(this.stunTimer, duration);
    this.attackTimer = Math.max(this.attackTimer, duration);
  }

  update(
    dt: number,
    playerX: number,
    playerY: number,
  ): { hitPlayer: boolean; damage: number } {
    if (!this.alive) return { hitPlayer: false, damage: 0 };
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.slowTimer = Math.max(0, this.slowTimer - dt);
    this.stunTimer = Math.max(0, this.stunTimer - dt);
    if (this.slowTimer <= 0) this.slowMult = 1;

    if (this.ghosted) {
      this.playAnim('idle');
      this.syncScreen();
      return { hitPlayer: false, damage: 0 };
    }

    const dist = worldDistance(
      { x: this.worldX, y: this.worldY },
      { x: playerX, y: playerY },
    );

    // Far packs: skip most frames (AI + sprite sync)
    if (dist > 18) {
      this.body.setVisible(false);
      return { hitPlayer: false, damage: 0 };
    }
    if (!this.body.visible) this.body.setVisible(true);
    if (dist > 12) {
      this.lodPhase = (this.lodPhase + 1) & 7;
      if (this.lodPhase !== 0) {
        return { hitPlayer: false, damage: 0 };
      }
    }

    const spd = this.def.speed * this.slowMult;

    if (this.stunTimer > 0) {
      this.playAnim('idle');
      this.syncScreen();
      return { hitPlayer: false, damage: 0 };
    }

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
      const dy = Math.sin(this.patrolAngle);
      this.worldX += dx * spd * 0.35 * dt;
      this.worldY += dy * spd * 0.35 * dt;
      this.setFacingFromDelta(dx, dy);
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
      this.worldX += (dx / len) * spd * dt;
      this.worldY += (dy / len) * spd * dt;
      this.setFacingFromDelta(dx, dy);
      this.playAnim('walk');
    } else if (this.state === 'attack') {
      this.setFacingToward(playerX, playerY);
      if (this.attackTimer <= 0) {
        hitPlayer = true;
        damage = Math.floor(
          this.def.damage *
            this.levelMult *
            this.modDmgMult *
            (this.elitePack ? 1.45 : 1) *
            (this.isBoss ? 1.25 : 1),
        );
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

  private setFacingFromDelta(dx: number, dy: number): void {
    const facing = spriteFacingFromDelta(dx, dy, this.facing);
    this.facing = facing.sign;
    applyFlipFacing(this.sprite, facing);
  }

  /** Snap to target for attacks (horizontal bias when screen-X is clear). */
  private setFacingToward(worldX: number, worldY: number): void {
    const dx = worldX - this.worldX;
    const dy = worldY - this.worldY;
    const screenDx = dx - dy;
    if (Math.abs(screenDx) >= 0.08) {
      this.facing = screenDx >= 0 ? 1 : -1;
      applyFlipFacing(this.sprite, this.facing);
      return;
    }
    this.setFacingFromDelta(dx, dy);
  }

  private playAnim(
    kind: 'idle' | 'walk' | 'attack' | 'hit' | 'death',
    force = false,
  ): void {
    if (!force && this.animKind === kind) return;
    if (this.animKind === 'death' && kind !== 'death') return;
    if (kind !== 'attack' && this.animKind === 'attack' && !force) return;
    if (kind !== 'hit' && this.animKind === 'hit' && !force) return;
    const key = `${this.textureKey}_${kind}`;
    if (!this.sprite.scene.anims.exists(key)) return;
    this.animKind = kind;
    this.sprite.play(key, true);
    if (kind === 'attack') {
      const gen = ++this.attackGen;
      this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (gen !== this.attackGen) return;
        if (this.animKind === 'death') return;
        this.animKind =
          this.state === 'chase' || this.state === 'patrol' ? 'walk' : 'idle';
        this.sprite.play(`${this.textureKey}_${this.animKind}`, true);
      });
    }
  }

  applyDamage(amount: number): boolean {
    if (!this.alive || this.ghosted) return false;
    this.hp -= amount;
    this.redrawBar();
    this.flashHit();
    if (this.hp <= 0) {
      this.alive = false;
      this.attackGen += 1;
      this.bar.clear();
      this.playDeath();
      return true;
    }
    return false;
  }

  /** Hit frames when available; tint + nudge as fallback. */
  flashHit(): void {
    if (!this.alive) return;
    const hitKey = `${this.textureKey}_hit`;
    if (this.sprite.scene.anims.exists(hitKey)) {
      this.playAnim('hit', true);
      this.sprite.scene.time.delayedCall(120, () => {
        if (!this.alive || this.animKind !== 'hit') return;
        this.animKind =
          this.state === 'chase' || this.state === 'patrol' ? 'walk' : 'idle';
        this.sprite.play(`${this.textureKey}_${this.animKind}`, true);
      });
      return;
    }
    this.sprite.setTint(0xffffff);
    const ox = this.sprite.x;
    this.sprite.x = ox + (Math.random() > 0.5 ? 3 : -3);
    this.sprite.scene.time.delayedCall(70, () => {
      if (!this.alive) return;
      this.sprite.x = ox;
      this.applyBaseTint();
    });
  }

  private playDeath(): void {
    const deathKey = `${this.textureKey}_death`;
    if (this.sprite.scene.anims.exists(deathKey)) {
      this.animKind = 'death';
      this.sprite.play(deathKey, false);
      this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        this.body.setVisible(false);
      });
      // Safety hide if complete never fires
      this.sprite.scene.time.delayedCall(450, () => {
        this.body.setVisible(false);
      });
      return;
    }
    this.sprite.scene.tweens.add({
      targets: this.body,
      alpha: 0,
      scaleX: 0.55,
      scaleY: 0.55,
      duration: 180,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.body.setVisible(false);
      },
    });
  }

  destroy(): void {
    this.body.destroy(true);
  }
}

export function getEnemyDef(id: string): EnemyDef {
  return enemies[id] ?? enemies.shade;
}
