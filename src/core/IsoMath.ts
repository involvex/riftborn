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

/** Screen-right (+1) / screen-left (−1) for 2-dir sheets + flipX. */
export type FacingSign = 1 | -1;

/** Coarse 4-way from screen axes (future 4-dir sheets). */
export type FacingCardinal = 'e' | 'w' | 'n' | 's';

export type SpriteFacing = {
  sign: FacingSign;
  flipX: boolean;
  cardinal: FacingCardinal;
};

/**
 * Map world Δ to sprite facing for sheets authored facing screen-right.
 * - 2-dir: flipX only when screen-X dominates (E/W). Pure screen-Y moves
 *   (N/S) keep `prevSign` so sprites don't moonwalk while strafing iso-up.
 * - 4-dir: `cardinal` is always set for callers with directional sheets.
 */
export function spriteFacingFromDelta(
  dx: number,
  dy: number,
  prevSign: FacingSign = 1,
): SpriteFacing {
  const screenDx = dx - dy;
  const screenDy = dx + dy;
  const ax = Math.abs(screenDx);
  const ay = Math.abs(screenDy);

  if (ax < 0.08 && ay < 0.08) {
    return {
      sign: prevSign,
      flipX: prevSign < 0,
      cardinal: prevSign >= 0 ? 'e' : 'w',
    };
  }

  const cardinal: FacingCardinal =
    ax >= ay ? (screenDx >= 0 ? 'e' : 'w') : screenDy >= 0 ? 's' : 'n';

  // Hold facing on N/S so 2-dir sheets don't flip every iso-north step.
  let sign: FacingSign = prevSign;
  if (cardinal === 'e') sign = 1;
  else if (cardinal === 'w') sign = -1;

  return { sign, flipX: sign < 0, cardinal };
}

/**
 * Iso facing for SE-authored sprites: +1 faces screen-right, -1 screen-left.
 * Prefer `spriteFacingFromDelta` when sticky facing / cardinal is needed.
 */
export function facingFromDelta(
  dx: number,
  dy: number,
  prevSign: FacingSign = 1,
): FacingSign {
  return spriteFacingFromDelta(dx, dy, prevSign).sign;
}

/** Apply unified facing to a Phaser sprite (2-dir + flipX). */
export function applyFlipFacing(
  sprite: { setFlipX: (v: boolean) => void },
  facing: SpriteFacing | FacingSign,
): void {
  const flip = typeof facing === 'number' ? facing < 0 : facing.flipX;
  sprite.setFlipX(flip);
}
