import type { GearRarity } from '../types/game';

/** Shared rarity palette for drops, icons, and tooltips. */
export const RARITY_COLORS: Record<
  GearRarity,
  { css: string; phaser: number }
> = {
  common: { css: '#b0b6c0', phaser: 0xb0b6c0 },
  magic: { css: '#4caf70', phaser: 0x4caf70 },
  rare: { css: '#4da6ff', phaser: 0x4da6ff },
  legendary: { css: '#ffb74d', phaser: 0xffb74d },
};

export function rarityPhaser(rarity: GearRarity): number {
  return RARITY_COLORS[rarity]?.phaser ?? RARITY_COLORS.common.phaser;
}

export function rarityCss(rarity: GearRarity): string {
  return RARITY_COLORS[rarity]?.css ?? RARITY_COLORS.common.css;
}

/** Soft glow alpha for world drops / beams (0–1). */
export function rarityGlowAlpha(rarity: GearRarity): number {
  switch (rarity) {
    case 'legendary':
      return 0.85;
    case 'rare':
      return 0.7;
    case 'magic':
      return 0.55;
    default:
      return 0.35;
  }
}
