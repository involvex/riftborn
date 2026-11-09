import { describe, expect, test } from 'bun:test';
import { CraftingSystem, listRecipes } from './CraftingSystem';
import { InventorySystem } from './InventorySystem';
import itemsData from '../data/items.json';
import recipesData from '../data/recipes.json';
import type { InventorySlot } from '../types/save';
import { RIFT_BIOMES } from '../data/biomes';

const items = itemsData as Record<string, { kind: string }>;
const recipes = recipesData as Record<
  string,
  { resultId: string; ingredients: { itemId: string; qty: number }[] }
>;

function setup(): { inv: InventorySystem; crafting: CraftingSystem } {
  const inv = new InventorySystem();
  return { inv, crafting: new CraftingSystem(inv) };
}

describe('recipes data', () => {
  test('every recipe is craftable from known materials', () => {
    for (const recipe of listRecipes()) {
      expect(recipe.ingredients.length).toBeGreaterThan(0);
      for (const ing of recipe.ingredients) {
        expect(items[ing.itemId], `${ing.itemId} exists`).toBeDefined();
        expect(items[ing.itemId]!.kind).toBe('material');
        expect(ing.qty).toBeGreaterThan(0);
      }
    }
  });

  test('the two rift gear sinks exist and need biome materials', () => {
    const blade = recipes['rift_blade']!;
    const mail = recipes['rift_mail']!;
    expect(blade).toBeDefined();
    expect(mail).toBeDefined();
    expect(blade.ingredients.some((i) => i.itemId === 'rift_crystal')).toBe(
      true,
    );
    const mailMats = mail.ingredients.map((i) => i.itemId);
    expect(mailMats).toContain('ashen_bone');
    expect(mailMats).toContain('grove_sap');
  });
});

describe('biome loot materials', () => {
  test('each rift biome feeds one unique material', () => {
    const seen = new Set<string>();
    for (const b of RIFT_BIOMES) {
      expect(b.lootMaterial, `${b.id} lootMaterial`).toBeDefined();
      const id = b.lootMaterial!;
      expect(items[id], `${b.id} material ${id}`).toBeDefined();
      expect(items[id]!.kind).toBe('material');
      expect(seen.has(id)).toBe(false);
      seen.add(id);
    }
    expect(seen.size).toBe(RIFT_BIOMES.length);
  });
});

describe('CraftingSystem', () => {
  test('cannot craft without materials', () => {
    const { inv, crafting } = setup();
    expect(crafting.canCraft('rift_blade')).toBe(false);
    expect(crafting.craft('rift_blade', 1)).toBe(false);
    expect(inv.count('ore')).toBe(0);
  });

  test('hatchet consumes wood + ore and yields the tool', () => {
    const { inv, crafting } = setup();
    inv.add('wood', 5);
    inv.add('ore', 2);
    expect(crafting.canCraft('hatchet')).toBe(true);
    expect(crafting.craft('hatchet', 1)).toBe(true);
    expect(inv.count('wood')).toBe(0);
    expect(inv.count('ore')).toBe(0);
    expect(inv.count('hatchet')).toBe(1);
  });

  test('rift blade consumes crystal + ore and yields weapon gear', () => {
    const { inv, crafting } = setup();
    inv.add('rift_crystal', 4);
    inv.add('ore', 3);
    expect(crafting.craft('rift_blade', 4, 'mage')).toBe(true);
    expect(inv.count('rift_crystal')).toBe(0);
    expect(inv.count('ore')).toBe(0);
    const bag = inv.slots
      .filter(
        (s): s is Extract<InventorySlot, { kind: 'gear' }> => s.kind === 'gear',
      )
      .map((s) => s.item);
    expect(bag.length).toBe(1);
    expect(bag[0]!.slot).toBe('weapon');
    expect(bag[0]!.name).toBe('Rift Blade');
  });

  test('rift mail consumes all three biome materials and yields chest gear', () => {
    const { inv, crafting } = setup();
    inv.add('ashen_bone', 5);
    inv.add('grove_sap', 3);
    inv.add('ore', 4);
    expect(crafting.craft('rift_mail', 6, 'warrior')).toBe(true);
    expect(inv.count('ashen_bone')).toBe(0);
    expect(inv.count('grove_sap')).toBe(0);
    expect(inv.count('ore')).toBe(0);
    const bag = inv.slots
      .filter(
        (s): s is Extract<InventorySlot, { kind: 'gear' }> => s.kind === 'gear',
      )
      .map((s) => s.item);
    expect(bag.length).toBe(1);
    expect(bag[0]!.slot).toBe('chest');
    expect(bag[0]!.name).toBe('Rift Mail');
  });

  test('partial materials never craft', () => {
    const { inv, crafting } = setup();
    inv.add('rift_crystal', 2); // needs 4
    inv.add('ore', 3);
    expect(crafting.canCraft('rift_blade')).toBe(false);
    expect(crafting.craft('rift_blade', 1)).toBe(false);
    expect(inv.count('rift_crystal')).toBe(2);
  });
});
