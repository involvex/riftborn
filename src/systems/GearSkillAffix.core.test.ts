import { describe, expect, test } from 'bun:test';
import {
  namedAffixCooldown,
  namedAffixPower,
  namedAffixTargets,
} from './GearSkillAffix';
import type { GearInstance } from '../types/game';
import type { EquipmentSlots } from '../types/save';

function bladeWith(
  affixes: NonNullable<GearInstance['affixes']>,
): EquipmentSlots {
  const weapon: GearInstance = {
    uid: 'w1',
    baseId: 'iron_blade',
    name: 'Fork Blade',
    slot: 'weapon',
    setId: null,
    classId: 'warrior',
    rarity: 'rare',
    itemLevel: 12,
    stats: {
      strength: 2,
      dexterity: 0,
      stamina: 0,
      intellect: 0,
      armor: 0,
      damage: 10,
      skillPower: 0,
    },
    affixes,
  };
  return {
    weapon,
    hat: null,
    chest: null,
    legs: null,
    feet: null,
  };
}

describe('GearSkillAffix', () => {
  test('sums power / cooldown / targets for one skill', () => {
    const eq = bladeWith([
      {
        id: 'a1',
        name: 'Cleave Force',
        skillId: 'cleave',
        kind: 'power',
        value: 0.2,
      },
      {
        id: 'a2',
        name: 'Cleave Haste',
        skillId: 'cleave',
        kind: 'cooldown',
        value: 0.5,
      },
      {
        id: 'a3',
        name: 'Leap Reach',
        skillId: 'leap',
        kind: 'targets',
        value: 1,
      },
    ]);
    expect(namedAffixPower(eq, 'cleave')).toBeCloseTo(0.2);
    expect(namedAffixCooldown(eq, 'cleave')).toBeCloseTo(0.5);
    expect(namedAffixTargets(eq, 'cleave')).toBe(0);
    expect(namedAffixTargets(eq, 'leap')).toBe(1);
    expect(namedAffixPower(eq, 'bash')).toBe(0);
  });
});
