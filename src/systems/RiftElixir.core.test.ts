import { describe, expect, test } from 'bun:test';
import {
  GROVE_ATTACK_TICK_MULT,
  SALT_CHARM_SHOT_MULT,
  attackTickDt,
  getRiftElixirDef,
  isRiftElixirId,
  parseElixirIds,
  shotDamageWithSalt,
} from './RiftElixir';

describe('RiftElixir', () => {
  test('four biome sinks are elixirs', () => {
    for (const id of [
      'ashen_charm',
      'crystal_lens',
      'grove_tonic',
      'salt_charm',
    ]) {
      expect(isRiftElixirId(id)).toBe(true);
      expect(getRiftElixirDef(id)?.armToast.length).toBeGreaterThan(0);
    }
    expect(isRiftElixirId('scrap')).toBe(false);
  });

  test('parseElixirIds dedupes and drops junk', () => {
    expect(
      parseElixirIds(['ashen_charm', 'nope', 'ashen_charm', 'salt_charm']),
    ).toEqual(['ashen_charm', 'salt_charm']);
    expect(parseElixirIds(null)).toEqual([]);
  });

  test('salt halves shot damage (floor, min 1)', () => {
    expect(shotDamageWithSalt(20, false)).toBe(20);
    expect(shotDamageWithSalt(20, true)).toBe(
      Math.floor(20 * SALT_CHARM_SHOT_MULT),
    );
    expect(shotDamageWithSalt(1, true)).toBe(1);
  });

  test('grove slows attack timer ticks', () => {
    expect(attackTickDt(1, true, true)).toBeCloseTo(GROVE_ATTACK_TICK_MULT, 5);
    expect(attackTickDt(1, true, false)).toBe(1);
    expect(attackTickDt(1, false, true)).toBe(1);
  });
});
