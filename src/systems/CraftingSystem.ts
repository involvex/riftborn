import { Events, gameEvents } from '../core/EventBus';
import type { RecipeDef } from '../types/game';
import recipesData from '../data/recipes.json';
import type { InventorySystem } from './InventorySystem';
import { createStarterWeapon, rollGearDrop } from './ItemGen';

const recipes = recipesData as Record<string, RecipeDef>;

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

  craft(recipeId: string, itemLevel = 1): boolean {
    const recipe = recipes[recipeId];
    if (!recipe || !this.canCraft(recipeId)) return false;

    const isGearCraft =
      recipe.resultId === 'iron_blade' || recipe.resultId === 'leather_vest';

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
    } else {
      this.inventory.add(recipe.resultId, recipe.resultQty);
    }

    gameEvents.emit(Events.CRAFT_SUCCESS, { recipeId });
    return true;
  }
}
