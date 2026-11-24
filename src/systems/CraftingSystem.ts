import { Events, gameEvents } from '../core/EventBus';
import type { GearInstance, RecipeDef } from '../types/game';
import type { CharacterClassId } from '../types/game';
import recipesData from '../data/recipes.json';
import type { InventorySystem } from './InventorySystem';
import { createStarterWeapon, rollGearDrop, rollHubSetPiece } from './ItemGen';
import { hubSetSinkTarget } from './SetChase';

const recipes = recipesData as Record<string, RecipeDef>;

/** Mats Bram spends to forge one missing set slot. */
export const SET_PATCH_COST: { itemId: string; qty: number }[] = [
  { itemId: 'ore', qty: 4 },
  { itemId: 'scrap', qty: 4 },
];

export function listRecipes(): RecipeDef[] {
  return Object.values(recipes);
}

export class CraftingSystem {
  private readonly inventory: InventorySystem;

  constructor(inventory: InventorySystem) {
    this.inventory = inventory;
  }

  canCraft(recipeId: string): boolean {
    const recipe = recipes[recipeId];
    if (!recipe) return false;
    return recipe.ingredients.every(
      (ing) => this.inventory.count(ing.itemId) >= ing.qty,
    );
  }

  craft(recipeId: string, itemLevel = 1, forClass?: CharacterClassId): boolean {
    const recipe = recipes[recipeId];
    if (!recipe || !this.canCraft(recipeId)) return false;
    // Crafted gear rolls for the crafter (default matches the starter weapon).
    const crafter: CharacterClassId = forClass ?? 'warrior';

    const isGearCraft =
      recipe.resultId === 'iron_blade' ||
      recipe.resultId === 'leather_vest' ||
      recipe.resultId === 'rift_blade' ||
      recipe.resultId === 'rift_mail';

    if (isGearCraft && !this.inventory.canAddGear()) return false;
    if (
      !isGearCraft &&
      !this.inventory.canAdd(recipe.resultId, recipe.resultQty)
    ) {
      return false;
    }

    for (const ing of recipe.ingredients) {
      this.inventory.remove(ing.itemId, ing.qty);
    }

    if (recipe.resultId === 'iron_blade') {
      this.inventory.addGear(createStarterWeapon('warrior', 8 + itemLevel), {
        allowAutosell: false,
      });
    } else if (recipe.resultId === 'rift_blade') {
      const blade = rollGearDrop(itemLevel, {
        preferArmor: false,
        forClass: crafter,
        lootTier: 3,
      });
      blade.name = 'Rift Blade';
      blade.baseId = 'rift_blade';
      this.inventory.addGear(blade, { allowAutosell: false });
    } else if (recipe.resultId === 'leather_vest') {
      const gear = rollGearDrop(itemLevel, {
        preferArmor: true,
        forClass: 'mystic',
      });
      gear.slot = 'chest';
      gear.setId = 'ashen';
      gear.classId = 'mystic';
      gear.name = 'Crafted Ashen Vest';
      gear.baseId = 'ashen_chest';
      this.inventory.addGear(gear, { allowAutosell: false });
    } else if (recipe.resultId === 'rift_mail') {
      const mail = rollGearDrop(itemLevel, {
        preferArmor: true,
        forClass: crafter,
        lootTier: 3,
      });
      mail.slot = 'chest';
      mail.name = 'Rift Mail';
      mail.baseId = 'rift_mail';
      this.inventory.addGear(mail, { allowAutosell: false });
    } else {
      this.inventory.add(recipe.resultId, recipe.resultQty);
    }

    gameEvents.emit(Events.CRAFT_SUCCESS, { recipeId });
    return true;
  }

  /** Bram forge — spend mats for the next missing class-set slot. */
  canCraftSetPatch(classId: CharacterClassId): boolean {
    const sink = hubSetSinkTarget(
      classId,
      this.inventory.equipment,
      this.inventory.slots,
    );
    if (!sink) return false;
    if (!this.inventory.canAddGear()) return false;
    return SET_PATCH_COST.every(
      (ing) => this.inventory.count(ing.itemId) >= ing.qty,
    );
  }

  craftSetPatch(
    classId: CharacterClassId,
    playerLevel = 1,
  ): { ok: true; gear: GearInstance } | { ok: false; reason: string } {
    const sink = hubSetSinkTarget(
      classId,
      this.inventory.equipment,
      this.inventory.slots,
    );
    if (!sink) {
      return { ok: false, reason: 'Set complete — nothing to forge' };
    }
    if (!this.inventory.canAddGear()) {
      return { ok: false, reason: 'Bag full' };
    }
    for (const ing of SET_PATCH_COST) {
      if (this.inventory.count(ing.itemId) < ing.qty) {
        return { ok: false, reason: 'Need 4 Ore + 4 Scrap' };
      }
    }
    for (const ing of SET_PATCH_COST) {
      this.inventory.remove(ing.itemId, ing.qty);
    }
    const ilvl = Math.max(
      5,
      2 + Math.floor((Math.max(1, playerLevel) - 1) / 5) + 3,
    );
    const gear = rollHubSetPiece(ilvl, {
      setId: sink.setId,
      slot: sink.slot,
      forClass: classId,
    });
    if (!this.inventory.addGear(gear, { allowAutosell: false })) {
      for (const ing of SET_PATCH_COST) {
        this.inventory.add(ing.itemId, ing.qty);
      }
      return { ok: false, reason: 'Bag full' };
    }
    gameEvents.emit(Events.CRAFT_SUCCESS, { recipeId: 'set_patch' });
    return { ok: true, gear };
  }
}
