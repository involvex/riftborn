import { describe, expect, test } from 'bun:test';
import {
  RARITY_COLORS,
  rarityBeamHeight,
  rarityCss,
  rarityDropScale,
  rarityGlowAlpha,
  rarityPhaser,
  rarityWantsBurst,
  rarityWantsCameraFlash,
} from './RarityVisual';

describe('RarityVisual', () => {
  test('maps every rarity to a distinct Phaser color', () => {
    const colors = [
      rarityPhaser('common'),
      rarityPhaser('magic'),
      rarityPhaser('rare'),
      rarityPhaser('legendary'),
    ];
    expect(new Set(colors).size).toBe(4);
    expect(rarityPhaser('common')).toBe(RARITY_COLORS.common.phaser);
    expect(rarityPhaser('legendary')).toBe(RARITY_COLORS.legendary.phaser);
  });

  test('css hex strings stay 7-char #rrggbb', () => {
    for (const r of ['common', 'magic', 'rare', 'legendary'] as const) {
      const css = rarityCss(r);
      expect(css).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(css).toBe(RARITY_COLORS[r].css);
    }
  });

  test('higher rarity glows brighter and taller', () => {
    expect(rarityGlowAlpha('magic')).toBeGreaterThan(rarityGlowAlpha('common'));
    expect(rarityGlowAlpha('rare')).toBeGreaterThan(rarityGlowAlpha('magic'));
    expect(rarityGlowAlpha('legendary')).toBeGreaterThan(
      rarityGlowAlpha('rare'),
    );
    expect(rarityBeamHeight('legendary')).toBeGreaterThan(
      rarityBeamHeight('common'),
    );
    expect(rarityDropScale('rare')).toBeGreaterThan(rarityDropScale('common'));
  });

  test('camera flash and burst gate commons / low tiers', () => {
    expect(rarityWantsCameraFlash('common')).toBe(false);
    expect(rarityWantsCameraFlash('magic')).toBe(true);
    expect(rarityWantsBurst('magic')).toBe(false);
    expect(rarityWantsBurst('rare')).toBe(true);
    expect(rarityWantsBurst('legendary')).toBe(true);
  });
});
