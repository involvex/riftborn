import { otherLayer, type ShiftLayerId } from '../data/shiftLayers';

/** Rift Lord layer hop cadence. */
export const BOSS_SHIFT_INTERVAL_MS = 5500;

/**
 * Pure boss layer toggle — WorldScene applies to the Enemy instance.
 */
export class BossShiftBrain {
  private _layer: ShiftLayerId = 'ash';
  private elapsed = 0;

  get layer(): ShiftLayerId {
    return this._layer;
  }

  /**
   * Advance timer. Returns the new layer when a hop fires, else null.
   */
  tick(dtMs: number): ShiftLayerId | null {
    this.elapsed += dtMs;
    if (this.elapsed < BOSS_SHIFT_INTERVAL_MS) return null;
    this.elapsed = 0;
    this._layer = otherLayer(this._layer);
    return this._layer;
  }

  reset(): void {
    this._layer = 'ash';
    this.elapsed = 0;
  }
}
