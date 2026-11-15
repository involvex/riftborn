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
  killedInRift: false,
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

  test('hub kills alone do not finish the flow', () => {
    expect(
      nextFirstSessionHint({
        ...base(),
        moved: true,
        inRift: false,
        killedInRift: false,
      }),
    ).toBe('rift');
  });

  test('returns done after first rift kill', () => {
    expect(
      nextFirstSessionHint({
        ...base(),
        moved: true,
        inRift: true,
        killedInRift: true,
      }),
    ).toBe('done');
  });

  test('already killed in rift goes directly to done', () => {
    expect(nextFirstSessionHint({ ...base(), killedInRift: true })).toBe(
      'done',
    );
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
});

describe('firstSessionHintText', () => {
  test('move text differs by input mode', () => {
    expect(firstSessionHintText('move', true)).toBe('Stick - move');
    expect(firstSessionHintText('move', false)).toBe('WASD - move');
  });

  test('rift text names the portal and Kill → Boss → Exit', () => {
    expect(firstSessionHintText('rift', false, 'Q', 'R')).toContain('R');
    expect(firstSessionHintText('rift', false, 'Q', 'R')).toContain(
      'Kill → Boss → Exit',
    );
    expect(firstSessionHintText('rift', true)).toContain('Obelisk');
  });

  test('attack text teases shift energy from kills', () => {
    expect(firstSessionHintText('attack', true, 'SHIFT')).toContain('SHIFT');
    expect(firstSessionHintText('attack', false, 'Q')).toContain('2 kills');
  });
});
