import type Phaser from 'phaser';
import { SHIFT_LAYERS, type ShiftLayerId } from '../data/shiftLayers';
import { SHIFT_TRANSITION_MS, transitionFlashAlpha } from './ShiftVisual';

/**
 * Short camera flash + color wash on layer change.
 * No blur filters — pixels stay sharp.
 */
export function playShiftTransition(
  scene: Phaser.Scene,
  layer: ShiftLayerId,
  intensity: number,
): void {
  const def = SHIFT_LAYERS[layer];
  const r = (def.tileTint >> 16) & 0xff;
  const g = (def.tileTint >> 8) & 0xff;
  const b = def.tileTint & 0xff;
  const i = Math.min(1, Math.max(0, intensity));
  scene.cameras.main.flash(
    SHIFT_TRANSITION_MS,
    Math.min(255, r || 200),
    Math.min(255, g || 180),
    Math.min(255, b || 255),
    false,
    undefined,
    scene,
  );
  const wash = scene.add
    .rectangle(
      scene.scale.width / 2,
      scene.scale.height / 2,
      scene.scale.width,
      scene.scale.height,
      def.tileTint,
      0,
    )
    .setScrollFactor(0)
    .setDepth(9_500);
  const start = scene.time.now;
  const tick = (): void => {
    const t = (scene.time.now - start) / SHIFT_TRANSITION_MS;
    if (t >= 1) {
      wash.destroy();
      return;
    }
    wash.setAlpha(transitionFlashAlpha(t) * i);
    scene.time.delayedCall(16, tick);
  };
  tick();
}
