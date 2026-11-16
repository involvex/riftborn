import { describe, expect, test } from 'bun:test';
import {
  RIFT_GOAL_LINE,
  bossPhaseToastText,
  bossShiftHopToastText,
  bossShiftWarnToastText,
  riftEnterToastText,
  riftGoalHint,
  veiledWrongLayerToast,
} from './RiftGoalCopy';

describe('RiftGoalCopy', () => {
  test('enter toast leads with Kill → Boss → Exit', () => {
    const text = riftEnterToastText({
      depthLabel: 'D3',
      modName: 'Ashen Veil',
      modBlurb: 'Every foe lives on Asche only.',
    });
    expect(text).toContain(RIFT_GOAL_LINE);
    expect(text).toContain('D3');
    expect(text).toContain('Ashen Veil');
    expect(text.indexOf(RIFT_GOAL_LINE)).toBeLessThan(
      text.indexOf('Ashen Veil'),
    );
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

  test('enter toast can lead with biome name', () => {
    const text = riftEnterToastText({
      depthLabel: 'Depth 1',
      modName: 'Calm Rift',
      modBlurb: 'No special rules.',
      biomeName: 'Kristallhöhle',
    });
    expect(text.startsWith('Kristallhöhle')).toBe(true);
    expect(text).toContain(RIFT_GOAL_LINE);
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
