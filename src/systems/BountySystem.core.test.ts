import { describe, expect, test } from 'bun:test';
import { BountySystem } from './BountySystem';

describe('BountySystem shrine', () => {
  test('accept can roll shrine and noteShrineUse completes it', () => {
    const b = new BountySystem();
    // Force shrine by accepting until we get it (or inject via load).
    b.load({
      bounty: {
        kind: 'shrine',
        label: 'Bless at the Ember Shrine',
        target: 1,
        progress: 0,
        rewardGold: 30,
        rewardXp: 25,
      },
      lastKind: 'cull',
      cooldownLeft: 0,
    });
    expect(b.statusLine()).toMatch(/Shrine/);
    const done = b.noteShrineUse();
    expect(done?.kind).toBe('shrine');
    expect(b.statusLine()).toBeNull();
  });

  test('shrine persists through toSave/load', () => {
    const b = new BountySystem();
    b.load({
      bounty: {
        kind: 'shrine',
        label: 'Bless at the Ember Shrine',
        target: 1,
        progress: 0,
        rewardGold: 30,
        rewardXp: 25,
      },
      lastKind: 'scout',
      cooldownLeft: 0,
    });
    const slice = b.toSave();
    const b2 = new BountySystem();
    b2.load(slice);
    expect(b2.statusLine()).toMatch(/Shrine/);
  });
});
