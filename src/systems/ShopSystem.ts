import type { CharacterClassId, GearInstance, GearSlot } from '../types/game';
import type { InventorySlot } from '../types/save';
import { gearSellValue, isJunkGear, stackSellValue } from './Economy';
import { rollGearDrop } from './ItemGen';
import type { InventorySystem } from './InventorySystem';
import { Events, gameEvents } from '../core/EventBus';

export type ShopOffer = {
  id: string;
  label: string;
  blurb: string;
  price: number;
  /** Prefer armor vs weapon when rolling. */
  preferArmor: boolean;
  itemLevel: number;
};

const STOCK: ShopOffer[] = [
  {
    id: 'cheap_armor',
    label: 'Worn Armor Piece',
    blurb: 'Random hat/chest/legs/feet · common–magic',
    price: 35,
    preferArmor: true,
    itemLevel: 2,
  },
  {
    id: 'fine_armor',
    label: 'Fine Armor Piece',
    blurb: 'Better armor roll · ilvl 5',
    price: 90,
    preferArmor: true,
    itemLevel: 5,
  },
  {
    id: 'cheap_weapon',
    label: 'Sidearm',
    blurb: 'Random weapon · starter power',
    price: 45,
    preferArmor: false,
    itemLevel: 2,
  },
  {
    id: 'fine_weapon',
    label: 'Rift-Forged Blade',
    blurb: 'Stronger weapon roll · ilvl 6',
    price: 120,
    preferArmor: false,
    itemLevel: 6,
  },
];

export class ShopSystem {
  private readonly inventory: InventorySystem;

  constructor(inventory: InventorySystem) {
    this.inventory = inventory;
  }

  listOffers(): ShopOffer[] {
    return STOCK;
  }

  gold(): number {
    return this.inventory.count('gold');
  }

  buy(
    offerId: string,
    forClass?: CharacterClassId,
  ): { ok: true; gear: GearInstance } | { ok: false; reason: string } {
    const offer = STOCK.find((o) => o.id === offerId);
    if (!offer) return { ok: false, reason: 'Unknown offer' };
    if (this.gold() < offer.price) {
      return { ok: false, reason: `Need ${offer.price} gold` };
    }
    if (!this.inventory.canAddGear()) {
      return { ok: false, reason: 'Bag full' };
    }
    if (!this.inventory.remove('gold', offer.price)) {
      return { ok: false, reason: 'Need more gold' };
    }
    const gear = rollGearDrop(offer.itemLevel, {
      preferArmor: offer.preferArmor,
      elite: offer.itemLevel >= 5,
      forClass,
      anyClass: true,
    });
    if (!this.inventory.addGear(gear, { allowAutosell: false })) {
      this.inventory.add('gold', offer.price);
      return { ok: false, reason: 'Bag full' };
    }
    return { ok: true, gear };
  }

  sellBagIndex(
    index: number,
  ): { ok: true; gold: number; label: string } | { ok: false; reason: string } {
    const slot = this.inventory.slots[index] as InventorySlot | undefined;
    if (!slot) return { ok: false, reason: 'Empty slot' };
    if (slot.kind === 'stack') {
      const unit = stackSellValue(slot.itemId);
      if (unit <= 0) return { ok: false, reason: 'Cannot sell that' };
      const gold = unit * slot.qty;
      const label = `${slot.itemId} ×${slot.qty}`;
      if (!this.inventory.remove(slot.itemId, slot.qty)) {
        return { ok: false, reason: 'Sell failed' };
      }
      this.inventory.add('gold', gold);
      return { ok: true, gold, label };
    }
    const gold = gearSellValue(slot.item);
    const label = slot.item.name;
    const removed = this.inventory.removeGearUid(slot.item.uid);
    if (!removed) return { ok: false, reason: 'Sell failed' };
    this.inventory.add('gold', gold);
    return { ok: true, gold, label };
  }

  /** Sell every common gear piece in the bag. */
  sellAllJunk(): { count: number; gold: number } {
    let gold = 0;
    let count = 0;
    const junkUids = this.inventory.slots
      .filter(
        (s): s is Extract<InventorySlot, { kind: 'gear' }> =>
          s.kind === 'gear' && isJunkGear(s.item),
      )
      .map((s) => s.item.uid);
    for (const uid of junkUids) {
      const item = this.inventory.removeGearUid(uid);
      if (!item) continue;
      const price = gearSellValue(item);
      this.inventory.add('gold', price);
      gold += price;
      count += 1;
      gameEvents.emit(Events.JUNK_SOLD, { item, gold: price, auto: false });
    }
    return { count, gold };
  }

  /** Hint for HUD — which slots shop can fill. */
  static slotHint(preferArmor: boolean): GearSlot | 'weapon' {
    return preferArmor ? 'chest' : 'weapon';
  }
}
