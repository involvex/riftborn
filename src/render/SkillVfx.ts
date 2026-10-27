import Phaser from 'phaser';
import { worldToScreen } from '../core/IsoMath';
import type { AbilityKind } from '../types/game';

export type SkillVfxRequest = {
  kind: AbilityKind;
  worldX: number;
  worldY: number;
  targetX?: number;
  targetY?: number;
  facing?: 1 | -1;
  color?: number;
  /** Ability range in world tiles — scales rings / bolt travel. */
  range?: number;
};

/** Approx screen px per world tile (iso diamond half-width). */
function rangePx(range: number): number {
  return Math.max(24, range * 28);
}

/**
 * Lightweight world VFX for active skills (Graphics + short tweens).
 * Mage bolt/nova/barrier scale with range so long casts read as ranged.
 */
export function playSkillVfx(scene: Phaser.Scene, req: SkillVfxRequest): void {
  const { screenX, screenY } = worldToScreen(req.worldX, req.worldY);
  const color = req.color ?? 0xc4a574;
  const g = scene.add.graphics().setDepth(9_500);
  const r = req.range ?? 2.5;

  switch (req.kind) {
    case 'leap': {
      g.lineStyle(4, color, 0.9);
      g.strokeCircle(screenX, screenY, 8);
      g.lineStyle(2, 0xfff0d0, 0.7);
      g.strokeCircle(screenX, screenY, 16);
      scene.tweens.add({
        targets: g,
        alpha: 0,
        scaleX: 2.4,
        scaleY: 2.4,
        duration: 280,
        ease: 'Cubic.Out',
        onComplete: () => g.destroy(),
      });
      scene.cameras.main.shake(120, 0.004);
      break;
    }
    case 'pulse':
    case 'slow_nova': {
      const px = rangePx(r);
      const tint = req.kind === 'pulse' ? 0x6ec6a0 : 0x6ec6ff;
      // Ground range disc so AoE size is obvious
      const disc = scene.add.graphics().setDepth(9_490);
      disc.fillStyle(tint, 0.18);
      disc.fillEllipse(screenX, screenY + 4, px * 2, px);
      disc.lineStyle(2, tint, 0.7);
      disc.strokeEllipse(screenX, screenY + 4, px * 2, px);
      scene.tweens.add({
        targets: disc,
        alpha: 0,
        duration: 420,
        ease: 'Cubic.Out',
        onComplete: () => disc.destroy(),
      });
      const rings = req.kind === 'pulse' ? 3 : 2;
      for (let i = 0; i < rings; i++) {
        const ring = scene.add.graphics().setDepth(9_500);
        ring.lineStyle(2.5, tint, 0.9 - i * 0.2);
        ring.strokeCircle(screenX, screenY - 4, 10 + i * 8);
        const scale = Math.max(2.2, (px / 18) * (0.85 + i * 0.12));
        scene.tweens.add({
          targets: ring,
          alpha: 0,
          scaleX: scale,
          scaleY: scale * 0.72,
          duration: 380 + i * 70,
          delay: i * 35,
          ease: 'Cubic.Out',
          onComplete: () => ring.destroy(),
        });
      }
      g.destroy();
      break;
    }
    case 'bolt': {
      const tx = req.targetX ?? req.worldX + r * 0.6;
      const ty = req.targetY ?? req.worldY;
      const to = worldToScreen(tx, ty);
      // Faint max-range ring — “this hits far”
      const ring = scene.add.graphics().setDepth(9_480);
      const px = rangePx(r);
      ring.lineStyle(1.5, 0x6ec6ff, 0.45);
      ring.strokeEllipse(screenX, screenY + 2, px * 2, px);
      scene.tweens.add({
        targets: ring,
        alpha: 0,
        duration: 380,
        onComplete: () => ring.destroy(),
      });
      // Traveling bolt orb
      const orb = scene.add.graphics().setDepth(9_510);
      orb.fillStyle(0xe8f0ff, 1);
      orb.fillCircle(0, 0, 5);
      orb.lineStyle(2, 0x6ec6ff, 0.95);
      orb.strokeCircle(0, 0, 8);
      orb.setPosition(screenX, screenY - 12);
      const dist = Math.hypot(to.screenX - screenX, to.screenY - screenY);
      const dur = Phaser.Math.Clamp(140 + dist * 0.55, 180, 420);
      // Trail line that grows toward target
      g.lineStyle(2, 0x6ec6ff, 0.55);
      g.beginPath();
      g.moveTo(screenX, screenY - 12);
      g.lineTo(to.screenX, to.screenY - 14);
      g.strokePath();
      g.setAlpha(0.35);
      scene.tweens.add({
        targets: g,
        alpha: 0,
        duration: dur + 80,
        onComplete: () => g.destroy(),
      });
      scene.tweens.add({
        targets: orb,
        x: to.screenX,
        y: to.screenY - 14,
        duration: dur,
        ease: 'Cubic.Out',
        onComplete: () => {
          const hit = scene.add.graphics().setDepth(9_520);
          hit.fillStyle(0xa0d8ff, 0.85);
          hit.fillCircle(to.screenX, to.screenY - 14, 12);
          hit.lineStyle(2, 0xffffff, 0.9);
          hit.strokeCircle(to.screenX, to.screenY - 14, 18);
          scene.tweens.add({
            targets: hit,
            alpha: 0,
            scaleX: 1.6,
            scaleY: 1.6,
            duration: 220,
            onComplete: () => hit.destroy(),
          });
          orb.destroy();
        },
      });
      break;
    }
    case 'cleave':
    case 'dash_strike': {
      const dir = req.facing ?? 1;
      g.lineStyle(4, color, 0.8);
      g.beginPath();
      g.arc(screenX + dir * 6, screenY - 12, 32, -1.2, 0.7, dir < 0);
      g.strokePath();
      scene.tweens.add({
        targets: g,
        alpha: 0,
        duration: 220,
        onComplete: () => g.destroy(),
      });
      break;
    }
    case 'blink': {
      g.fillStyle(0xa78bfa, 0.55);
      g.fillCircle(screenX, screenY - 8, 14);
      scene.tweens.add({
        targets: g,
        alpha: 0,
        scaleX: 1.8,
        scaleY: 1.8,
        duration: 240,
        onComplete: () => g.destroy(),
      });
      break;
    }
    case 'strike': {
      g.lineStyle(3, color, 0.9);
      g.strokeCircle(screenX + (req.facing ?? 1) * 20, screenY - 10, 10);
      scene.tweens.add({
        targets: g,
        alpha: 0,
        duration: 200,
        onComplete: () => g.destroy(),
      });
      break;
    }
    case 'buff':
    case 'barrier': {
      const tint = req.kind === 'barrier' ? 0x6ec6ff : 0xffc107;
      // Tall bubble so barrier reads as a shield, not a tiny ping
      g.lineStyle(3, tint, 0.9);
      g.strokeEllipse(screenX, screenY - 16, 48, 56);
      g.lineStyle(2, 0xffffff, 0.5);
      g.strokeEllipse(screenX, screenY - 16, 58, 68);
      g.fillStyle(tint, 0.12);
      g.fillEllipse(screenX, screenY - 16, 48, 56);
      scene.tweens.add({
        targets: g,
        alpha: 0,
        scaleX: 1.25,
        scaleY: 1.25,
        duration: 520,
        ease: 'Sine.Out',
        onComplete: () => g.destroy(),
      });
      break;
    }
    default:
      g.destroy();
  }
}
