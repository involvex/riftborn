import { describe, expect, test } from 'bun:test';
import { TILE_HEIGHT, TILE_WIDTH } from './IsoMath';
import {
  FIGURE_COLLISION_RADIUS,
  FIGURE_CONTENT_PX,
  FIGURE_HEIGHT_TILES,
  FIGURE_WIDTH_TILES_MAX,
  canTraverseWithFootprint,
  figureDrawScale,
  figureEliteDrawScale,
  figureVisibleTiles,
  footprintFits,
} from './FigureScale';

describe('figureDrawScale', () => {
  test('height lands in 1.3–1.5 tile heights', () => {
    const { hTiles, wTiles } = figureVisibleTiles();
    expect(hTiles).toBeGreaterThanOrEqual(1.3);
    expect(hTiles).toBeLessThanOrEqual(1.5);
    expect(wTiles).toBeLessThanOrEqual(FIGURE_WIDTH_TILES_MAX + 1e-6);
  });

  test('is smaller than the old painted player scale 0.95', () => {
    expect(figureDrawScale()).toBeLessThan(0.95);
    expect(figureDrawScale()).toBeGreaterThan(0.25);
  });

  test('elite scale stays within width cap', () => {
    const s = figureEliteDrawScale();
    const w = FIGURE_CONTENT_PX * s;
    expect(w / TILE_WIDTH).toBeLessThanOrEqual(FIGURE_WIDTH_TILES_MAX + 1e-6);
    expect(s).toBeGreaterThanOrEqual(figureDrawScale());
  });

  test('documents target constants', () => {
    expect(FIGURE_HEIGHT_TILES).toBe(1.4);
    expect(FIGURE_WIDTH_TILES_MAX).toBe(0.9);
    expect(FIGURE_COLLISION_RADIUS).toBeLessThanOrEqual(0.35);
  });
});

describe('footprintFits / corridor traverse', () => {
  function cellWalk(cells: number[][]) {
    return (x: number, y: number) => {
      const ix = Math.floor(x);
      const iy = Math.floor(y);
      return cells[iy]?.[ix] === 1;
    };
  }

  test('fits through a straight 1-tile corridor', () => {
    // Vertical corridor at x=2 (cell index), length 6
    const cells = Array.from({ length: 8 }, () =>
      Array.from({ length: 5 }, (_, x) => (x === 2 ? 1 : 0)),
    );
    const walk = cellWalk(cells);
    expect(footprintFits(walk, 2.5, 1.5, FIGURE_COLLISION_RADIUS)).toBe(true);
    expect(
      canTraverseWithFootprint(walk, { x: 2.5, y: 1.5 }, { x: 2.5, y: 6.5 }),
    ).toBe(true);
  });

  test('fits through a 1-tile corridor with a diagonal bend', () => {
    // Path: (2,1)-(2,2)-(2,3)-(3,3)-(3,4)-(3,5)
    const cells = Array.from({ length: 8 }, () =>
      Array.from({ length: 6 }, () => 0),
    );
    for (const [x, y] of [
      [2, 1],
      [2, 2],
      [2, 3],
      [3, 3],
      [3, 4],
      [3, 5],
    ] as const) {
      cells[y][x] = 1;
    }
    const walk = cellWalk(cells);
    expect(
      canTraverseWithFootprint(walk, { x: 2.5, y: 1.5 }, { x: 3.5, y: 5.5 }),
    ).toBe(true);
  });

  test('radius 0.55 cannot stay centered in a 1-tile corridor', () => {
    const cells = Array.from({ length: 4 }, () =>
      Array.from({ length: 5 }, (_, x) => (x === 2 ? 1 : 0)),
    );
    const walk = cellWalk(cells);
    expect(footprintFits(walk, 2.5, 1.5, 0.55)).toBe(false);
  });

  test('visible height uses TILE_HEIGHT', () => {
    const s = figureDrawScale();
    const h = FIGURE_CONTENT_PX * s;
    expect(h / TILE_HEIGHT).toBeCloseTo(FIGURE_HEIGHT_TILES, 5);
  });
});
