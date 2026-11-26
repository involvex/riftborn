import Phaser from 'phaser';
import {
  applyFlipFacing,
  depthFromWorld,
  spriteFacingFromDelta,
  worldToScreen,
  type FacingOctant,
  type FacingSign,
  type SpriteFacing,
} from '../core/IsoMath';
import { figureDrawScale } from '../core/FigureScale';
import { slideMove } from '../core/Movement';
import {
  ensureGameSprites,
  isPaintedSprite,
  playerSpriteKey,
} from '../render/SpriteAtlas';
import { playCombatBurst } from '../render/CombatVfx';
import { playerHurtSquashPlan } from '../render/CombatFeel';
import {
  DASH_INVULN_SEC,
  SWING_SLOW_SEC,
  swingMoveMult,
  tickTimer,
} from '../systems/CombatWeight';
import { gameState } from '../systems/GameState';

type AnimKind = 'idle' | 'walk' | 'attack' | 'hit';

export class Player {
  readonly body: Phaser.GameObjects.Container;
  worldX: number;
  worldY: number;
  speed = 4.2;
  attackCooldown = 0;
  skillCooldown = 0;
  /** Remaining dash i-frames (seconds). */
  dashInvuln = 0;
  readonly gatherRange = 1.4;
  maxX = 23.5;
  maxY = 23.5;
  walkCheck: ((x: number, y: number) => boolean) | null = null;
  private readonly scene: Phaser.Scene;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly label: Phaser.GameObjects.Text;
  private readonly slash: Phaser.GameObjects.Graphics;
  /** +1 = screen-right (SE), -1 = screen-left (mirrored). */
  private facing: FacingSign = 1;
  /** 8-way screen aim (sheets still 2-dir flip). */
  private facingOctant: FacingOctant = 'e';
  private facingLean = 0;
  private facingScreenX = 1;
  private facingScreenY = 0;
  private animKind: AnimKind = 'idle';
  private moving = false;
  private textureKey: string;
  private slashUntil = 0;
  private bobPhase = 0;
  private walkPhase = 0;
  private hitFlashUntil = 0;
  /** Remaining basic-swing move slow (seconds). */
  private swingSlow = 0;
  /** Bumps so stale attack ANIMATION_COMPLETE handlers no-op. */
  private attackGen = 0;

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
    const shadow = scene.add.graphics();
    shadow.fillStyle(0x000000, 0.32);
    shadow.fillEllipse(0, 4, 26, 11);
    this.label = scene.add
      .text(0, -64, gameState.name, {
        fontFamily: 'Georgia, serif',
        fontSize: '12px',
        color: '#e8e4d8',
        stroke: '#0a0c10',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.body = scene.add.container(0, 0, [
      shadow,
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
    // Painted + procedural share tile-relative scale (M1d).
    this.sprite.setScale(figureDrawScale());
  }

  private applyFacing(): void {
    applyFlipFacing(this.sprite, this.facing);
  }

  private setFacingState(next: SpriteFacing): void {
    this.facing = next.sign;
    this.facingOctant = next.octant;
    this.facingLean = next.lean;
    this.facingScreenX = next.screenX;
    this.facingScreenY = next.screenY;
    this.applyFacing();
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
    this.setFacingState(
      spriteFacingFromDelta(dx, dy, this.facing, this.facingOctant),
    );

    const len = Math.hypot(dx, dy) || 1;
    // Touch stick encodes 0..1 speed in vector length; WASD stays unit-length.
    const speedMul = Math.min(1, len) * swingMoveMult(this.swingSlow);
    const stepX = (dx / len) * this.speed * speedMul * dt;
    const stepY = (dy / len) * this.speed * speedMul * dt;
    if (this.walkCheck) {
      const res = slideMove(
        this.walkCheck,
        this.worldX,
        this.worldY,
        stepX,
        stepY,
      );
      this.worldX = Phaser.Math.Clamp(res.x, 0.5, this.maxX);
      this.worldY = Phaser.Math.Clamp(res.y, 0.5, this.maxY);
    } else {
      this.worldX = Phaser.Math.Clamp(this.worldX + stepX, 0.5, this.maxX);
      this.worldY = Phaser.Math.Clamp(this.worldY + stepY, 0.5, this.maxY);
    }

    gameState.worldX = this.worldX;
    gameState.worldY = this.worldY;
    if (this.animKind !== 'attack') this.playAnim('walk');
    // Stride bob + octant lean so diagonals read vs cardinals
    this.walkPhase += dt * 16;
    this.sprite.y = -4 + Math.abs(Math.sin(this.walkPhase)) * 2.4;
    this.sprite.setRotation(
      this.facingLean + Math.sin(this.walkPhase) * 0.05 * this.facing,
    );
    this.syncScreen();
  }

  /** +1 screen-right / -1 screen-left (dash skills). */
  getFacing(): number {
    return this.facing;
  }

  /** Current 8-way screen octant (for debug / future sheet rows). */
  getFacingOctant(): FacingOctant {
    return this.facingOctant;
  }

  /** Face toward a world point (click-attack / skills). */
  faceToward(worldX: number, worldY: number): void {
    const dx = worldX - this.worldX;
    const dy = worldY - this.worldY;
    if (Math.abs(dx) + Math.abs(dy) < 0.05) return;
    this.setFacingState(
      spriteFacingFromDelta(dx, dy, this.facing, this.facingOctant),
    );
  }

  playAttack(): void {
    this.playAnim('attack', true);
    this.showSlash();
    this.swingSlow = Math.max(this.swingSlow, SWING_SLOW_SEC);
    playCombatBurst(this.scene, this.worldX, this.worldY, 'slash', this.facing);
    // Punch the sprite forward slightly so the swing reads in-world.
    // Drop walk lean so the swing isn't tilted mid-strafe.
    this.sprite.setRotation(this.facingLean);
    const base = figureDrawScale();
    this.sprite.setScale(base * 1.16);
    this.sprite.x = this.facingScreenX * 9;
    this.sprite.y = -7 + this.facingScreenY * 4;
    this.scene.time.delayedCall(95, () => {
      this.applyScale();
      this.sprite.x = 0;
      this.sprite.y = -4;
    });
  }

  /** Grant dash i-frames (blink distance / CD stay in WorldScene). */
  grantDashInvuln(seconds = DASH_INVULN_SEC): void {
    this.dashInvuln = Math.max(this.dashInvuln, seconds);
  }

  get isDashInvulnerable(): boolean {
    return this.dashInvuln > 0;
  }

  /** Hit frames (sheet) with light tint fallback if anim missing. */
  flashHit(): void {
    this.hitFlashUntil = this.scene.time.now + 140;
    const hitKey = `${this.textureKey}_hit`;
    if (this.scene.anims.exists(hitKey) && this.animKind !== 'attack') {
      this.playAnim('hit', true);
    } else {
      this.sprite.setTint(0xff6060);
    }
    const squash = playerHurtSquashPlan();
    const base = figureDrawScale();
    this.sprite.setScale(base * squash.scaleX, base * squash.scaleY);
    const restoreMs = Math.max(140, squash.ms);
    this.scene.time.delayedCall(restoreMs, () => {
      if (this.scene.time.now < this.hitFlashUntil) return;
      this.applyClassTint();
      this.applyScale();
      if (this.animKind === 'hit') {
        this.animKind = this.moving ? 'walk' : 'idle';
        this.sprite.play(`${this.textureKey}_${this.animKind}`, true);
      }
    });
  }

  private showSlash(): void {
    this.slash.clear();
    const dir = this.facing;
    const sx = this.facingScreenX;
    const sy = this.facingScreenY;
    const cls = gameState.progression.classId;
    const color = Phaser.Display.Color.HexStringToColor(
      gameState.progression.classDef().color,
    ).color;
    // Aim slash along the 8-way screen vector (not just ±X).
    const ox = sx * 10;
    const oy = -12 + sy * 8;
    if (cls === 'mage') {
      // Bolt-style radial burst
      this.slash.lineStyle(4, color, 0.95);
      this.slash.strokeCircle(ox + sx * 18, oy + sy * 10, 12);
      this.slash.lineStyle(2, 0xe8f0ff, 0.8);
      this.slash.beginPath();
      this.slash.moveTo(ox, oy);
      this.slash.lineTo(ox + sx * 36, oy + sy * 20 - 2);
      this.slash.strokePath();
      this.slash.fillStyle(color, 0.45);
      this.slash.fillCircle(ox + sx * 32, oy + sy * 16, 6);
    } else if (cls === 'mystic') {
      // Twin crescent
      this.slash.lineStyle(4, color, 0.9);
      this.slash.beginPath();
      this.slash.arc(ox, oy, 32, -1.2, 0.7, dir < 0);
      this.slash.strokePath();
      this.slash.lineStyle(2, 0xd0ffe0, 0.7);
      this.slash.beginPath();
      this.slash.arc(ox, oy + 2, 24, -1.0, 0.5, dir < 0);
      this.slash.strokePath();
    } else {
      // Warrior sword arc + tip flare
      this.slash.lineStyle(6, color, 0.65);
      this.slash.beginPath();
      this.slash.arc(ox, oy, 36, -1.25, 0.75, dir < 0);
      this.slash.strokePath();
      this.slash.lineStyle(3, 0xfff0d0, 0.95);
      this.slash.beginPath();
      this.slash.arc(ox, oy, 30, -1.1, 0.6, dir < 0);
      this.slash.strokePath();
      this.slash.fillStyle(0xffffff, 0.85);
      this.slash.fillCircle(ox + sx * 28, oy + sy * 14 + 4, 4);
    }
    this.slashUntil = this.scene.time.now + 210;
  }

  private playAnim(kind: AnimKind, force = false): void {
    if (!force && this.animKind === kind) return;
    if (kind !== 'attack' && this.animKind === 'attack' && !force) return;
    if (kind !== 'hit' && this.animKind === 'hit' && !force) return;
    const key = `${this.textureKey}_${kind}`;
    if (!this.scene.anims.exists(key)) return;
    this.animKind = kind;
    this.sprite.play(key, true);
    if (kind === 'attack') {
      const gen = ++this.attackGen;
      this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (gen !== this.attackGen) return;
        if (this.animKind !== 'attack') return;
        this.animKind = this.moving ? 'walk' : 'idle';
        this.sprite.play(`${this.textureKey}_${this.animKind}`, true);
      });
    }
  }

  /** Clear attack lock / slash / tint after death or zone reset. */
  resetCombatPose(): void {
    this.attackGen += 1;
    this.animKind = 'idle';
    this.moving = false;
    this.slash.clear();
    this.slashUntil = 0;
    this.swingSlow = 0;
    this.dashInvuln = 0;
    this.sprite.x = 0;
    this.sprite.y = -4;
    this.sprite.setRotation(0);
    this.applyScale();
    this.applyClassTint();
    this.sprite.play(`${this.textureKey}_idle`, true);
  }

  tick(dt: number): void {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.skillCooldown = Math.max(0, this.skillCooldown - dt);
    this.dashInvuln = tickTimer(this.dashInvuln, dt);
    this.swingSlow = tickTimer(this.swingSlow, dt);
    this.speed = 4.2 * gameState.progression.moveSpeedMult();
    if (this.slashUntil && this.scene.time.now > this.slashUntil) {
      this.slash.clear();
      this.slashUntil = 0;
    }
    // Soft idle breathe so standing isn't a freeze-frame
    if (this.animKind === 'idle' && !this.moving) {
      this.bobPhase += dt * 3.8;
      this.sprite.y = -4 + Math.sin(this.bobPhase) * 2.5;
      this.sprite.setRotation(Math.sin(this.bobPhase * 0.5) * 0.02);
    } else if (this.animKind !== 'attack' && !this.moving) {
      this.sprite.y = -4;
      this.sprite.setRotation(0);
    }
  }

  destroy(): void {
    this.body.destroy(true);
  }
}
