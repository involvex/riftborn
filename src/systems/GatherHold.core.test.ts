import { describe, expect, test } from 'bun:test';
import { canRepeatGather, gatherApproachDelta } from './GatherHold';

describe('GatherHold', () => {
  test('canRepeatGather needs hold + ready cooldown', () => {
    expect(
      canRepeatGather({ held: true, uiBlocked: false, cooldownLeft: 0 }),
    ).toBe(true);
    expect(
      canRepeatGather({ held: false, uiBlocked: false, cooldownLeft: 0 }),
    ).toBe(false);
    expect(
      canRepeatGather({ held: true, uiBlocked: true, cooldownLeft: 0 }),
    ).toBe(false);
    expect(
      canRepeatGather({ held: true, uiBlocked: false, cooldownLeft: 0.1 }),
    ).toBe(false);
  });

  test('gatherApproachDelta walks until stopRange', () => {
    const far = gatherApproachDelta({ x: 0, y: 0 }, { x: 3, y: 0 }, 1.4);
    expect(far.inRange).toBe(false);
    expect(far.x).toBeCloseTo(1);
    expect(far.y).toBeCloseTo(0);

    const near = gatherApproachDelta({ x: 0, y: 0 }, { x: 1, y: 0 }, 1.4);
    expect(near.inRange).toBe(true);
    expect(near.x).toBe(0);
    expect(near.y).toBe(0);
  });
});
