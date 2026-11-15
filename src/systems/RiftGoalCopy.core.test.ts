import { describe, expect, test } from 'bun:test';
import {
  RIFT_GOAL_LINE,
  bossPhaseToastText,
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
});
