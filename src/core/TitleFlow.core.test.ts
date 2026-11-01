import { describe, expect, test } from 'bun:test';
import { firstEmptySlot, titleActions } from './TitleFlow';

describe('titleActions', () => {
  test('hides Continue when no save', () => {
    expect(titleActions(false)).toEqual(['newGame', 'settings']);
  });

  test('shows Continue when a save exists', () => {
    expect(titleActions(true)).toEqual([
      'newGame',
      'continue',
      'settings',
    ]);
  });
});

describe('firstEmptySlot', () => {
  test('returns first null index', () => {
    expect(firstEmptySlot([{}, null, {}])).toBe(1);
  });

  test('returns null when full', () => {
    expect(firstEmptySlot([{}, {}, {}])).toBeNull();
  });
});
