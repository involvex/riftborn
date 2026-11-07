import { transitionFlashAlpha } from './ShiftVisual';

/** Hard cap so stacked/buggy transitions never fully obscure the world. */
export const SHIFT_WASH_MAX_ALPHA = 0.72;

export function shiftWashAlpha(
  elapsed: number,
  durationMs: number,
  intensity: number,
): number {
  if (durationMs <= 0) return 0;
  if (elapsed <= 0) return 0;
  if (elapsed >= durationMs) return 0;
  const i = Math.min(1, Math.max(0, intensity));
  if (i <= 0) return 0;
  const progress = Math.min(1, (elapsed / durationMs) * 1.05);
  const base = transitionFlashAlpha(progress);
  return Math.min(SHIFT_WASH_MAX_ALPHA, base * 1.35 * i);
}

export interface ShiftFxHandle {
  destroy(): void;
  readonly destroyed: boolean;
}

/**
 * Tracks the active shift transition overlay. Starting a new transition
 * destroys the previous one so stacked flashes never leave a permanent wash.
 */
export class ShiftFxTracker {
  private active: ShiftFxHandle | null = null;

  start(create: () => ShiftFxHandle): ShiftFxHandle {
    this.cancelAll();
    const handle = create();
    this.active = handle;
    return handle;
  }

  finish(handle: ShiftFxHandle): void {
    if (this.active === handle) this.active = null;
  }

  cancelAll(): void {
    if (this.active && !this.active.destroyed) {
      try {
        this.active.destroy();
      } catch {
        // Best-effort cleanup — never let FX teardown freeze the game.
      }
    }
    this.active = null;
  }

  isClear(): boolean {
    return !this.active || this.active.destroyed;
  }

  activeCount(): number {
    return this.active && !this.active.destroyed ? 1 : 0;
  }
}
