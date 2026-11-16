/**
 * Portal / zone-transition juice — no new assets.
 * Enter/exit washes + exit-portal reveal burst.
 */

import Phaser from 'phaser';
import { worldToScreen } from '../core/IsoMath';
import { currentGraphicsProfile } from '../core/GraphicsQuality';

/** Expanding cyan ring when the Exit portal appears. */
export function playPortalReveal(
  scene: Phaser.Scene,
  worldX: number,
  worldY: number,
): void {
  const profile = currentGraphicsProfile();
  if (profile.tier === 'low' && profile.particleCap < 8) return;

  const { screenX, screenY } = worldToScreen(worldX, worldY);
  const g = scene.add.graphics().setDepth(9_700);
  const state = { r: 8, a: 0.85 };
  const draw = (): void => {
    g.clear();
    g.lineStyle(3, 0x7ad0ff, state.a);
    g.strokeEllipse(screenX, screenY, state.r * 2.2, state.r);
    g.lineStyle(1.5, 0xe8f6ff, state.a * 0.7);
    g.strokeEllipse(screenX, screenY - 18, state.r * 1.1, state.r * 0.55);
  };
  draw();
  scene.tweens.add({
    targets: state,
    r: 52,
    a: 0,
    duration: profile.tier === 'low' ? 280 : 420,
    ease: 'Cubic.easeOut',
    onUpdate: draw,
    onComplete: () => {
      g.destroy();
    },
  });
}

/**
 * Brief full-screen color wash over a zone swap (in addition to fade).
 * Safe if the camera is mid-fade.
 */
export function playZoneWash(
  scene: Phaser.Scene,
  kind: 'enter' | 'exit',
): void {
  const profile = currentGraphicsProfile();
  if (profile.tier === 'low') return;

  const cam = scene.cameras?.main;
  if (!cam) return;
  const color = kind === 'enter' ? 0x1a3860 : 0x102030;
  const wash = scene.add
    .rectangle(
      cam.worldView.centerX,
      cam.worldView.centerY,
      cam.width * 1.2,
      cam.height * 1.2,
      color,
      0.55,
    )
    .setScrollFactor(0)
    .setDepth(20_000)
    .setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({
    targets: wash,
    alpha: 0,
    duration: kind === 'enter' ? 380 : 320,
    ease: 'Quad.easeOut',
    onComplete: () => wash.destroy(),
  });
}
