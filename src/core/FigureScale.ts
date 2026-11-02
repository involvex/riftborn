import { TILE_HEIGHT, TILE_WIDTH } from './IsoMath';

/** Painted sheet frame size (matches SpriteAtlas PAINTED_FW/FH). */
export const FIGURE_FRAME_PX = 128;

/**
 * Character / foe draw size relative to iso tiles.
 * Painted frames are 128²; opaque content is ~108² (mage idle).
 */
export const FIGURE_HEIGHT_TILES = 1.4;
/** No sprite may read wider than this fraction of TILE_WIDTH. */
export const FIGURE_WIDTH_TILES_MAX = 0.9;
/** World-space collision footprint (tiles). Fits ≥2-tile (M1e) corridors. */
export const FIGURE_COLLISION_RADIUS = 0.32;
/** Measured opaque span of spr_player_mage idle (px). */
export const FIGURE_CONTENT_PX = 108;

/** Boss / elite may read a bit larger, still width-capped. */
export const FIGURE_BOSS_SCALE_MULT = 1.12;

/**
 * Phaser sprite scale so visible height ≈ FIGURE_HEIGHT_TILES * TILE_HEIGHT
 * and width ≤ FIGURE_WIDTH_TILES_MAX * TILE_WIDTH.
 */
export function figureDrawScale(contentPx: number = FIGURE_CONTENT_PX): number {
  const byH = (FIGURE_HEIGHT_TILES * TILE_HEIGHT) / contentPx;
  const byW = (FIGURE_WIDTH_TILES_MAX * TILE_WIDTH) / contentPx;
  return Math.min(byH, byW);
}

/** Scale for elites/bosses — width still capped. */
export function figureEliteDrawScale(
  contentPx: number = FIGURE_CONTENT_PX,
): number {
  const base = figureDrawScale(contentPx);
  const maxW = (FIGURE_WIDTH_TILES_MAX * TILE_WIDTH) / contentPx;
  return Math.min(base * FIGURE_BOSS_SCALE_MULT, maxW);
}

/** Visible size in screen px at the shared draw scale. */
export function figureVisiblePx(contentPx: number = FIGURE_CONTENT_PX): {
  w: number;
  h: number;
} {
  const s = figureDrawScale(contentPx);
  return { w: contentPx * s, h: contentPx * s };
}

/** Visible size as fractions of TILE_WIDTH / TILE_HEIGHT. */
export function figureVisibleTiles(contentPx: number = FIGURE_CONTENT_PX): {
  wTiles: number;
  hTiles: number;
} {
  const { w, h } = figureVisiblePx(contentPx);
  return { wTiles: w / TILE_WIDTH, hTiles: h / TILE_HEIGHT };
}

/**
 * True when a circular footprint fits on walkable cells.
 * Samples center + 8 rim points (enough for axis and diagonal moves).
 */
export function footprintFits(
  walkAt: (x: number, y: number) => boolean,
  x: number,
  y: number,
  radius: number = FIGURE_COLLISION_RADIUS,
): boolean {
  if (!walkAt(x, y)) return false;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    if (!walkAt(px, py)) return false;
  }
  return true;
}

/**
 * Simulate axis-separated steps through a corridor (mirrors Player.move).
 * Returns false if blocked before reaching the goal.
 */
export function canTraverseWithFootprint(
  walkAt: (x: number, y: number) => boolean,
  start: { x: number; y: number },
  goal: { x: number; y: number },
  radius: number = FIGURE_COLLISION_RADIUS,
  step = 0.1,
): boolean {
  let x = start.x;
  let y = start.y;
  const maxIter = 500;
  for (let i = 0; i < maxIter; i++) {
    const dx = goal.x - x;
    const dy = goal.y - y;
    if (Math.hypot(dx, dy) <= step) {
      return footprintFits(walkAt, goal.x, goal.y, radius);
    }
    const len = Math.hypot(dx, dy) || 1;
    const nx = x + (dx / len) * step;
    const ny = y + (dy / len) * step;
    // Axis-separated like Player.move
    if (footprintFits(walkAt, nx, y, radius)) x = nx;
    if (footprintFits(walkAt, x, ny, radius)) y = ny;
    if (
      !footprintFits(walkAt, nx, y, radius) &&
      !footprintFits(walkAt, x, ny, radius)
    ) {
      return false;
    }
  }
  return false;
}

/** Frame size used by painted sheets (for docs / asserts). */
export const FIGURE_FRAME = {
  w: FIGURE_FRAME_PX,
  h: FIGURE_FRAME_PX,
} as const;
