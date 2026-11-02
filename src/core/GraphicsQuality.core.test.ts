import { describe, expect, test } from 'bun:test';
import {
  cycleGraphicsQuality,
  graphicsQualityLabel,
  profileForTier,
  resolveGraphicsTier,
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

describe('graphicsQuality helpers', () => {
  test('cycle and labels', () => {
    expect(cycleGraphicsQuality('auto')).toBe('low');
    expect(cycleGraphicsQuality('low')).toBe('high');
    expect(cycleGraphicsQuality('high')).toBe('auto');
    expect(graphicsQualityLabel('auto')).toBe('Auto');
  });
});
