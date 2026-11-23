import { describe, expect, test } from 'bun:test';
import type { GearInstance, GearStats } from '../types/game';
import {
  gearUpgradeHighlight,
  normalizeRiftEnd,
  riftClearPay,
  riftEndLines,
  riftEndPay,
  riftEndTitle,
} from './RiftEndSummary';

function gear(
  partial: Partial<GearInstance> & { stats: GearStats },
): GearInstance {
  return {
    uid: 't',
    baseId: 'x',
    name: 'Ash Blade',
    slot: 'weapon',
    setId: null,
    classId: null,
    rarity: 'magic',
    itemLevel: 4,
    ...partial,
  };
}

describe('riftEndPay', () => {
  test('clear purse matches pressure step 0', () => {
    expect(riftClearPay(0)).toEqual({ xp: 50, gold: 20, shards: 1 });
    expect(riftEndPay('clear', 0)).toEqual(riftClearPay(0));
  });

  test('abandon is a token of XP and death pays nothing', () => {
    expect(riftEndPay('abandon', 4)).toEqual({ xp: 8, gold: 0, shards: 0 });
    expect(riftEndPay('death', 4)).toEqual({ xp: 0, gold: 0, shards: 0 });
  });

  test('clear scales with pressure', () => {
    const pay = riftClearPay(4);
    expect(pay.xp).toBe(70);
    expect(pay.gold).toBeGreaterThan(20);
    expect(pay.shards).toBeGreaterThanOrEqual(1);
  });
});

describe('riftEndLines', () => {
  test('clear card names biome, mod, kills, and the purse', () => {
    const lines = riftEndLines({
      kind: 'clear',
      inRift: true,
      depth: 3,
      biomeName: 'Aschen-Krypta',
      modName: 'Dense Packs',
      kills: 12,
      goal: 15,
      level: 6,
      gold: 40,
      shards: 2,
      pressureStep: 0,
      gearLine: 'Upgrade · magic Ash Blade · DMG +4',
    }).map((l) => l.text);
    expect(riftEndTitle(normalizeRiftEnd({ kind: 'clear' }))).toBe(
      'Rift Cleared',
    );
    expect(lines[0]).toContain('Aschen-Krypta');
    expect(lines[0]).toContain('D3');
    expect(lines).toContain('Dense Packs');
    expect(lines).toContain('Kills 12/15');
    expect(lines).toContain('+50 XP · +20g · +1 shards');
    expect(lines.some((l) => l.startsWith('Upgrade ·'))).toBe(true);
  });

  test('abandon card keeps gold and grants only the token XP', () => {
    const lines = riftEndLines({
      kind: 'abandon',
      inRift: true,
      depth: 1,
      biomeName: 'Kristallhöhle',
      modName: 'Calm Rift',
      kills: 2,
      goal: 13,
      level: 2,
      gold: 15,
      shards: 0,
      pressureStep: 0,
      lootLeftBehind: true,
    }).map((l) => l.text);
    expect(lines).toContain('+8 XP');
    expect(lines).toContain('Kept 15g · 0 shards');
    expect(lines).toContain('Ground loot left behind');
    expect(lines.join(' ')).not.toContain('+20g');
  });

  test('rift death shows kept goods and half HP', () => {
    const lines = riftEndLines({
      kind: 'death',
      inRift: true,
      depth: 2,
      biomeName: 'Salzwüste',
      modName: 'Glass Cannon',
      kills: 4,
      goal: 14,
      level: 3,
      gold: 9,
      shards: 1,
      hpAfter: 20,
      maxHp: 40,
      playTimeSec: 65,
    }).map((l) => l.text);
    expect(lines).toContain('Kept 9g · 1 shards');
    expect(lines).toContain('Wake at 20/40 HP');
    expect(lines).toContain('Play time: 1:05');
  });

  test('hub death without HP numbers still says half health', () => {
    const lines = riftEndLines({
      kind: 'death',
      inRift: false,
      kills: 0,
      level: 1,
      gold: 0,
    }).map((l) => l.text);
    expect(lines).toContain('Wake at half health');
    expect(lines.some((l) => l.startsWith('Level'))).toBe(true);
  });
});

describe('gearUpgradeHighlight', () => {
  test('names a weapon that beats the equipped damage', () => {
    const have = gear({
      name: 'Old Sword',
      rarity: 'common',
      stats: {
        damage: 4,
        armor: 0,
        strength: 0,
        dexterity: 0,
        stamina: 0,
        intellect: 0,
        skillPower: 0,
      },
    });
    const next = gear({
      stats: {
        damage: 9,
        armor: 0,
        strength: 1,
        dexterity: 0,
        stamina: 0,
        intellect: 0,
        skillPower: 0,
      },
    });
    const hit = gearUpgradeHighlight(next, have);
    expect(hit).not.toBeNull();
    expect(hit!.line).toContain('Ash Blade');
    expect(hit!.line).toContain('DMG +5');
    expect(hit!.score).toBeGreaterThan(0);
  });

  test('ignores a straight downgrade', () => {
    const have = gear({
      stats: {
        damage: 12,
        armor: 0,
        strength: 0,
        dexterity: 0,
        stamina: 0,
        intellect: 0,
        skillPower: 0,
      },
    });
    const next = gear({
      name: 'Dull',
      stats: {
        damage: 3,
        armor: 0,
        strength: 0,
        dexterity: 0,
        stamina: 0,
        intellect: 0,
        skillPower: 0,
      },
    });
    expect(gearUpgradeHighlight(next, have)).toBeNull();
  });
});
