import { describe, expect, test } from 'bun:test';
import type { GearInstance } from '../types/game';
import type { EquipmentSlots, InventorySlot } from '../types/save';
import {
  chaseLineAfterGain,
  classSetId,
  hudSetChaseLines,
  missingSetSlots,
  ownedSetSlots,
  setChaseDropBias,
  setChaseStatus,
  slotShortLabel,
} from './SetChase';

function piece(
  setId: string,
  slot: 'hat' | 'chest' | 'legs' | 'feet',
): GearInstance {
  return {
    uid: `${slot}-${setId}`,
    baseId: 'base',
    name: 'Piece',
    slot,
    setId,
    classId: 'mystic',
    rarity: 'common',
    itemLevel: 1,
    stats: {
      strength: 0,
      dexterity: 0,
      stamina: 0,
      intellect: 0,
      armor: 1,
      damage: 0,
      skillPower: 0,
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

describe('SetChase', () => {
  test('maps class to set id', () => {
    expect(classSetId('warrior')).toBe('bone');
    expect(classSetId('mage')).toBe('riftbound');
    expect(classSetId('mystic')).toBe('ashen');
  });

  test('slot labels stay short for HUD', () => {
    expect(slotShortLabel('chest')).toBe('Chest');
    expect(slotShortLabel('hat')).toBe('Hat');
  });

  test('bag pieces count toward owned slots', () => {
    const eq = equipment([piece('ashen', 'hat'), null, null, null]);
    const bag: InventorySlot[] = [
      { kind: 'gear', item: piece('ashen', 'legs') },
    ];
    const owned = ownedSetSlots('ashen', eq, bag);
    expect([...owned].sort()).toEqual(['hat', 'legs']);
    expect(missingSetSlots(owned)).toEqual(['chest', 'feet']);
  });

  test('chase line names the next missing slot from 1pc', () => {
    const status = setChaseStatus(
      'ashen',
      equipment([piece('ashen', 'hat'), null, null, null]),
    );
    expect(status?.line).toBe('Ashen 1/4 · need Chest');
    expect(status?.owned).toBe(1);
    expect(status?.worn).toBe(1);
  });

  test('null chase when no pieces owned', () => {
    expect(
      setChaseStatus('ashen', equipment([null, null, null, null])),
    ).toBeNull();
  });

  test('drop bias prefers missing slots until the set is complete', () => {
    const eq = equipment([piece('ashen', 'hat'), null, null, null]);
    const bias = setChaseDropBias('mystic', eq, []);
    expect(bias.preferSetId).toBe('ashen');
    expect(bias.preferSlots).toEqual(['chest', 'legs', 'feet']);
    const full = setChaseDropBias(
      'mystic',
      equipment([
        piece('ashen', 'hat'),
        piece('ashen', 'chest'),
        piece('ashen', 'legs'),
        piece('ashen', 'feet'),
      ]),
    );
    expect(full).toEqual({});
  });

  test('HUD shows class chase from 1pc', () => {
    const lines = hudSetChaseLines(
      'mystic',
      equipment([null, null, null, null]),
      [{ kind: 'gear', item: piece('ashen', 'feet') }],
    );
    expect(lines).toEqual([{ text: 'Ashen 1/4 · need Hat', color: '#8B5A2B' }]);
  });

  test('pickup toast line includes progress after gain', () => {
    const eq = equipment([null, null, null, null]);
    const line = chaseLineAfterGain(piece('ashen', 'chest'), eq, []);
    expect(line).toBe('Ashen 1/4 · need Hat');
  });
});
