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

  test('bramble kill completes the elite bounty', () => {
    const b = new BountySystem();
    b.load({
      bounty: {
        kind: 'bramble',
        label: 'Crush the Ash Bramble',
        target: 1,
        progress: 0,
        rewardGold: 50,
        rewardXp: 45,
      },
      lastKind: 'shrine',
      cooldownLeft: 0,
    });
    expect(b.noteBrambleKill()?.kind).toBe('bramble');
    expect(b.statusLine()).toBeNull();
  });
});

describe('BountySystem forge contract', () => {
  test('forge pays a craft-sink item and persists', () => {
    const b = new BountySystem();
    b.load({
      bounty: {
        kind: 'forge',
        label: 'Forge contract — cull for Bram',
        target: 2,
        progress: 0,
        rewardGold: 25,
        rewardXp: 35,
        rewardItemId: 'crystal_lens',
      },
      lastKind: 'cull',
      cooldownLeft: 0,
    });
    expect(b.noteWildernessKill()).toBeNull();
    const done = b.noteWildernessKill();
    expect(done?.kind).toBe('forge');
    expect(done?.rewardItemId).toBe('crystal_lens');
    expect(b.statusLine()).toBeNull();
  });

  test('forge contract survives toSave/load with rewardItemId', () => {
    const b = new BountySystem();
    b.load({
      bounty: {
        kind: 'forge',
        label: 'Forge contract — cull for Bram',
        target: 10,
        progress: 3,
        rewardGold: 25,
        rewardXp: 35,
        rewardItemId: 'grove_tonic',
      },
      lastKind: 'scout',
      cooldownLeft: 0,
    });
    const slice = b.toSave();
    const b2 = new BountySystem();
    b2.load(slice);
    expect(b2.active?.kind).toBe('forge');
    expect(b2.active?.rewardItemId).toBe('grove_tonic');
    expect(b2.active?.progress).toBe(3);
  });
});

describe('BountySystem rift contracts', () => {
  test('rift clear and boss complete from notes', () => {
    const clear = new BountySystem();
    clear.load({
      bounty: {
        kind: 'rift_clear',
        label: 'Clear a rift',
        target: 1,
        progress: 0,
        rewardGold: 55,
        rewardXp: 50,
      },
      lastKind: 'cull',
      cooldownLeft: 0,
    });
    expect(clear.noteRiftClear()?.kind).toBe('rift_clear');
    expect(clear.statusLine()).toBeNull();

    const boss = new BountySystem();
    boss.load({
      bounty: {
        kind: 'rift_boss',
        label: 'Slay a Rift Lord',
        target: 1,
        progress: 0,
        rewardGold: 60,
        rewardXp: 55,
      },
      lastKind: 'rift_clear',
      cooldownLeft: 0,
    });
    expect(boss.noteRiftBoss()?.kind).toBe('rift_boss');
  });

  test('rift mat accumulates to target', () => {
    const b = new BountySystem();
    b.load({
      bounty: {
        kind: 'rift_mat',
        label: 'Gather biome mats in a rift',
        target: 4,
        progress: 0,
        rewardGold: 40,
        rewardXp: 35,
      },
      lastKind: 'rift_boss',
      cooldownLeft: 0,
    });
    expect(b.noteRiftMat(2)).toBeNull();
    expect(b.active?.progress).toBe(2);
    expect(b.noteRiftMat(2)?.kind).toBe('rift_mat');
    expect(b.statusLine()).toBeNull();
  });
});
