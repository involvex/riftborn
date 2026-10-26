import Phaser from 'phaser';
import type { CharacterClassId, GearInstance, GearSlot } from '../types/game';
import { resolveGearClass } from '../systems/ItemGen';

/** Files under public/assets/icons/ (copied from LootLoop-Realms). */
export const ITEM_ICON_FILES = [
  'sword',
  'sword_rare',
  'dagger',
  'wand',
  'wand_rare',
  'bow',
  'axe',
  'hammer',
  'helmet',
  'helmet_rare',
  'armor',
  'armor_rare',
  'shield',
  'boots',
  'coin',
  'gem_blue',
  'gem_green',
  'gem_red',
  'potion_red',
  'potion_blue',
  'potion_green',
  'tools',
  'scroll',
  'tome',
  'backpack',
  'heart',
] as const;

export type ItemIconId = (typeof ITEM_ICON_FILES)[number];

export function iconTextureKey(id: ItemIconId): string {
  return `icon_${id}`;
}

export function preloadItemIcons(scene: Phaser.Scene): void {
  for (const id of ITEM_ICON_FILES) {
    scene.load.image(iconTextureKey(id), `assets/icons/${id}.png`);
  }
}

function hasIcon(scene: Phaser.Scene, id: ItemIconId): boolean {
  return scene.textures.exists(iconTextureKey(id));
}

function stackIconId(itemId: string): ItemIconId | null {
  switch (itemId) {
    case 'gold':
      return 'coin';
    case 'rift_shard':
      return 'gem_blue';
    case 'ember_dust':
      return 'gem_red';
    case 'ore':
      return 'gem_green';
    case 'berries':
      return 'potion_red';
    case 'wood':
      return 'scroll';
    case 'hide':
      return 'backpack';
    case 'scrap':
    case 'bone_chip':
      return 'tome';
    case 'hatchet':
      return 'axe';
    case 'iron_blade':
      return 'sword';
    case 'rift_blade':
      return 'sword_rare';
    case 'leather_vest':
      return 'armor';
    case 'rift_mail':
      return 'armor_rare';
    default:
      return null;
  }
}

function gearIconId(item: GearInstance): ItemIconId {
  const rare = item.rarity === 'rare' || item.rarity === 'legendary';
  const cls: CharacterClassId | null = resolveGearClass(item);
  switch (item.slot) {
    case 'weapon':
      if (cls === 'mage') return rare ? 'wand_rare' : 'wand';
      if (cls === 'mystic') return 'dagger';
      return rare ? 'sword_rare' : 'sword';
    case 'hat':
      return rare ? 'helmet_rare' : 'helmet';
    case 'chest':
      return rare ? 'armor_rare' : 'armor';
    case 'legs':
      return 'shield';
    case 'feet':
      return 'boots';
    default:
      return 'backpack';
  }
}

const RARITY_EDGE: Record<string, number> = {
  common: 0x8a9098,
  magic: 0x4caf70,
  rare: 0x4da6ff,
  legendary: 0xffb74d,
};

/**
 * Draw a stack or gear icon into a bag/equip cell.
 * Prefers painted LootLoop icons; falls back to distinct silhouettes.
 */
export function addSlotIcon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
  opts:
    | { kind: 'stack'; itemId: string }
    | { kind: 'gear'; item: GearInstance; dimmed?: boolean },
): Phaser.GameObjects.GameObject[] {
  const out: Phaser.GameObjects.GameObject[] = [];
  const cx = x + size / 2;
  const cy = y + size / 2 - 1;

  if (opts.kind === 'stack') {
    const id = stackIconId(opts.itemId);
    if (id && hasIcon(scene, id)) {
      const img = scene.add
        .image(cx, cy, iconTextureKey(id))
        .setDisplaySize(size * 0.72, size * 0.72);
      out.push(img);
      return out;
    }
    out.push(...drawStackFallback(scene, cx, cy, size, opts.itemId));
    return out;
  }

  const id = gearIconId(opts.item);
  const edge = RARITY_EDGE[opts.item.rarity] ?? RARITY_EDGE.common;
  const ring = scene.add
    .rectangle(cx, cy, size * 0.86, size * 0.86, 0x000000, 0)
    .setStrokeStyle(2, edge, opts.dimmed ? 0.35 : 0.85);
  out.push(ring);

  if (hasIcon(scene, id)) {
    const img = scene.add
      .image(cx, cy, iconTextureKey(id))
      .setDisplaySize(size * 0.68, size * 0.68)
      .setAlpha(opts.dimmed ? 0.4 : 1);
    out.push(img);
  } else {
    out.push(
      ...drawGearFallback(
        scene,
        cx,
        cy,
        size,
        opts.item.slot,
        edge,
        opts.dimmed,
      ),
    );
  }
  return out;
}

function drawStackFallback(
  scene: Phaser.Scene,
  cx: number,
  cy: number,
  size: number,
  itemId: string,
): Phaser.GameObjects.GameObject[] {
  const g = scene.add.graphics();
  const s = size * 0.22;
  switch (itemId) {
    case 'gold':
      g.fillStyle(0xe6c35c, 1);
      g.fillCircle(cx, cy, s);
      g.lineStyle(1, 0x8a7020, 0.9);
      g.strokeCircle(cx, cy, s);
      break;
    case 'wood':
      g.fillStyle(0x8b5a2b, 1);
      g.fillRoundedRect(cx - s * 1.4, cy - s * 0.5, s * 2.8, s, 2);
      g.fillStyle(0xa07040, 1);
      g.fillCircle(cx - s, cy, s * 0.45);
      g.fillCircle(cx + s, cy, s * 0.45);
      break;
    case 'ore':
      g.fillStyle(0x7a8b99, 1);
      g.fillTriangle(cx, cy - s, cx + s, cy + s * 0.6, cx - s, cy + s * 0.6);
      break;
    case 'rift_shard':
      g.fillStyle(0x6ec6ff, 1);
      g.fillTriangle(
        cx,
        cy - s * 1.1,
        cx + s * 0.7,
        cy + s,
        cx - s * 0.7,
        cy + s,
      );
      break;
    case 'ember_dust':
      g.fillStyle(0xe07040, 1);
      g.fillCircle(cx, cy, s * 0.85);
      g.fillStyle(0xffc060, 0.9);
      g.fillCircle(cx - s * 0.2, cy - s * 0.2, s * 0.35);
      break;
    case 'berries':
      g.fillStyle(0xc04060, 1);
      g.fillCircle(cx - s * 0.45, cy, s * 0.45);
      g.fillCircle(cx + s * 0.45, cy, s * 0.45);
      g.fillCircle(cx, cy - s * 0.4, s * 0.45);
      break;
    case 'hatchet':
      g.fillStyle(0xa67c52, 1);
      g.fillRect(cx - 2, cy - s, 4, s * 2);
      g.fillStyle(0xb0b8c0, 1);
      g.fillTriangle(cx + 2, cy - s, cx + s * 1.2, cy - s * 0.2, cx + 2, cy);
      break;
    default:
      g.fillStyle(0xc4b59a, 1);
      g.fillCircle(cx, cy, s * 0.9);
      break;
  }
  return [g];
}

function drawGearFallback(
  scene: Phaser.Scene,
  cx: number,
  cy: number,
  size: number,
  slot: GearSlot,
  color: number,
  dimmed?: boolean,
): Phaser.GameObjects.GameObject[] {
  const g = scene.add.graphics();
  const a = dimmed ? 0.4 : 0.95;
  const s = size * 0.28;
  g.fillStyle(color, a);
  switch (slot) {
    case 'weapon':
      g.fillRect(cx - 2, cy - s * 1.2, 4, s * 2.2);
      g.fillTriangle(
        cx,
        cy - s * 1.4,
        cx + s * 0.7,
        cy - s * 0.4,
        cx - s * 0.7,
        cy - s * 0.4,
      );
      break;
    case 'hat':
      g.fillEllipse(cx, cy + s * 0.1, s * 1.8, s * 1.2);
      g.fillRect(cx - s * 0.9, cy - s * 0.2, s * 1.8, s * 0.5);
      break;
    case 'chest':
      g.fillRoundedRect(cx - s, cy - s * 0.9, s * 2, s * 1.8, 3);
      break;
    case 'legs':
      g.fillRect(cx - s * 0.85, cy - s * 0.6, s * 0.7, s * 1.5);
      g.fillRect(cx + s * 0.15, cy - s * 0.6, s * 0.7, s * 1.5);
      break;
    case 'feet':
      g.fillRoundedRect(cx - s * 1.1, cy - s * 0.2, s * 0.95, s * 0.7, 2);
      g.fillRoundedRect(cx + s * 0.15, cy - s * 0.2, s * 0.95, s * 0.7, 2);
      break;
    default:
      g.fillCircle(cx, cy, s);
  }
  return [g];
}
