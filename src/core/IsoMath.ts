/** Isometric tile size in screen pixels. */
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

export type WorldPos = { x: number; y: number; z?: number };
export type ScreenPos = { screenX: number; screenY: number };

/** Convert world grid coordinates to screen pixels. */
export function worldToScreen(x: number, y: number, z = 0): ScreenPos {
  const screenX = (x - y) * (TILE_WIDTH / 2);
  const screenY = (x + y) * (TILE_HEIGHT / 2) - z * TILE_HEIGHT;
  return { screenX, screenY };
}

/** Convert screen pixels to world grid coordinates (z ignored). */
export function screenToWorld(screenX: number, screenY: number): WorldPos {
  const x = screenX / TILE_WIDTH + screenY / TILE_HEIGHT;
  const y = screenY / TILE_HEIGHT - screenX / TILE_WIDTH;
  return { x, y };
}

/** Depth sort key from world Y (and slight X bias). Higher = drawn later. */
export function depthFromWorld(x: number, y: number): number {
  return y * 1000 + x;
}

/** Euclidean distance in world space. */
export function worldDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

/** Snap to tile center so sprites sit on the iso diamond (fixes float/desync). */
export function snapToTile(x: number, y: number): { x: number; y: number } {
  return { x: Math.floor(x) + 0.5, y: Math.floor(y) + 0.5 };
}

/**
 * Iso facing for SE-authored sprites: +1 faces screen-right, -1 screen-left.
 * Uses world Δ projected onto screen X (x − y).
 */
export function facingFromDelta(dx: number, dy: number): 1 | -1 {
  const screenDx = dx - dy;
  if (Math.abs(screenDx) < 0.08) {
    if (Math.abs(dx) + Math.abs(dy) < 0.01) return 1;
    return dy >= 0 ? 1 : -1;
  }
  return screenDx >= 0 ? 1 : -1;
}
