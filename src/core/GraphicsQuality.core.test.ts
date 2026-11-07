import { describe, expect, test } from 'bun:test';
import {
  bufferSizeForProfile,
  computeGraphicsResize,
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
    // M3c: buffer is smaller than logical CSS size at 0.65, game size stays CSS.
    expect(bufLow.width).toBeLessThan(gLow.width);
    expect(bufLow.height).toBeLessThan(gLow.height);
    expect(gLow.width).toBe(cssW);
    expect(gLow.height).toBe(cssH);
    expect(gHigh.width).toBe(cssW);
    expect(gHigh.height).toBe(cssH);
    expect(visibleWorldTileSpan(gLow.width, gLow.height, zoom)).toEqual(
      visibleWorldTileSpan(gHigh.width, gHigh.height, zoom),
    );
  });

  test('computeGraphicsResize splits logical (CSS) from buffer (CSS*scale)', () => {
    const cssW = 1024;
    const cssH = 473;
    const scale = 0.65;
    const r = computeGraphicsResize(cssW, cssH, scale);
    expect(r.logical).toEqual({ width: 1024, height: 473 });
    expect(r.css).toEqual({ width: 1024, height: 473 });
    expect(r.buffer).toEqual({
      width: Math.floor(cssW * scale),
      height: Math.floor(cssH * scale),
    });
    expect(r.buffer.width).toBeLessThan(r.logical.width);
  });

  test('computeGraphicsResize keeps buffer == logical at scale 1 (high/desktop)', () => {
    const r = computeGraphicsResize(1280, 720, 1);
    expect(r.logical).toEqual({ width: 1280, height: 720 });
    expect(r.buffer).toEqual({ width: 1280, height: 720 });
    expect(r.css).toEqual({ width: 1280, height: 720 });
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
