import { describe, expect, test } from 'bun:test';
import {
  BOSS_VOLLEY_SPREAD,
  bossSignatureKind,
  bossSignaturePunishToast,
  bossSignatureTelegraph,
  bossSignatureWarnToast,
  volleyAimPoint,
} from './BossSignature';

describe('BossSignature', () => {
  test('maps each biome boss to a distinct tell', () => {
    expect(bossSignatureKind('rift_lord')).toBe('shift_hop');
    expect(bossSignatureKind('crystal_lord')).toBe('kite_wail');
    expect(bossSignatureKind('grove_alpha')).toBe('charge');
    expect(bossSignatureKind('salt_warden')).toBe('volley');
    expect(bossSignatureKind('unknown')).toBe('shift_hop');
  });

  test('telegraph kinds match the tell', () => {
    expect(bossSignatureTelegraph('kite_wail')).toBe('wail');
    expect(bossSignatureTelegraph('charge')).toBe('rush');
    expect(bossSignatureTelegraph('volley')).toBe('shot');
    expect(bossSignatureTelegraph('shift_hop')).toBe('wail');
  });

  test('warn / punish copy names the boss and the tell', () => {
    expect(
      bossSignatureWarnToast({
        bossName: 'Crystal Revenant',
        kind: 'kite_wail',
      }),
    ).toMatch(/Crystal Revenant/);
    expect(
      bossSignaturePunishToast({
        bossName: 'Salt Warden',
        kind: 'volley',
      }),
    ).toMatch(/volley/i);
    expect(
      bossSignatureWarnToast({
        bossName: 'Rift Lord',
        kind: 'shift_hop',
        nextLayerName: 'Shadow',
      }),
    ).toMatch(/Shadow/);
  });

  test('volley has a center shot and two side angles', () => {
    expect(BOSS_VOLLEY_SPREAD).toHaveLength(3);
    expect(BOSS_VOLLEY_SPREAD[1]).toBe(0);
    const mid = volleyAimPoint({ x: 0, y: 0 }, { x: 2, y: 0 }, 0);
    expect(mid.x).toBeCloseTo(2);
    expect(mid.y).toBeCloseTo(0);
  });
});
