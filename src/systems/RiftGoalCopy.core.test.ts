import { describe, expect, test } from 'bun:test';
import {
  RIFT_GOAL_LINE,
  bossPhaseToastText,
  bossShiftHopToastText,
  bossShiftWarnToastText,
  riftEnterToastText,
  riftGoalHint,
  riftHudLabel,
  veiledWrongLayerToast,
} from './RiftGoalCopy';

describe('RiftGoalCopy', () => {
  test('enter toast is the mod blurb, not the full contract', () => {
    const text = riftEnterToastText({
      depthLabel: 'D3',
      modName: 'Ashen Veil',
      modBlurb: 'Every foe lives on Asche only.',
      biomeName: 'Aschen-Krypta',
    });
    expect(text).toBe('Ashen Veil — Every foe lives on Asche only.');
    expect(text).not.toContain(RIFT_GOAL_LINE);
    expect(text).not.toContain('D3');
  });

  test('enter toast appends a depth rule when present', () => {
    const text = riftEnterToastText({
      depthLabel: 'Depth 7',
      modName: 'Dense Packs',
      modBlurb: 'More foes in every room.',
      ruleName: 'Relentless Tide',
      ruleBlurb: 'Packs swell and chase harder.',
    });
    expect(text).toContain('Relentless Tide');
    expect(text).toContain('Packs swell');
  });

  test('hud label carries biome, depth, and the kill goal', () => {
    const text = riftHudLabel({
      biomeName: 'Kristallhöhle',
      depth: 1,
      kills: 2,
      goal: 13,
      phase: 'fill',
      modName: 'Calm Rift',
    });
    expect(text).toContain('Crystal D1');
    expect(text).toContain('2/13');
    expect(text).not.toContain('Calm');
  });

  test('hud label shortens Schattenwald so it fits beside the meter', () => {
    const text = riftHudLabel({
      biomeName: 'Schattenwald',
      depth: 1,
      kills: 0,
      goal: 10,
      phase: 'fill',
      modName: 'Glass Cannon',
    });
    expect(text.startsWith('Woods D1')).toBe(true);
    expect(text).toContain('Glass');
  });

  test('hud label names a spicy mod and the boss phase', () => {
    const text = riftHudLabel({
      biomeName: 'Aschen-Krypta',
      depth: 4,
      kills: 16,
      goal: 16,
      phase: 'boss',
      modName: 'Dense Packs',
      ruleName: 'Relentless Tide',
    });
    expect(text).toContain('Crypt D4');
    expect(text).toContain('Boss');
    expect(text).toContain('Dense');
    expect(text).toContain('Relent');
  });

  test('veil toast names the lock layer and shift bind', () => {
    const text = veiledWrongLayerToast({
      modName: 'Ashen Veil',
      lockedLayerName: 'Asche',
      shiftLabel: 'Q',
    });
    expect(text).toContain('Asche');
    expect(text).toContain('Q');
    expect(text.toLowerCase()).toContain('not broken');
  });

  test('rift goal hint uses the live shift label', () => {
    expect(riftGoalHint('Q')).toContain('Q');
    expect(riftGoalHint('SHIFT')).toContain(RIFT_GOAL_LINE);
  });

  test('boss phase toast ties the emerge to Exit', () => {
    const text = bossPhaseToastText({
      bossName: 'Rift Lord',
      depthLabel: 'D1',
    });
    expect(text).toContain('Rift Lord');
    expect(text).toContain('Exit');
    expect(text).toContain('D1');
  });

  test('boss shift warn names the next layer', () => {
    const text = bossShiftWarnToastText({
      bossName: 'Rift Lord',
      nextLayerName: 'Schatten',
    });
    expect(text).toContain('Rift Lord');
    expect(text).toContain('Schatten');
  });

  test('boss shift hop names the landed layer', () => {
    const text = bossShiftHopToastText({
      bossName: 'Rift Lord',
      layerName: 'Asche',
    });
    expect(text).toContain('shifts to Asche');
  });
});
