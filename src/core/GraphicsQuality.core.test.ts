import { describe, expect, test } from 'bun:test';
import {
  bufferSizeForProfile,
  computeGraphicsResize,
  cycleGraphicsQuality,
  gameSizeForProfile,
  getAppliedCameraZoom,
  graphicsQualityLabel,
  profileForTier,
  readCssViewport,
  resolveGraphicsTier,
  visibleWorldTileSpan,
} from './GraphicsQuality';

describe('resolveGraphicsTier', () => {
  test('explicit high/medium/low win over device', () => {
    expect(resolveGraphicsTier('high', true)).toBe('high');
    expect(resolveGraphicsTier('medium', false)).toBe('medium');
    expect(resolveGraphicsTier('low', false)).toBe('low');
  });

  test('auto follows touch preference → Medium on phone', () => {
    expect(resolveGraphicsTier('auto', true)).toBe('medium');
    expect(resolveGraphicsTier('auto', false)).toBe('high');
  });
});

describe('profileForTier', () => {
  test('low cuts render scale and caps vs medium and high', () => {
    const low = profileForTier('low');
    const medium = profileForTier('medium');
    const high = profileForTier('high');
    expect(low.renderScale).toBeLessThan(medium.renderScale);
    expect(medium.renderScale).toBeLessThan(high.renderScale);
    expect(low.maxDamageNumbers).toBeLessThan(medium.maxDamageNumbers);
    expect(medium.maxDamageNumbers).toBeLessThan(high.maxDamageNumbers);
    expect(low.particleCap).toBeLessThan(medium.particleCap);
    expect(medium.particleCap).toBeLessThan(high.particleCap);
    expect(low.juiceScale).toBeLessThan(medium.juiceScale);
    expect(medium.juiceScale).toBeLessThan(high.juiceScale);
  });

  test('low and medium keep textResolution 2 for sharp HUD type', () => {
    expect(profileForTier('low').textResolution).toBe(2);
    expect(profileForTier('medium').textResolution).toBe(2);
    expect(profileForTier('high').textResolution).toBe(2);
  });

  test('medium renderScale is 0.85', () => {
    expect(profileForTier('medium').renderScale).toBe(0.85);
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

  test('low profile (renderScale 0.65) live resize target is the buffer', () => {
    const cssW = 1024;
    const cssH = 473;
    const low = profileForTier('low');
    const high = profileForTier('high');
    expect(low.renderScale).toBe(0.65);

    // Logical helper stays CSS (FOV reference); buffer is what scale.resize gets.
    const gLow = gameSizeForProfile(cssW, cssH, low.renderScale);
    const gHigh = gameSizeForProfile(cssW, cssH, high.renderScale);
    expect(gLow).toEqual({ width: cssW, height: cssH });
    expect(gHigh).toEqual({ width: cssW, height: cssH });

    const bufLow = bufferSizeForProfile(cssW, cssH, low.renderScale);
    expect(bufLow.width).toBe(Math.floor(cssW * low.renderScale));
    expect(bufLow.height).toBe(Math.floor(cssH * low.renderScale));
    expect(bufLow.width).toBeLessThan(gLow.width);
    expect(bufLow.height).toBeLessThan(gLow.height);
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

  test('FOV-safe Low: buffer + zoom*scale matches High tile span', () => {
    const cssW = 1024;
    const cssH = 473;
    const baseZoom = 1.1;
    const low = profileForTier('low');
    const high = profileForTier('high');
    const sizes = computeGraphicsResize(cssW, cssH, low.renderScale);
    const lowZoom = baseZoom * low.renderScale;
    const highSpan = visibleWorldTileSpan(
      cssW,
      cssH,
      baseZoom * high.renderScale,
    );
    const lowSpan = visibleWorldTileSpan(
      sizes.buffer.width,
      sizes.buffer.height,
      lowZoom,
    );
    // floor() on buffer shrinks a pixel or two — stay within ~1%.
    expect(lowSpan.tilesX / highSpan.tilesX).toBeCloseTo(1, 2);
    expect(lowSpan.tilesY / highSpan.tilesY).toBeCloseTo(1, 2);
  });

  test('FOV-safe Medium: buffer + zoom*scale matches High tile span', () => {
    const cssW = 1024;
    const cssH = 473;
    const baseZoom = 1.1;
    const medium = profileForTier('medium');
    const high = profileForTier('high');
    const sizes = computeGraphicsResize(cssW, cssH, medium.renderScale);
    const medZoom = baseZoom * medium.renderScale;
    const highSpan = visibleWorldTileSpan(
      cssW,
      cssH,
      baseZoom * high.renderScale,
    );
    const medSpan = visibleWorldTileSpan(
      sizes.buffer.width,
      sizes.buffer.height,
      medZoom,
    );
    expect(medSpan.tilesX / highSpan.tilesX).toBeCloseTo(1, 2);
    expect(medSpan.tilesY / highSpan.tilesY).toBeCloseTo(1, 2);
  });
});

describe('getAppliedCameraZoom', () => {
  test('defaults to base zoom before a profile is applied (scale 1)', () => {
    // appliedScale starts at 1; Low multiplies after applyGraphicsProfile.
    expect(getAppliedCameraZoom(1.1)).toBeCloseTo(1.1, 5);
    expect(getAppliedCameraZoom(1)).toBe(1);
  });
});

describe('readCssViewport', () => {
  test('returns positive layout size', () => {
    const vp = readCssViewport();
    expect(vp.width).toBeGreaterThanOrEqual(320);
    expect(vp.height).toBeGreaterThanOrEqual(180);
  });
});

describe('graphicsQuality helpers', () => {
  test('cycle Auto → Low → Medium → High → Auto', () => {
    expect(cycleGraphicsQuality('auto')).toBe('low');
    expect(cycleGraphicsQuality('low')).toBe('medium');
    expect(cycleGraphicsQuality('medium')).toBe('high');
    expect(cycleGraphicsQuality('high')).toBe('auto');
  });

  test('labels', () => {
    expect(graphicsQualityLabel('auto')).toBe('Auto');
    expect(graphicsQualityLabel('low')).toBe('Low');
    expect(graphicsQualityLabel('medium')).toBe('Medium');
    expect(graphicsQualityLabel('high')).toBe('High');
  });
});
