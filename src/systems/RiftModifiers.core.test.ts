import { describe, expect, test } from 'bun:test';
import {
  getRiftModifier,
  riftModLayerLock,
  rollRiftModifier,
} from './RiftModifiers';
import { SHIFT_LAYERS } from '../data/shiftLayers';

const ALL_IDS = [
  'none',
  'dense',
  'glass',
  'wealthy',
  'swift',
  'veiled',
] as const;

describe('rift modifiers', () => {
  test('every mod id resolves to a def with sane numbers', () => {
    for (const id of ALL_IDS) {
      const mod = getRiftModifier(id);
      expect(mod.id).toBe(id);
      expect(mod.name.length).toBeGreaterThan(0);
      expect(mod.blurb.length).toBeGreaterThan(0);
      expect(mod.hpMult).toBeGreaterThan(0);
      expect(mod.dmgMult).toBeGreaterThan(0);
      expect(mod.speedMult).toBeGreaterThan(0);
      expect(mod.packCountBonus).toBeGreaterThanOrEqual(0);
      expect(mod.lootBump).toBeGreaterThanOrEqual(0);
    }
  });

  test('unknown ids fall back to calm', () => {
    // @ts-expect-error -- deliberately outside the union
    expect(getRiftModifier('nope').id).toBe('none');
  });

  test('swift hunt trades toughness for speed', () => {
    const swift = getRiftModifier('swift');
    expect(swift.speedMult).toBeGreaterThan(1);
    expect(swift.hpMult).toBeLessThan(1);
    expect(swift.packCountBonus).toBeGreaterThan(0);
  });

  test('ashen veil locks every foe to a real layer and pays for it', () => {
    const veiled = getRiftModifier('veiled');
    expect(veiled.lockedLayer).toBe('ash');
    expect(riftModLayerLock(veiled)).toBe('ash');
    expect(SHIFT_LAYERS[veiled.lockedLayer!]).toBeDefined();
    expect(veiled.goldOnKill + veiled.lootBump).toBeGreaterThan(0);
  });

  test('calm and numeric mods leave layers free', () => {
    for (const id of ['none', 'dense', 'glass', 'wealthy', 'swift'] as const) {
      expect(riftModLayerLock(getRiftModifier(id))).toBeNull();
    }
  });

  test('rolls are deterministic for a given rng', () => {
    const stubA = () => 0.5;
    const stubB = () => 0.5;
    expect(rollRiftModifier(stubA).id).toBe(rollRiftModifier(stubB).id);
  });

  test('rolls cover the whole table and never return null', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 512; i++) {
      const mod = rollRiftModifier(() => i / 512);
      expect(mod).toBeDefined();
      seen.add(mod.id);
    }
    expect(seen.size).toBe(ALL_IDS.length);
  });

  test('calm rifts stay rare', () => {
    let calm = 0;
    for (let i = 0; i < 1000; i++) {
      if (rollRiftModifier(() => (i % 1000) / 1000).id === 'none') calm += 1;
    }
    expect(calm).toBeGreaterThan(0);
    expect(calm).toBeLessThan(200);
  });
});
