import { describe, expect, it } from 'bun:test';
import {
  ENEMY_SHIFT_LAYER,
  enemyActiveOnLayer,
  enemyShiftLayer,
  otherLayer,
} from './shiftLayers';

describe('rift biome enemies have explicit shift layers', () => {
  it('maps the E1–E4 rift foes onto ash/shadow', () => {
    expect(enemyShiftLayer('enemy_rift_goblin')).toBe('ash');
    expect(enemyShiftLayer('enemy_bone_archer')).toBe('ash');
    expect(enemyShiftLayer('enemy_shadow_wolf')).toBe('shadow');
    expect(enemyShiftLayer('enemy_rift_wraith')).toBe('shadow');
  });

  it('keeps the original enemy mapping intact', () => {
    expect(enemyShiftLayer('ash_scamp')).toBe('ash');
    expect(enemyShiftLayer('shade')).toBe('shadow');
    expect(enemyShiftLayer('wisp')).toBe('both');
    expect(enemyShiftLayer('rift_lord')).toBe('both');
  });

  it('falls back to both for unknown ids', () => {
    expect(enemyShiftLayer('not_a_real_enemy')).toBe('both');
  });

  it('has an entry for every rift biome enemy id', () => {
    for (const id of [
      'enemy_rift_goblin',
      'enemy_shadow_wolf',
      'enemy_bone_archer',
      'enemy_rift_wraith',
    ]) {
      expect(ENEMY_SHIFT_LAYER[id]).toBeDefined();
    }
  });
});

describe('enemyActiveOnLayer', () => {
  it('hides layer-specific foes on the other layer', () => {
    expect(enemyActiveOnLayer('ash', 'ash')).toBe(true);
    expect(enemyActiveOnLayer('ash', 'shadow')).toBe(false);
    expect(enemyActiveOnLayer('shadow', 'shadow')).toBe(true);
    expect(enemyActiveOnLayer('shadow', 'ash')).toBe(false);
  });

  it('keeps both-layer foes active everywhere', () => {
    expect(enemyActiveOnLayer('both', 'ash')).toBe(true);
    expect(enemyActiveOnLayer('both', 'shadow')).toBe(true);
  });
});

describe('otherLayer', () => {
  it('flips ash and shadow', () => {
    expect(otherLayer('ash')).toBe('shadow');
    expect(otherLayer('shadow')).toBe('ash');
  });
});
