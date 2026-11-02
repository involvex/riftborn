import { describe, expect, test } from 'bun:test';
import { EventBus, Events } from '../core/EventBus';
import {
  SHIFT_COOLDOWN_MS,
  SHIFT_ENERGY_PER_KILL,
  SHIFT_MAX_ENERGY,
  SHIFT_COST,
  ShiftSystem,
  type ShiftLayerId,
} from './ShiftSystem';

describe('ShiftSystem', () => {
  test('starts on ash with empty energy and no cooldown', () => {
    const bus = new EventBus();
    const shift = new ShiftSystem(bus);
    expect(shift.layer).toBe('ash');
    expect(shift.energy).toBe(0);
    expect(shift.cooldownLeft).toBe(0);
    expect(shift.canShift()).toBe(false);
  });

  test('kills fill energy up to max', () => {
    const shift = new ShiftSystem(new EventBus());
    shift.onKill();
    expect(shift.energy).toBe(SHIFT_ENERGY_PER_KILL);
    for (let i = 0; i < 20; i++) shift.onKill();
    expect(shift.energy).toBe(SHIFT_MAX_ENERGY);
  });

  test('tryShift fails without enough energy', () => {
    const shift = new ShiftSystem(new EventBus());
    expect(shift.tryShift()).toBe(false);
    expect(shift.layer).toBe('ash');
  });

  test('tryShift toggles layer, spends energy, starts cooldown', () => {
    const bus = new EventBus();
    const seen: ShiftLayerId[] = [];
    bus.on(Events.SHIFT_CHANGED, (p) => {
      seen.push((p as { layer: ShiftLayerId }).layer);
    });
    const shift = new ShiftSystem(bus);
    while (shift.energy < SHIFT_COST) shift.onKill();
    expect(shift.tryShift()).toBe(true);
    expect(shift.layer).toBe('shadow');
    expect(shift.energy).toBeLessThan(SHIFT_MAX_ENERGY);
    expect(shift.cooldownLeft).toBe(SHIFT_COOLDOWN_MS);
    expect(seen).toEqual(['shadow']);
  });

  test('cooldown blocks shift until elapsed', () => {
    const shift = new ShiftSystem(new EventBus());
    while (shift.energy < SHIFT_COST) shift.onKill();
    expect(shift.tryShift()).toBe(true);
    while (shift.energy < SHIFT_COST) shift.onKill();
    expect(shift.tryShift()).toBe(false);
    shift.tick(SHIFT_COOLDOWN_MS);
    expect(shift.cooldownLeft).toBe(0);
    expect(shift.tryShift()).toBe(true);
    expect(shift.layer).toBe('ash');
  });

  test('reset restores ash and clears timers', () => {
    const shift = new ShiftSystem(new EventBus());
    while (shift.energy < SHIFT_COST) shift.onKill();
    shift.tryShift();
    shift.reset();
    expect(shift.layer).toBe('ash');
    expect(shift.energy).toBe(0);
    expect(shift.cooldownLeft).toBe(0);
  });

  test('enabled=false blocks shifting (hub)', () => {
    const shift = new ShiftSystem(new EventBus());
    while (shift.energy < SHIFT_COST) shift.onKill();
    shift.setEnabled(false);
    expect(shift.tryShift()).toBe(false);
    expect(shift.layer).toBe('ash');
  });
});
