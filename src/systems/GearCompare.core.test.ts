import { describe, expect, test } from 'bun:test';
import type { GearInstance, GearStats } from '../types/game';
import {
  buildGearTooltipLines,
  compareGearStats,
  formatCompareDelta,
  summarizeCompare,
} from './GearCompare';

function gear(
  partial: Partial<GearInstance> & { stats: GearStats },
): GearInstance {
  return {
    uid: 't',
    baseId: 'x',
    name: 'Test',
    slot: 'weapon',
    setId: null,
    classId: null,
    rarity: 'common',
    itemLevel: 1,
    ...partial,
  };
}

const empty: GearStats = {
  strength: 0,
  dexterity: 0,
  stamina: 0,
  intellect: 0,
  armor: 0,
  damage: 0,
  skillPower: 0,
};

describe('GearCompare', () => {
  test('marks positive deltas as better (green)', () => {
    const cand = gear({
      stats: { ...empty, damage: 12, strength: 4 },
    });
    const eq = gear({
      stats: { ...empty, damage: 8, strength: 5 },
    });
    const rows = compareGearStats(cand, eq);
    const dmg = rows.find((r) => r.key === 'damage')!;
    const str = rows.find((r) => r.key === 'strength')!;
    expect(dmg.delta).toBe(4);
    expect(dmg.tone).toBe('better');
    expect(str.delta).toBe(-1);
    expect(str.tone).toBe('worse');
  });

  test('omits zero deltas and treats missing equip as all gains', () => {
    const cand = gear({
      stats: { ...empty, armor: 6, damage: 0 },
    });
    const rows = compareGearStats(cand, null);
    expect(rows.every((r) => r.delta > 0 || r.key === 'armor')).toBe(true);
    const arm = rows.find((r) => r.key === 'armor')!;
    expect(arm.delta).toBe(6);
    expect(arm.tone).toBe('better');
    expect(rows.find((r) => r.key === 'damage')).toBeUndefined();
  });

  test('formatCompareDelta uses +/- and summarize net score', () => {
    expect(formatCompareDelta(3)).toBe('+3');
    expect(formatCompareDelta(-2)).toBe('-2');
    expect(formatCompareDelta(0)).toBe('0');
    const rows = compareGearStats(
      gear({ stats: { ...empty, damage: 10, armor: 1 } }),
      gear({ stats: { ...empty, damage: 7, armor: 3 } }),
    );
    const sum = summarizeCompare(rows);
    expect(sum.net).toBe(10 - 7 + (1 - 3));
    expect(sum.betterCount).toBe(1);
    expect(sum.worseCount).toBe(1);
  });

  test('tooltip lines include rarity title and green/red compare', () => {
    const cand = gear({
      rarity: 'rare',
      name: 'Ash Blade',
      stats: { ...empty, damage: 14, strength: 2 },
    });
    const eq = gear({
      stats: { ...empty, damage: 10, strength: 4 },
    });
    const lines = buildGearTooltipLines(cand, eq, { sellGold: 12 });
    expect(lines[0]?.text).toContain('Ash Blade');
    expect(lines[0]?.color).toBe('#4da6ff');
    const dmg = lines.find(
      (l) => l.text.includes('DMG') && l.text.includes('+'),
    );
    const str = lines.find(
      (l) => l.text.includes('STR') && l.text.includes('-'),
    );
    expect(dmg?.color).toBe('#6ecf7a');
    expect(str?.color).toBe('#e07070');
    expect(lines.some((l) => l.text.includes('Sell 12g'))).toBe(true);
  });
});
