import { otherLayer, type ShiftLayerId } from '../data/shiftLayers';

/** Rift Lord layer hop cadence (warn → hop within one cycle). */
export const BOSS_SHIFT_INTERVAL_MS = 5500;

/** Lead time before the hop so the player can prepare SHIFT. */
export const BOSS_SHIFT_WARN_MS = 800;

export type BossShiftEvent =
  | { phase: 'warn'; nextLayer: ShiftLayerId }
  | { phase: 'hop'; layer: ShiftLayerId };

/**
 * Pure boss layer toggle — WorldScene applies to the Enemy instance.
 * Each cycle: warn at (interval − warnMs), then hop at interval.
 */
export class BossShiftBrain {
  private _layer: ShiftLayerId = 'ash';
  private elapsed = 0;
  private warned = false;

  get layer(): ShiftLayerId {
    return this._layer;
  }

  /**
   * Advance timer. Returns warn / hop events, else null.
   */
  tick(dtMs: number): BossShiftEvent | null {
    this.elapsed += dtMs;
    const warnAt = BOSS_SHIFT_INTERVAL_MS - BOSS_SHIFT_WARN_MS;
    if (!this.warned && this.elapsed >= warnAt) {
      this.warned = true;
      return { phase: 'warn', nextLayer: otherLayer(this._layer) };
    }
    if (this.elapsed >= BOSS_SHIFT_INTERVAL_MS) {
      this.elapsed = 0;
      this.warned = false;
      this._layer = otherLayer(this._layer);
      return { phase: 'hop', layer: this._layer };
    }
    return null;
  }

  reset(): void {
    this._layer = 'ash';
    this.elapsed = 0;
    this.warned = false;
  }
}
