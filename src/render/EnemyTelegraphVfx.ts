import Phaser from 'phaser';
import { currentGraphicsProfile } from '../core/GraphicsQuality';
import { worldToScreen } from '../core/IsoMath';
import {
  enemyTelegraphStyle,
  telegraphCap,
  type EnemyTelegraphKind,
  type EnemyTelegraphPhase,
} from '../systems/EnemyTelegraph';

/** Per-scene expiry stamps so HUD/scene restarts can't leak the cap. */
const liveUntilByScene = new WeakMap<Phaser.Scene, number[]>();

function liveCues(scene: Phaser.Scene): number[] {
  const cues = liveUntilByScene.get(scene);
  if (cues) return cues;
  const fresh: number[] = [];
  liveUntilByScene.set(scene, fresh);
  return fresh;
}

function liveCueCount(scene: Phaser.Scene, now: number): number {
  const cues = liveCues(scene);
  while (cues.length > 0 && cues[0] <= now) cues.shift();
  return cues.length;
}

/** World-tile radius → screen px (matches SkillVfx ground rings). */
function radiusPx(worldRadius: number): number {
  return Math.max(14, worldRadius * 28);
}

/**
 * One-shot ground cue for an enemy special. Cheap Graphics + tween only,
 * capped per graphics tier so packed rifts stay readable on mobile.
 */
export function playEnemyTelegraph(
  scene: Phaser.Scene,
  kind: EnemyTelegraphKind,
  phase: EnemyTelegraphPhase,
  worldX: number,
  worldY: number,
): void {
  const profile = currentGraphicsProfile();
  const now = scene.time.now;
  if (liveCueCount(scene, now) >= telegraphCap(profile)) return;
  const style = enemyTelegraphStyle(kind, phase);
  const { screenX, screenY } = worldToScreen(worldX, worldY);
  const low = profile.tier === 'low';
  const r = radiusPx(style.radius);
  const g = scene.add.graphics().setDepth(9_480).setPosition(screenX, screenY);

  if (style.shape === 'ring') {
    g.lineStyle(low ? 2 : 3, style.color, 0.85);
    g.strokeEllipse(0, 4, r * 2, r);
    if (!low) {
      g.lineStyle(1, 0xffffff, 0.35);
      g.strokeEllipse(0, 4, r * 2 + 6, r + 3);
    }
  } else if (style.shape === 'burst') {
    g.fillStyle(style.color, low ? 0.22 : 0.32);
    g.fillEllipse(0, 2, r * 2, r);
    g.lineStyle(low ? 2 : 3, style.color, 0.9);
    g.strokeEllipse(0, 2, r * 2, r);
  } else {
    g.fillStyle(style.color, 0.85);
    g.fillCircle(0, -10, Math.max(3, r * 0.35));
    g.lineStyle(2, style.color, 0.7);
    g.strokeCircle(0, -10, r);
  }

  const duration = low
    ? Math.max(120, style.durationMs - 60)
    : style.durationMs;
  liveCues(scene).push(now + duration);
  const scale = phase === 'impact' ? 1.6 : 1.1;
  scene.tweens.add({
    targets: g,
    alpha: 0,
    scaleX: scale,
    scaleY: scale * 0.74,
    duration,
    ease: 'Cubic.Out',
    onComplete: () => {
      g.destroy();
    },
  });
}
