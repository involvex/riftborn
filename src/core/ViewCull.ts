export type ViewRect = { x: number; y: number; width: number; height: number };

/**
 * True when a world-space point is inside the camera view expanded by `pad`.
 * Pad should cover at least half a tile (TILE_WIDTH 64) so edge diamonds
 * don't pop; 96 is a safe default for iso floor tiles.
 */
export function isScreenPointVisible(
  x: number,
  y: number,
  view: ViewRect,
  pad: number,
): boolean {
  return (
    x >= view.x - pad &&
    x <= view.x + view.width + pad &&
    y >= view.y - pad &&
    y <= view.y + view.height + pad
  );
}

/** Default pad for iso floor tile sprites (covers diamond extent). */
export const TILE_CULL_PAD = 96;

/** Larger pad for decor containers (tall props extend above origin). */
export const DECOR_CULL_PAD = 192;

/** Must be >= iso tile width (64). */
export const TILE_CULL_MIN_PAD = 64;
export const TILE_CULL_MIN_PAD_Y = 32;
