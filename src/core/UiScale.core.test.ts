import { describe, expect, test } from 'bun:test';
import { uiPx } from './UiScale';

describe('uiPx', () => {
  test('identity at full render scale', () => {
    expect(uiPx(100, 1)).toBe(100);
  });

  test('shrinks for Low buffer scale', () => {
    expect(uiPx(100, 0.65)).toBe(65);
    expect(uiPx(40, 0.65)).toBe(26);
  });
});
