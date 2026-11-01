import { describe, expect, test } from 'bun:test';
import { facingFromDelta, spriteFacingFromDelta } from './IsoMath';

describe('spriteFacingFromDelta', () => {
  test('maps screen-right world move to +1 / e', () => {
    // World +X −Y → positive screen X
    const f = spriteFacingFromDelta(1, -1, -1);
    expect(f.sign).toBe(1);
    expect(f.flipX).toBe(false);
    expect(f.cardinal).toBe('e');
  });

  test('maps screen-left world move to −1 / w', () => {
    const f = spriteFacingFromDelta(-1, 1, 1);
    expect(f.sign).toBe(-1);
    expect(f.flipX).toBe(true);
    expect(f.cardinal).toBe('w');
  });

  test('holds previous sign on pure screen-south (no moonwalk flip)', () => {
    // World +X +Y → screen Y, near-zero screen X
    const holdRight = spriteFacingFromDelta(1, 1, 1);
    expect(holdRight.cardinal).toBe('s');
    expect(holdRight.sign).toBe(1);
    expect(holdRight.flipX).toBe(false);

    const holdLeft = spriteFacingFromDelta(1, 1, -1);
    expect(holdLeft.cardinal).toBe('s');
    expect(holdLeft.sign).toBe(-1);
    expect(holdLeft.flipX).toBe(true);
  });

  test('holds previous sign on pure screen-north', () => {
    const f = spriteFacingFromDelta(-1, -1, 1);
    expect(f.cardinal).toBe('n');
    expect(f.sign).toBe(1);
  });

  test('facingFromDelta matches sticky helper sign', () => {
    expect(facingFromDelta(1, -1, -1)).toBe(1);
    expect(facingFromDelta(-1, 1, 1)).toBe(-1);
    expect(facingFromDelta(1, 1, -1)).toBe(-1);
  });
});
