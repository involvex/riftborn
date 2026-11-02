import { describe, expect, test } from 'bun:test';
import {
  SHIFT_TRANSITION_MS,
  blendTint,
  layerTileTint,
  layerOverlayAlpha,
  transitionFlashAlpha,
} from './ShiftVisual';
import { SHIFT_LAYERS } from '../data/shiftLayers';

describe('ShiftVisual', () => {
  test('transition stays under 300ms', () => {
    expect(SHIFT_TRANSITION_MS).toBeGreaterThan(0);
    expect(SHIFT_TRANSITION_MS).toBeLessThanOrEqual(300);
  });

  test('ash tile tint is white at full intensity', () => {
    expect(layerTileTint('ash', 1)).toBe(SHIFT_LAYERS.ash.tileTint);
  });

  test('shadow tint is cold violet; intensity 0 collapses to white', () => {
    expect(layerTileTint('shadow', 1)).toBe(SHIFT_LAYERS.shadow.tileTint);
    expect(layerTileTint('shadow', 0)).toBe(0xffffff);
  });

  test('blendTint interpolates channels', () => {
    expect(blendTint(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(blendTint(0x000000, 0xffffff, 1)).toBe(0xffffff);
    expect(blendTint(0x000000, 0xffffff, 0.5)).toBe(0x808080);
  });

  test('overlay alpha scales with intensity', () => {
    expect(layerOverlayAlpha('shadow', 1)).toBe(
      SHIFT_LAYERS.shadow.overlayAlpha,
    );
    expect(layerOverlayAlpha('shadow', 0.5)).toBeCloseTo(
      SHIFT_LAYERS.shadow.overlayAlpha * 0.5,
    );
    expect(layerOverlayAlpha('ash', 1)).toBe(0);
  });

  test('flash alpha peaks mid transition then fades', () => {
    expect(transitionFlashAlpha(0)).toBe(0);
    expect(transitionFlashAlpha(1)).toBe(0);
    expect(transitionFlashAlpha(0.5)).toBeGreaterThan(0.3);
  });
});
