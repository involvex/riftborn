import type { EventBus } from '../core/EventBus';
import { Events } from '../core/EventBus';
import { otherLayer, type ShiftLayerId } from '../data/shiftLayers';

export type { ShiftLayerId } from '../data/shiftLayers';

export const SHIFT_COOLDOWN_MS = 3000;
export const SHIFT_MAX_ENERGY = 100;
export const SHIFT_COST = 50;
export const SHIFT_ENERGY_PER_KILL = 25;

export type ShiftChangedPayload = {
  layer: ShiftLayerId;
  previous: ShiftLayerId;
};

/**
 * Pure world-shift state: layer, energy from kills, cooldown.
 * Scenes subscribe via Events.SHIFT_CHANGED.
 */
export class ShiftSystem {
  private _layer: ShiftLayerId = 'ash';
  private _energy = 0;
  private _cooldownLeft = 0;
  private _enabled = true;
  private readonly bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  get layer(): ShiftLayerId {
    return this._layer;
  }

  get energy(): number {
    return this._energy;
  }

  get cooldownLeft(): number {
    return this._cooldownLeft;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  setEnabled(on: boolean): void {
    this._enabled = on;
  }

  canShift(): boolean {
    return (
      this._enabled && this._cooldownLeft <= 0 && this._energy >= SHIFT_COST
    );
  }

  onKill(): void {
    this._energy = Math.min(
      SHIFT_MAX_ENERGY,
      this._energy + SHIFT_ENERGY_PER_KILL,
    );
  }

  tick(dtMs: number): void {
    if (this._cooldownLeft <= 0) return;
    this._cooldownLeft = Math.max(0, this._cooldownLeft - dtMs);
  }

  tryShift(): boolean {
    if (!this.canShift()) return false;
    const previous = this._layer;
    this._layer = otherLayer(previous);
    this._energy -= SHIFT_COST;
    this._cooldownLeft = SHIFT_COOLDOWN_MS;
    const payload: ShiftChangedPayload = {
      layer: this._layer,
      previous,
    };
    this.bus.emit(Events.SHIFT_CHANGED, payload);
    return true;
  }

  /** Force layer without energy (boss AI / tests). */
  forceLayer(layer: ShiftLayerId): void {
    if (layer === this._layer) return;
    const previous = this._layer;
    this._layer = layer;
    this.bus.emit(Events.SHIFT_CHANGED, {
      layer,
      previous,
    } satisfies ShiftChangedPayload);
  }

  reset(): void {
    this._layer = 'ash';
    this._energy = 0;
    this._cooldownLeft = 0;
    this._enabled = true;
  }
}
