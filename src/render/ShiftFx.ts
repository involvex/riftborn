import type Phaser from 'phaser';
import { SHIFT_LAYERS, type ShiftLayerId } from '../data/shiftLayers';
import { SHIFT_TRANSITION_MS } from './ShiftVisual';
import { ShiftFxTracker, shiftWashAlpha } from './ShiftFxLogic';

const tracker = new ShiftFxTracker();

/** Cancel and destroy any active shift transition overlay. */
export function cancelShiftTransition(): void {
  tracker.cancelAll();
}

type WashObjs = {
  wash: Phaser.GameObjects.Rectangle;
  burst: Phaser.GameObjects.Graphics;
};

/**
 * Short camera flash + color wash + procedural burst on layer change.
 * No blur filters, no new assets — pixels stay sharp.
 * Safe against exceptions, rapid stacking, and scene shutdown.
 */
export function playShiftTransition(
  scene: Phaser.Scene,
  layer: ShiftLayerId,
  intensity: number,
): void {
  const i = Math.min(1, Math.max(0, intensity));
  if (i <= 0) return;

  let objs: WashObjs | null = null;
  let cancelled = false;
  let timer: Phaser.Time.TimerEvent | null = null;

  const destroyObjs = (): void => {
    if (cancelled) return;
    cancelled = true;
    if (timer) {
      try {
        timer.remove(false);
      } catch {
        /* ignore */
      }
      timer = null;
    }
    if (objs) {
      try {
        objs.wash.destroy();
      } catch {
        /* ignore */
      }
      try {
        objs.burst.destroy();
      } catch {
        /* ignore */
      }
      objs = null;
    }
  };

  tracker.start(() => ({
    destroy: destroyObjs,
    get destroyed() {
      return cancelled;
    },
  }));

  try {
    const def = SHIFT_LAYERS[layer];
    const tint = def.tileTint;
    const r = (tint >> 16) & 0xff;
    const g = (tint >> 8) & 0xff;
    const b = tint & 0xff;

    // Clear a stuck flash before starting a new one (prevents permanent tint).
    try {
      const fx = scene.cameras?.main as unknown as {
        flashEffect?: { isRunning?: boolean; reset?: () => void };
      };
      if (fx?.flashEffect?.isRunning) fx.flashEffect.reset?.();
    } catch {
      /* camera FX API may vary */
    }

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

    const burst = scene.add.graphics().setScrollFactor(0).setDepth(9_501);
    objs = { wash, burst };

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

    const finish = (): void => {
      destroyObjs();
      tracker.finish({
        destroy: destroyObjs,
        get destroyed() {
          return cancelled;
        },
      });
    };

    const tick = (): void => {
      if (cancelled || !objs) return;
      try {
        if (!scene.scene?.isActive?.()) {
          finish();
          return;
        }
        const elapsed = scene.time.now - start;
        if (elapsed >= dur) {
          finish();
          return;
        }
        const alpha = shiftWashAlpha(elapsed, dur, i);
        objs.wash.setAlpha(alpha);

        const t = Math.min(1, elapsed / dur);
        objs.burst.clear();
        const ringA = (1 - t) * 0.55 * i;
        objs.burst.lineStyle(3, tint, ringA);
        objs.burst.strokeEllipse(cx, cy, 40 + t * 220, 26 + t * 140);
        objs.burst.lineStyle(2, 0xffffff, ringA * 0.45);
        objs.burst.strokeEllipse(cx, cy, 24 + t * 160, 16 + t * 100);
        for (const m of motes) {
          const mx = m.x + m.vx * t;
          const my = m.y + m.vy * t;
          objs.burst.fillStyle(tint, (1 - t) * 0.7 * i);
          objs.burst.fillCircle(mx, my, m.s * (1 - t * 0.5));
          objs.burst.fillStyle(0xffffff, (1 - t) * 0.25 * i);
          objs.burst.fillCircle(mx, my, Math.max(1, m.s * 0.4));
        }
        timer = scene.time.delayedCall(16, tick);
      } catch (err) {
        console.warn('[ShiftFx] transition tick failed, cleaning up', err);
        finish();
      }
    };

    tick();
  } catch (err) {
    console.warn('[ShiftFx] transition start failed, cleaning up', err);
    destroyObjs();
    tracker.cancelAll();
  }
}
