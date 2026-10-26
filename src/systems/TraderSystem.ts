import { stackSellValue } from './Economy';
import type { InventorySystem } from './InventorySystem';
import { getItemDef } from './InventorySystem';
import type { SkillSystem } from './SkillSystem';

export type SupplyOffer = {
  id: string;
  label: string;
  blurb: string;
  price: number;
  kind: 'bundle' | 'heal' | 'buff';
  itemId?: string;
  qty?: number;
  healFrac?: number;
  buffMult?: number;
  buffSec?: number;
};

const SUPPLIES: SupplyOffer[] = [
  {
    id: 'scrap_bundle',
    label: 'Bone Scrap ×5',
    blurb: 'Crafting filler',
    price: 8,
    kind: 'bundle',
    itemId: 'scrap',
    qty: 5,
  },
  {
    id: 'wood_bundle',
    label: 'Ash Wood ×5',
    blurb: 'Bench fuel',
    price: 14,
    kind: 'bundle',
    itemId: 'wood',
    qty: 5,
  },
  {
    id: 'ore_bundle',
    label: 'Rift Ore ×5',
    blurb: 'Metal stock',
    price: 28,
    kind: 'bundle',
    itemId: 'ore',
    qty: 5,
  },
  {
    id: 'hide_bundle',
    label: 'Ash Hide ×5',
    blurb: 'Leather stock',
    price: 20,
    kind: 'bundle',
    itemId: 'hide',
    qty: 5,
  },
  {
    id: 'ember_tonic',
    label: 'Ember Tonic',
    blurb: 'Instant heal · 40% max HP',
    price: 28,
    kind: 'heal',
    healFrac: 0.4,
  },
  {
    id: 'edge_oil',
    label: 'Edge Oil',
    blurb: '+25% damage for 30s',
    price: 45,
    kind: 'buff',
    buffMult: 1.25,
    buffSec: 30,
  },
];

/** Mat buyback multiplier vs Mira sellValue (Nix pays more). */
export const MAT_BUYBACK = 1.4;

/**
 * Nix — plaza scrapper: buy supplies, sell materials, patch wounds.
 * Gold sink without a durability system.
 */
export class TraderSystem {
  private readonly inventory: InventorySystem;

  constructor(inventory: InventorySystem) {
    this.inventory = inventory;
  }

  gold(): number {
    return this.inventory.count('gold');
  }

  listSupplies(): SupplyOffer[] {
    return SUPPLIES;
  }

  buySupply(
    offerId: string,
    ctx: {
      hp: number;
      maxHp: number;
      setHp: (n: number) => void;
      skills: SkillSystem;
    },
  ): { ok: true; message: string } | { ok: false; reason: string } {
    const offer = SUPPLIES.find((o) => o.id === offerId);
    if (!offer) return { ok: false, reason: 'Unknown offer' };
    if (this.gold() < offer.price) {
      return { ok: false, reason: `Need ${offer.price} gold` };
    }
    if (offer.kind === 'bundle') {
      const id = offer.itemId!;
      const qty = offer.qty ?? 1;
      if (!this.inventory.remove('gold', offer.price)) {
        return { ok: false, reason: 'Need more gold' };
      }
      this.inventory.add(id, qty);
      return { ok: true, message: `Bought ${offer.label}` };
    }
    if (offer.kind === 'heal') {
      if (ctx.hp >= ctx.maxHp) {
        return { ok: false, reason: 'Already full health' };
      }
      if (!this.inventory.remove('gold', offer.price)) {
        return { ok: false, reason: 'Need more gold' };
      }
      const heal = Math.floor(ctx.maxHp * (offer.healFrac ?? 0.4));
      ctx.setHp(Math.min(ctx.maxHp, ctx.hp + heal));
      return { ok: true, message: `Ember Tonic — +${heal} HP` };
    }
    if (offer.kind === 'buff') {
      if (!this.inventory.remove('gold', offer.price)) {
        return { ok: false, reason: 'Need more gold' };
      }
      ctx.skills.applyShrineBuff(offer.buffMult ?? 1.25, offer.buffSec ?? 30);
      return {
        ok: true,
        message: `Edge Oil — +${Math.round(((offer.buffMult ?? 1.25) - 1) * 100)}% dmg ${offer.buffSec ?? 30}s`,
      };
    }
    return { ok: false, reason: 'Unknown offer' };
  }

  /** Materials Nix will buy (not gear / tools / gold). */
  matBuyPrice(itemId: string): number {
    const def = getItemDef(itemId);
    if (!def || def.kind !== 'material') return 0;
    const base = stackSellValue(itemId);
    if (base <= 0) return 0;
    return Math.max(1, Math.floor(base * MAT_BUYBACK));
  }

  sellMaterial(
    itemId: string,
    qty: number,
  ): { ok: true; gold: number } | { ok: false; reason: string } {
    const unit = this.matBuyPrice(itemId);
    if (unit <= 0) return { ok: false, reason: 'Nix won’t buy that' };
    const have = this.inventory.count(itemId);
    const n = Math.min(qty, have);
    if (n <= 0) return { ok: false, reason: 'None to sell' };
    if (!this.inventory.remove(itemId, n)) {
      return { ok: false, reason: 'Sell failed' };
    }
    const gold = unit * n;
    this.inventory.add('gold', gold);
    return { ok: true, gold };
  }

  /** Full heal gold cost from missing HP. */
  patchCost(hp: number, maxHp: number): number {
    const missing = Math.max(0, maxHp - hp);
    if (missing <= 0) return 0;
    return Math.max(8, Math.ceil(missing * 0.45) + 5);
  }

  patchWounds(
    hp: number,
    maxHp: number,
    setHp: (n: number) => void,
  ): { ok: true; gold: number } | { ok: false; reason: string } {
    const cost = this.patchCost(hp, maxHp);
    if (cost <= 0) return { ok: false, reason: 'Already patched up' };
    if (this.gold() < cost) {
      return { ok: false, reason: `Need ${cost} gold` };
    }
    if (!this.inventory.remove('gold', cost)) {
      return { ok: false, reason: `Need ${cost} gold` };
    }
    setHp(maxHp);
    return { ok: true, gold: cost };
  }
}
