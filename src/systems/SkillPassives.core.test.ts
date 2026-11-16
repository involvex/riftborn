import { describe, expect, test } from 'bun:test';
import {
  incomingDamageMult,
  passiveBarrierMult,
  passiveSkillPower,
} from './SkillPassives';

describe('SkillPassives', () => {
  test('warrior Iron Will reduces incoming damage when ranked', () => {
    expect(incomingDamageMult({})).toBe(1);
    expect(incomingDamageMult({ war_ironwill: 2 })).toBeCloseTo(0.84, 5);
    expect(incomingDamageMult({ war_ironwill: 2 })).toBeLessThan(1);
  });

  test('mystic Rift Attunement adds skill power when ranked', () => {
    expect(passiveSkillPower({})).toBe(0);
    expect(passiveSkillPower({ mys_riftattune: 2 })).toBe(20);
  });

  test('mage Arcane Reservoir boosts barrier HP when ranked', () => {
    expect(passiveBarrierMult({})).toBe(1);
    expect(passiveBarrierMult({ mag_arcaneres: 2 })).toBe(1.5);
  });
});
