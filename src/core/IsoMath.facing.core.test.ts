import { describe, expect, test } from 'bun:test';
import {
  applySheetFacing,
  facingFromDelta,
  facingOctantFromDelta,
  octantScreenUnit,
  spriteFacingFromDelta,
} from './IsoMath';

describe('spriteFacingFromDelta', () => {
  test('maps screen-right world move to +1 / e', () => {
    // World +X −Y → positive screen X
    const f = spriteFacingFromDelta(1, -1, -1);
    expect(f.sign).toBe(1);
    expect(f.flipX).toBe(false);
    expect(f.cardinal).toBe('e');
    expect(f.octant).toBe('e');
  });

  test('maps screen-left world move to −1 / w', () => {
    const f = spriteFacingFromDelta(-1, 1, 1);
    expect(f.sign).toBe(-1);
    expect(f.flipX).toBe(true);
    expect(f.cardinal).toBe('w');
    expect(f.octant).toBe('w');
  });

  test('holds previous sign on pure screen-south (no moonwalk flip)', () => {
    // World +X +Y → screen Y, near-zero screen X
    const holdRight = spriteFacingFromDelta(1, 1, 1);
    expect(holdRight.cardinal).toBe('s');
    expect(holdRight.octant).toBe('s');
    expect(holdRight.sign).toBe(1);
    expect(holdRight.flipX).toBe(false);

    const holdLeft = spriteFacingFromDelta(1, 1, -1);
    expect(holdLeft.octant).toBe('s');
    expect(holdLeft.sign).toBe(-1);
    expect(holdLeft.flipX).toBe(true);
  });

  test('holds previous sign on pure screen-north', () => {
    const f = spriteFacingFromDelta(-1, -1, 1);
    expect(f.cardinal).toBe('n');
    expect(f.octant).toBe('n');
    expect(f.sign).toBe(1);
  });

  test('facingFromDelta matches sticky helper sign', () => {
    expect(facingFromDelta(1, -1, -1)).toBe(1);
    expect(facingFromDelta(-1, 1, 1)).toBe(-1);
    expect(facingFromDelta(1, 1, -1)).toBe(-1);
  });

  test('diagonals resolve to distinct octants and flip from E/W', () => {
    // World +X, 0 → screen SE-ish (dx>0, dy=0 → screenDx=dx, screenDy=dx)
    const se = spriteFacingFromDelta(1, 0, -1);
    expect(se.octant).toBe('se');
    expect(se.sign).toBe(1);
    expect(se.lean).toBeGreaterThan(0);

    const nw = spriteFacingFromDelta(-1, 0, 1);
    expect(nw.octant).toBe('nw');
    expect(nw.sign).toBe(-1);
    expect(nw.lean).toBeLessThan(0);
  });

  test('octantScreenUnit matches e/s axes', () => {
    expect(octantScreenUnit('e')).toEqual({ x: 1, y: 0 });
    expect(octantScreenUnit('s')).toEqual({ x: 0, y: 1 });
  });

  test('facingOctantFromDelta covers all eight bins', () => {
    const samples: [number, number, string][] = [
      [1, -1, 'e'],
      [1, 0, 'se'],
      [1, 1, 's'],
      [0, 1, 'sw'],
      [-1, 1, 'w'],
      [-1, 0, 'nw'],
      [-1, -1, 'n'],
      [0, -1, 'ne'],
    ];
    for (const [dx, dy, want] of samples) {
      expect(facingOctantFromDelta(dx, dy)).toBe(want);
    }
  });

  test('applySheetFacing clears flipX when sheet has facing rows', () => {
    let flip = true;
    const sprite = {
      setFlipX: (v: boolean) => {
        flip = v;
      },
    };
    applySheetFacing(sprite, -1, 4);
    expect(flip).toBe(false);
    applySheetFacing(sprite, -1, 1);
    expect(flip).toBe(true);
  });
});
