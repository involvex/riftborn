import { describe, expect, test } from 'bun:test';
import {
  firstSessionHintText,
  nextFirstSessionHint,
  type FirstSessionState,
} from './FirstSession';

const base = (): FirstSessionState => ({
  tutorialOpen: false,
  smoke: false,
  completed: false,
  moved: false,
  inRift: false,
  killed: false,
});

describe('nextFirstSessionHint', () => {
  test('returns null for smoke boots', () => {
    expect(nextFirstSessionHint({ ...base(), smoke: true })).toBeNull();
  });

  test('returns null while tutorial is open', () => {
    expect(nextFirstSessionHint({ ...base(), tutorialOpen: true })).toBeNull();
  });

  test('returns done when already completed', () => {
    expect(nextFirstSessionHint({ ...base(), completed: true })).toBe('done');
  });

  test('shows move first', () => {
    expect(nextFirstSessionHint(base())).toBe('move');
  });

  test('advances to rift after move', () => {
    expect(nextFirstSessionHint({ ...base(), moved: true })).toBe('rift');
  });

  test('skips move when already in rift', () => {
    expect(nextFirstSessionHint({ ...base(), inRift: true })).toBe('attack');
  });

  test('shows attack while in rift before kill', () => {
    expect(nextFirstSessionHint({ ...base(), moved: true, inRift: true })).toBe(
      'attack',
    );
  });

  test('returns done after first kill', () => {
    expect(
      nextFirstSessionHint({
        ...base(),
        moved: true,
        inRift: true,
        killed: true,
      }),
    ).toBe('done');
  });

  test('already killed goes directly to done', () => {
    expect(nextFirstSessionHint({ ...base(), killed: true })).toBe('done');
  });

  test('completed stays completed regardless of progress', () => {
    expect(
      nextFirstSessionHint({
        ...base(),
        completed: true,
        moved: true,
        inRift: true,
        killed: true,
      }),
    ).toBe('done');
  });

  test('smoke overrides other state', () => {
    expect(
      nextFirstSessionHint({
        ...base(),
        smoke: true,
        moved: true,
        inRift: true,
      }),
    ).toBeNull();
  });

  test('tutorial open overrides progress', () => {
    expect(
      nextFirstSessionHint({ ...base(), tutorialOpen: true, moved: true }),
    ).toBeNull();
  });
});

describe('firstSessionHintText', () => {
  test('move text differs by input mode', () => {
    expect(firstSessionHintText('move', true)).toBe('Stick - move');
    expect(firstSessionHintText('move', false)).toBe('WASD - move');
  });

  test('rift text names the goal and shift gates, shared by input mode', () => {
    const text = 'Betritt den Rift: Kills bis Boss/Exit. SHIFT oeffnet Gates.';
    expect(firstSessionHintText('rift', true)).toBe(text);
    expect(firstSessionHintText('rift', false)).toBe(text);
    expect(text).toContain('Kills bis Boss/Exit');
    expect(text).toContain('SHIFT');
  });

  test('attack text mentions SHIFT-Energie and differs by input', () => {
    expect(firstSessionHintText('attack', true)).toContain(
      'Kills fuellen SHIFT-Energie.',
    );
    expect(firstSessionHintText('attack', true)).toContain('ATK - attack');
    expect(firstSessionHintText('attack', false)).toContain('LMB - attack');
  });
});
