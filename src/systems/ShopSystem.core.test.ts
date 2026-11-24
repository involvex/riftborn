import { describe, expect, test } from 'bun:test';
import { InventorySystem } from './InventorySystem';
import {
  grantHubSetSinkReward,
  hubSetSinkPrice,
  hubSinkNpcPrompt,
  hubSinkProximityToast,
  ShopSystem,
} from './ShopSystem';
import type { HubSetSinkTarget } from './SetChase';
import type { GearInstance } from '../types/game';

function piece(
  setId: string,
  slot: 'hat' | 'chest' | 'legs' | 'feet',
): GearInstance {
  return {
    uid: `${slot}-${setId}`,
    baseId: `${setId}_${slot}`,
    name: 'Piece',
    slot,
    setId,
    classId: 'warrior',
    rarity: 'magic',
    itemLevel: 4,
    stats: {
      strength: 1,
      dexterity: 0,
      stamina: 0,
      intellect: 0,
      armor: 2,
      damage: 0,
      skillPower: 0,
    },
  };
}

describe('ShopSystem hub set sink', () => {
  test('lists a chase offer for the next missing Bone slot', () => {
    const inv = new InventorySystem();
    inv.equipment.chest = piece('bone', 'chest');
    const shop = new ShopSystem(inv);
    const offers = shop.listOffers(5, 'warrior');
    const chase = offers.find((o) => o.id === 'set_chase');
    expect(chase?.label).toBe('Chase · Bone Hat');
    expect(chase?.price).toBe(hubSetSinkPrice(5));
    expect(chase?.blurb).toContain('Guaranteed Bone Hat');
  });

  test('buying set_chase grants the missing set slot at magic+', () => {
    const inv = new InventorySystem();
    inv.equipment.chest = piece('bone', 'chest');
    inv.add('gold', 500);
    const shop = new ShopSystem(inv);
    const result = shop.buy('set_chase', 'warrior', 5);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.gear.setId).toBe('bone');
    expect(result.gear.slot).toBe('hat');
    expect(result.gear.rarity).not.toBe('common');
    expect(inv.count('gold')).toBe(500 - hubSetSinkPrice(5));
  });

  test('no chase offer when both warrior kits are complete', () => {
    const inv = new InventorySystem();
    inv.equipment.hat = piece('bone', 'hat');
    inv.equipment.chest = piece('bone', 'chest');
    inv.equipment.legs = piece('bone', 'legs');
    inv.equipment.feet = piece('bone', 'feet');
    for (const slot of ['hat', 'chest', 'legs', 'feet'] as const) {
      inv.addGear(
        { ...piece('bulwark', slot), uid: `bw-${slot}` },
        { allowAutosell: false },
      );
    }
    const shop = new ShopSystem(inv);
    expect(
      shop.listOffers(8, 'warrior').some((o) => o.id === 'set_chase'),
    ).toBe(false);
  });

  test('forge bounty helper grants a missing set piece', () => {
    const inv = new InventorySystem();
    inv.equipment.chest = piece('bone', 'chest');
    const gear = grantHubSetSinkReward(inv, 'warrior', 6);
    expect(gear?.setId).toBe('bone');
    expect(gear?.slot).toBe('hat');
    expect(
      inv.slots.some((s) => s.kind === 'gear' && s.item.setId === 'bone'),
    ).toBe(true);
  });

  test('proximity prompt and toast name the chase slot', () => {
    const sink: HubSetSinkTarget = {
      setId: 'bone',
      setName: 'Bone',
      slot: 'hat',
      slotLabel: 'Hat',
    };
    expect(hubSinkNpcPrompt('vendor', sink)).toBe('E · Chase Bone Hat');
    expect(hubSinkNpcPrompt('crafter', sink)).toBe('E · Patch Bone Hat');
    expect(hubSinkNpcPrompt('vendor', null)).toBe('E · shop');
    expect(hubSinkProximityToast('vendor', sink, 5)).toBe(
      `Mira · Bone Hat · ${hubSetSinkPrice(5)}g · E`,
    );
    expect(hubSinkProximityToast('crafter', sink, 5)).toBe(
      'Bram · Set Patch · Bone Hat · 4 Ore, 4 Scrap · E',
    );
  });
});
