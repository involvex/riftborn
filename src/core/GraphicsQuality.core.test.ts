import { describe, expect, test } from 'bun:test';
import {
  bufferSizeForProfile,
  cycleGraphicsQuality,
  gameSizeForProfile,
  graphicsQualityLabel,
  profileForTier,
  resolveGraphicsTier,
  visibleWorldTileSpan,
} from './GraphicsQuality';

describe('resolveGraphicsTier', () => {
  test('explicit high/low win over device', () => {
    expect(resolveGraphicsTier('high', true)).toBe('high');
    expect(resolveGraphicsTier('low', false)).toBe('low');
  });

  test('auto follows touch preference', () => {
    expect(resolveGraphicsTier('auto', true)).toBe('low');
    expect(resolveGraphicsTier('auto', false)).toBe('high');
  });
});

describe('profileForTier', () => {
  test('low cuts render scale and caps', () => {
    const low = profileForTier('low');
    const high = profileForTier('high');
    expect(low.renderScale).toBeLessThan(high.renderScale);
    expect(low.maxDamageNumbers).toBeLessThan(high.maxDamageNumbers);
    expect(low.particleCap).toBeLessThan(high.particleCap);
    expect(low.juiceScale).toBeLessThan(high.juiceScale);
  });
});

describe('render scale vs world FOV', () => {
  test('logical game size ignores renderScale (CSS only)', () => {
    const cssW = 1024;
    const cssH = 473;
    const low = profileForTier('low');
    const high = profileForTier('high');
    const gLow = gameSizeForProfile(cssW, cssH, low.renderScale);
    const gHigh = gameSizeForProfile(cssW, cssH, high.renderScale);
    expect(gLow).toEqual(gHigh);
    expect(gLow.width).toBe(cssW);
    expect(gLow.height).toBe(cssH);
  });

  test('buffer shrinks on low; visible tile span stays equal', () => {
    const cssW = 1024;
    const cssH = 473;
    const zoom = 1.05;
    const low = profileForTier('low');
    const high = profileForTier('high');
    const bufLow = bufferSizeForProfile(cssW, cssH, low.renderScale);
    const bufHigh = bufferSizeForProfile(cssW, cssH, high.renderScale);
    expect(bufLow.width).toBeLessThan(bufHigh.width);

    const gLow = gameSizeForProfile(cssW, cssH, low.renderScale);
    const gHigh = gameSizeForProfile(cssW, cssH, high.renderScale);
    expect(visibleWorldTileSpan(gLow.width, gLow.height, zoom)).toEqual(
      visibleWorldTileSpan(gHigh.width, gHigh.height, zoom),
    );
  });
});

describe('graphicsQuality helpers', () => {
  test('cycle and labels', () => {
    expect(cycleGraphicsQuality('auto')).toBe('low');
    expect(cycleGraphicsQuality('low')).toBe('high');
    expect(cycleGraphicsQuality('high')).toBe('auto');
    expect(graphicsQualityLabel('auto')).toBe('Auto');
  });
});
