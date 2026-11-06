import type Phaser from 'phaser';
import { SHIFT_LAYERS, type ShiftLayerId } from '../data/shiftLayers';
import { SHIFT_TRANSITION_MS, transitionFlashAlpha } from './ShiftVisual';

/**
 * Short camera flash + color wash + procedural burst on layer change.
 * No blur filters, no new assets — pixels stay sharp.
 */
export function playShiftTransition(
  scene: Phaser.Scene,
  layer: ShiftLayerId,
  intensity: number,
): void {
  const def = SHIFT_LAYERS[layer];
  const tint = def.tileTint;
  const r = (tint >> 16) & 0xff;
  const g = (tint >> 8) & 0xff;
  const b = tint & 0xff;
  const i = Math.min(1, Math.max(0, intensity));
  if (i <= 0) return;

  // Stronger flash so the world-swap reads instantly.
  scene.cameras.main.flash(
    Math.min(300, SHIFT_TRANSITION_MS + 40),
    Math.max(120, Math.min(255, r || 200)),
    Math.max(110, Math.min(255, g || 180)),
    Math.max(140, Math.min(255, b || 255)),
    false,
    undefined,
    scene,
  );

  const cx = scene.scale.width / 2;
  const cy = scene.scale.height / 2;
  const w = scene.scale.width;
  const h = scene.scale.height;

  const wash = scene.add
    .rectangle(cx, cy, w, h, tint, 0)
    .setScrollFactor(0)
    .setDepth(9_500);

  // Procedural burst: expanding rings + motes (Graphics primitives).
  const burst = scene.add.graphics().setScrollFactor(0).setDepth(9_501);
  const motes = Array.from({ length: 10 }, (_, idx) => {
    const a = (idx / 10) * Math.PI * 2;
    return {
      x: cx + Math.cos(a) * 24,
      y: cy + Math.sin(a) * 16,
      vx: Math.cos(a) * (90 + (idx % 3) * 35),
      vy: Math.sin(a) * (60 + (idx % 3) * 25),
      s: 2 + (idx % 3),
    };
  });

  const dur = Math.min(300, SHIFT_TRANSITION_MS + 20);
  const start = scene.time.now;
  const tick = (): void => {
    const elapsed = scene.time.now - start;
    const t = Math.min(1, elapsed / dur);
    if (t >= 1) {
      wash.destroy();
      burst.destroy();
      return;
    }
    // Slightly stronger wash than the base helper for clarity.
    const base = transitionFlashAlpha(Math.min(1, (elapsed / dur) * 1.05));
    wash.setAlpha(Math.min(0.72, base * 1.35 * i));

    burst.clear();
    const ringA = (1 - t) * 0.55 * i;
    burst.lineStyle(3, tint, ringA);
    burst.strokeEllipse(cx, cy, 40 + t * 220, 26 + t * 140);
    burst.lineStyle(2, 0xffffff, ringA * 0.45);
    burst.strokeEllipse(cx, cy, 24 + t * 160, 16 + t * 100);
    for (const m of motes) {
      const mx = m.x + m.vx * t;
      const my = m.y + m.vy * t;
      burst.fillStyle(tint, (1 - t) * 0.7 * i);
      burst.fillCircle(mx, my, m.s * (1 - t * 0.5));
      burst.fillStyle(0xffffff, (1 - t) * 0.25 * i);
      burst.fillCircle(mx, my, Math.max(1, m.s * 0.4));
    }
    scene.time.delayedCall(16, tick);
  };
  tick();
}
