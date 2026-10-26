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
};

/**
 * Lightweight world VFX for active skills (Graphics + short tweens).
 * No new art required — readable class identity on cast.
 */
export function playSkillVfx(scene: Phaser.Scene, req: SkillVfxRequest): void {
  const { screenX, screenY } = worldToScreen(req.worldX, req.worldY);
  const color = req.color ?? 0xc4a574;
  const g = scene.add.graphics().setDepth(9_500);

  switch (req.kind) {
    case 'leap': {
      // Landing shock ring
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
      const rings = req.kind === 'pulse' ? 3 : 2;
      for (let i = 0; i < rings; i++) {
        const ring = scene.add.graphics().setDepth(9_500);
        const tint = req.kind === 'pulse' ? 0x6ec6a0 : 0x6ec6ff;
        ring.lineStyle(2, tint, 0.85 - i * 0.15);
        ring.strokeCircle(screenX, screenY, 12 + i * 6);
        scene.tweens.add({
          targets: ring,
          alpha: 0,
          scaleX: 2.8,
          scaleY: 2.8,
          duration: 360 + i * 60,
          delay: i * 40,
          ease: 'Cubic.Out',
          onComplete: () => ring.destroy(),
        });
      }
      g.destroy();
      break;
    }
    case 'bolt': {
      const tx = req.targetX ?? req.worldX;
      const ty = req.targetY ?? req.worldY;
      const to = worldToScreen(tx, ty);
      g.lineStyle(3, 0x6ec6ff, 0.95);
      g.beginPath();
      g.moveTo(screenX, screenY - 10);
      g.lineTo(to.screenX, to.screenY - 14);
      g.strokePath();
      g.fillStyle(0xe8f0ff, 0.9);
      g.fillCircle(to.screenX, to.screenY - 14, 5);
      scene.tweens.add({
        targets: g,
        alpha: 0,
        duration: 180,
        onComplete: () => g.destroy(),
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
      g.lineStyle(3, tint, 0.85);
      g.strokeCircle(screenX, screenY - 8, 22);
      g.lineStyle(2, 0xffffff, 0.45);
      g.strokeCircle(screenX, screenY - 8, 28);
      scene.tweens.add({
        targets: g,
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 400,
        onComplete: () => g.destroy(),
      });
      break;
    }
    default:
      g.destroy();
  }
}
