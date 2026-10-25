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
