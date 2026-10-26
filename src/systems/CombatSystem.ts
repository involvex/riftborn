import { Events, gameEvents } from '../core/EventBus';
import type {
  GearInstance,
  GearRarity,
  LootTableDef,
  LootTier,
} from '../types/game';
import loottables from '../data/loottables.json';
import type { InventorySystem } from './InventorySystem';
import { gearDropChance, rollGearDrop } from './ItemGen';
import type { ProgressionSystem } from './ProgressionSystem';

const tables = loottables as Record<string, LootTableDef>;

export function rollLoot(tableId: string): { itemId: string; qty: number }[] {
  const table = tables[tableId];
  if (!table) return [];
  const out: { itemId: string; qty: number }[] = [];
  for (const roll of table.rolls) {
    if (Math.random() > roll.chance) continue;
    const qty =
      roll.qtyMin + Math.floor(Math.random() * (roll.qtyMax - roll.qtyMin + 1));
    if (qty > 0) out.push({ itemId: roll.itemId, qty });
  }
  return out;
}

export class CombatSystem {
  private readonly inventory: InventorySystem;
  private readonly progression: ProgressionSystem;

  constructor(inventory: InventorySystem, progression: ProgressionSystem) {
    this.inventory = inventory;
    this.progression = progression;
  }

  playerAttackDamage(): number {
    const gear = this.inventory.totalGearStats();
    const def = this.progression.classDef();
    const primaryGear = gear[def.damageStat];
    return (
      this.inventory.weaponDamage() +
      gear.damage +
      this.progression.damageBonus(primaryGear)
    );
  }

  mitigateIncoming(raw: number): number {
    const armor = this.inventory.armorValue();
    return Math.max(1, Math.floor(raw * (100 / (100 + armor * 5))));
  }

  emitDamageNumber(
    screenX: number,
    screenY: number,
    amount: number,
    kind: 'player' | 'enemy',
  ): void {
    gameEvents.emit(Events.DAMAGE_NUMBER, { screenX, screenY, amount, kind });
  }

  grantKillRewards(
    xp: number,
    lootTableId: string,
    opts: {
      elite?: boolean;
      lootTier?: LootTier;
      /** Always drop at least one piece at this rarity+. */
      guaranteedMinRarity?: GearRarity;
      onGear?: (g: GearInstance) => void;
    } = {},
  ): void {
    this.progression.addXp(xp);
    const drops = rollLoot(lootTableId);
    for (const drop of drops) {
      this.inventory.add(drop.itemId, drop.qty);
    }
    const tier: LootTier = opts.lootTier ?? (opts.elite ? 4 : 2);
    const gearChance = opts.guaranteedMinRarity
      ? 1
      : gearDropChance(tier, opts.elite);
    if (Math.random() < gearChance) {
      const gear = rollGearDrop(this.progression.level, {
        elite: opts.elite || tier >= 4,
        preferArmor: Math.random() > (tier === 1 ? 0.4 : 0.28),
        forClass: this.progression.classId,
        lootTier: tier,
        minRarity: opts.guaranteedMinRarity,
      });
      if (this.inventory.addGear(gear)) opts.onGear?.(gear);
    }
    // Boss / high tier: chance at a second piece
    if (tier >= 4 && Math.random() < 0.45) {
      const gear = rollGearDrop(this.progression.level, {
        elite: true,
        preferArmor: Math.random() > 0.5,
        forClass: this.progression.classId,
        lootTier: 4,
      });
      if (this.inventory.addGear(gear)) opts.onGear?.(gear);
    }
    gameEvents.emit(Events.ENEMY_DIED, { xp, drops, lootTier: tier });
  }
}
