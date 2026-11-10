import { describe, expect, test } from 'bun:test';
import {
  biomeMatDropToast,
  type BiomeMatFeedbackState,
} from './BiomeMatFeedback';

const fresh = (): BiomeMatFeedbackState => ({ benchHintShown: false });

describe('biomeMatDropToast', () => {
  test('first drop includes item name, qty, and desktop F bench hint', () => {
    const result = biomeMatDropToast({
      itemName: 'Ashen Bone',
      qty: 1,
      touch: false,
      craftKey: 'F',
      state: fresh(),
    });
    expect(result.text).toContain('Ashen Bone');
    expect(result.text).toContain('+1');
    expect(result.text).toContain('F');
    expect(result.text.toLowerCase()).toMatch(/bench|craft/);
    expect(result.state.benchHintShown).toBe(true);
  });

  test('first touch drop mentions Bench/Werkbank without a key letter', () => {
    const result = biomeMatDropToast({
      itemName: 'Rift Crystal',
      qty: 2,
      touch: true,
      craftKey: 'F',
      state: fresh(),
    });
    expect(result.text).toContain('Rift Crystal');
    expect(result.text).toContain('+2');
    expect(result.text).toMatch(/Bench|Werkbank/);
    expect(result.text).not.toMatch(/\bF\b/);
    expect(result.state.benchHintShown).toBe(true);
  });

  test('later drops toast name + qty without repeating the bench hint', () => {
    const first = biomeMatDropToast({
      itemName: 'Grove Sap',
      qty: 1,
      touch: false,
      craftKey: 'F',
      state: fresh(),
    });
    const second = biomeMatDropToast({
      itemName: 'Grove Sap',
      qty: 2,
      touch: false,
      craftKey: 'F',
      state: first.state,
    });
    expect(second.text).toBe('+2 Grove Sap');
    expect(second.text.toLowerCase()).not.toMatch(/bench|craft|werkbank|\bf\b/);
    expect(second.state.benchHintShown).toBe(true);
  });

  test('uses the display name, not a raw item id', () => {
    const result = biomeMatDropToast({
      itemName: 'Ashen Bone',
      qty: 1,
      touch: false,
      craftKey: 'F',
      state: fresh(),
    });
    expect(result.text).not.toContain('ashen_bone');
    expect(result.text).toContain('Ashen Bone');
  });
});
