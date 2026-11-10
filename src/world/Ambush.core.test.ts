import { describe, expect, test } from 'bun:test';
import { shouldTriggerAmbush, type AmbushDef } from './Ambush';

const AMBUSH: AmbushDef = {
  id: 'sunken_rift',
  enemyId: 'enemy_rift_wraith',
  count: 2,
  x: 21.5,
  y: 56.5,
  radius: 5,
};

describe('shouldTriggerAmbush', () => {
  test('triggers when the player walks inside the radius', () => {
    expect(
      shouldTriggerAmbush({
        ambush: AMBUSH,
        playerX: 21.5,
        playerY: 56.5,
        fired: false,
      }),
    ).toBe(true);
  });

  test('triggers at the exact radius edge', () => {
    expect(
      shouldTriggerAmbush({
        ambush: AMBUSH,
        playerX: 26.5,
        playerY: 56.5,
        fired: false,
      }),
    ).toBe(true);
  });

  test('does not trigger outside the radius', () => {
    expect(
      shouldTriggerAmbush({
        ambush: AMBUSH,
        playerX: 28,
        playerY: 56.5,
        fired: false,
      }),
    ).toBe(false);
  });

  test('never triggers twice', () => {
    expect(
      shouldTriggerAmbush({
        ambush: AMBUSH,
        playerX: 21.5,
        playerY: 56.5,
        fired: true,
      }),
    ).toBe(false);
  });

  test('empty ambush never triggers', () => {
    expect(
      shouldTriggerAmbush({
        ambush: { ...AMBUSH, count: 0 },
        playerX: 21.5,
        playerY: 56.5,
        fired: false,
      }),
    ).toBe(false);
  });
});
