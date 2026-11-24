import { describe, expect, test } from 'bun:test';
import {
  characterSetBonusLines,
  countSetPieces,
  resolveSetBonuses,
  setSkillFamilyMult,
  sumSetStats,
} from './SetBonus';
import type { GearInstance } from '../types/game';
import type { EquipmentSlots } from '../types/save';

function piece(
  setId: string | null,
  slot: 'hat' | 'chest' | 'legs' | 'feet',
  stats: Partial<GearInstance['stats']> = {},
): GearInstance {
  return {
    uid: `${slot}-${setId}`,
    baseId: 'base',
    name: 'Piece',
    slot,
    setId,
    classId: null,
    rarity: 'common',
    itemLevel: 1,
    stats: {
      strength: 0,
      dexterity: 0,
      stamina: 0,
      intellect: 0,
      armor: 0,
      damage: 0,
      skillPower: 0,
      ...stats,
    },
  };
}

function equipment(pieces: (GearInstance | null)[]): EquipmentSlots {
  return {
    weapon: null,
    hat: pieces[0] ?? null,
    chest: pieces[1] ?? null,
    legs: pieces[2] ?? null,
    feet: pieces[3] ?? null,
    tool: null,
  };
}

describe('SetBonus', () => {
  test('counts only the four armor slots', () => {
    const eq = equipment([
      piece('ashen', 'hat'),
      piece('ashen', 'chest'),
      piece(null, 'legs'),
      piece('riftbound', 'feet'),
    ]);
    const counts = countSetPieces(eq);
    expect(counts.get('ashen')).toBe(2);
    expect(counts.get('riftbound')).toBe(1);
    expect(counts.has('bone')).toBe(false);
  });

  test('a single piece is no bonus', () => {
    expect(resolveSetBonuses(equipment([piece('ashen', 'hat')]))).toEqual([]);
  });

  test('2pc activates the two-piece label and stats', () => {
    const active = resolveSetBonuses(
      equipment([piece('ashen', 'hat'), piece('ashen', 'chest')]),
    );
    expect(active).toHaveLength(1);
    expect(active[0]!.setId).toBe('ashen');
    expect(active[0]!.name).toBe('Ashen');
    expect(active[0]!.color).toBe('#8B5A2B');
    expect(active[0]!.pieces).toBe(2);
    expect(active[0]!.labels).toEqual(['2pc: +6 DEX, +5% skill power']);
    expect(active[0]!.stats.dexterity).toBe(6);
    expect(active[0]!.stats.skillPower).toBe(5);
    expect(active[0]!.stats.strength).toBe(0);
  });

  test('4pc stacks both tiers', () => {
    const active = resolveSetBonuses(
      equipment([
        piece('bone', 'hat'),
        piece('bone', 'chest'),
        piece('bone', 'legs'),
        piece('bone', 'feet'),
      ]),
    );
    expect(active).toHaveLength(1);
    expect(active[0]!.pieces).toBe(4);
    expect(active[0]!.labels).toHaveLength(2);
    expect(active[0]!.stats.strength).toBe(8 + 14);
    expect(active[0]!.stats.maxHp).toBe(30);
  });

  test('mixed sets resolve independently', () => {
    const active = resolveSetBonuses(
      equipment([
        piece('ashen', 'hat'),
        piece('ashen', 'chest'),
        piece('riftbound', 'legs'),
        piece('riftbound', 'feet'),
      ]),
    );
    expect(active.map((s) => s.setId).sort()).toEqual(['ashen', 'riftbound']);
    for (const s of active) expect(s.pieces).toBe(2);
  });

  test('unknown set ids are ignored', () => {
    expect(
      resolveSetBonuses(
        equipment([piece('nope', 'hat'), piece('nope', 'chest')]),
      ),
    ).toEqual([]);
  });

  test('sumSetStats aggregates every active bonus', () => {
    const eq = equipment([
      piece('ashen', 'hat'),
      piece('ashen', 'chest'),
      piece('bone', 'legs'),
      piece('bone', 'feet'),
    ]);
    const total = sumSetStats(eq);
    // ashen 2pc + bone 2pc
    expect(total.dexterity).toBe(6);
    expect(total.strength).toBe(8);
    expect(total.skillPower).toBe(10);
    expect(total.maxHp).toBe(0);
  });

  test('Bulwark 4pc is armor/HP with no skill family', () => {
    const eq = equipment([
      piece('bulwark', 'hat'),
      piece('bulwark', 'chest'),
      piece('bulwark', 'legs'),
      piece('bulwark', 'feet'),
    ]);
    const active = resolveSetBonuses(eq);
    expect(active).toHaveLength(1);
    expect(active[0]!.stats.armor).toBe(8 + 14);
    expect(active[0]!.stats.maxHp).toBe(40);
    expect(active[0]!.stats.stamina).toBe(6);
    expect(active[0]!.skillFamily).toBeUndefined();
    expect(setSkillFamilyMult(eq, 'war_cleave')).toBe(0);
  });

  test('Grove 4pc boosts Echo, not Pulse', () => {
    const eq = equipment([
      piece('grove', 'hat'),
      piece('grove', 'chest'),
      piece('grove', 'legs'),
      piece('grove', 'feet'),
    ]);
    expect(setSkillFamilyMult(eq, 'mys_echo')).toBeCloseTo(0.18);
    expect(setSkillFamilyMult(eq, 'mys_pulse')).toBe(0);
  });

  test('C panel lists both class kits with dim bonuses at 0 worn', () => {
    const lines = characterSetBonusLines(
      'mystic',
      equipment([null, null, null, null]),
    );
    expect(lines[0]).toBe('Ashen 0/4 · need Hat, Chest, Legs, Feet');
    expect(lines[1]).toBe('  · 2pc: +6 DEX, +5% skill power');
    expect(lines[2]).toStartWith('  · 4pc:');
    expect(lines[3]).toBe('Grove 0/4 · need Hat, Chest, Legs, Feet');
    expect(lines[4]).toBe('  · 2pc: +8 DEX');
  });

  test('C panel lights 2pc when worn and still shows the other kit', () => {
    const lines = characterSetBonusLines(
      'mystic',
      equipment([piece('ashen', 'hat'), piece('ashen', 'chest'), null, null]),
    );
    expect(lines[0]).toBe('Ashen 2/4 · need Legs, Feet');
    expect(lines[1]).toBe('  ✓ 2pc: +6 DEX, +5% skill power');
    expect(lines[2]).toStartWith('  · 4pc:');
    expect(lines.some((l) => l.startsWith('Grove'))).toBe(true);
    expect(lines.some((l) => l === '  · 2pc: +8 DEX')).toBe(true);
  });

  test('C panel lights 4pc when complete and still lists alternate', () => {
    const lines = characterSetBonusLines(
      'warrior',
      equipment([
        piece('bone', 'hat'),
        piece('bone', 'chest'),
        piece('bone', 'legs'),
        piece('bone', 'feet'),
      ]),
    );
    expect(lines[0]).toBe('Bone 4/4 · complete');
    expect(lines[1]).toStartWith('  ✓ 2pc:');
    expect(lines[2]).toStartWith('  ✓ 4pc:');
    expect(lines.some((l) => l.startsWith('Bulwark'))).toBe(true);
  });

  test('C panel need uses bag pieces for chase slots', () => {
    const bag = [{ kind: 'gear' as const, item: piece('bone', 'legs') }];
    const lines = characterSetBonusLines(
      'warrior',
      equipment([piece('bone', 'hat'), piece('bone', 'chest'), null, null]),
      bag,
    );
    // Legs owned in bag — only Feet still needed
    expect(lines[0]).toBe('Bone 2/4 · need Feet');
    expect(lines[1]).toStartWith('  ✓ 2pc:');
  });
});
