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

/** Coarse 4-way from screen axes (compat / HUD). */
export type FacingCardinal = 'e' | 'w' | 'n' | 's';

/**
 * Screen-space octant for iso aim / lean.
 * Sheets are still 2-dir (flipX); octant drives slash, lean, future rows.
 */
export type FacingOctant = 'e' | 'ne' | 'n' | 'nw' | 'w' | 'sw' | 's' | 'se';

export type SpriteFacing = {
  sign: FacingSign;
  flipX: boolean;
  cardinal: FacingCardinal;
  octant: FacingOctant;
  /** Subtle sprite lean (radians) so diagonals read vs cardinals. */
  lean: number;
  /** Unit screen direction (east +, south +) for VFX offsets. */
  screenX: number;
  screenY: number;
};

const OCTANTS: FacingOctant[] = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];

const OCTANT_LEAN: Record<FacingOctant, number> = {
  e: 0,
  se: 0.07,
  s: 0.1,
  sw: 0.07,
  w: 0,
  nw: -0.07,
  n: -0.1,
  ne: -0.07,
};

const OCTANT_SCREEN: Record<FacingOctant, { x: number; y: number }> = {
  e: { x: 1, y: 0 },
  se: { x: 0.707, y: 0.707 },
  s: { x: 0, y: 1 },
  sw: { x: -0.707, y: 0.707 },
  w: { x: -1, y: 0 },
  nw: { x: -0.707, y: -0.707 },
  n: { x: 0, y: -1 },
  ne: { x: 0.707, y: -0.707 },
};

function cardinalFromOctant(o: FacingOctant): FacingCardinal {
  if (o === 'e') return 'e';
  if (o === 'w') return 'w';
  if (o === 'n' || o === 'ne' || o === 'nw') return 'n';
  return 's';
}

/** Pick the nearest of 8 screen octants from world Δ. */
export function facingOctantFromDelta(
  dx: number,
  dy: number,
  prev: FacingOctant = 'e',
): FacingOctant {
  const screenDx = dx - dy;
  const screenDy = dx + dy;
  if (Math.abs(screenDx) < 0.08 && Math.abs(screenDy) < 0.08) return prev;
  // atan2(south, east) — 0 = screen-east, +π/2 = screen-south.
  const ang = Math.atan2(screenDy, screenDx);
  const sector = Math.round(ang / (Math.PI / 4));
  const idx = ((sector % 8) + 8) % 8;
  return OCTANTS[idx]!;
}

function facingFromOctant(
  octant: FacingOctant,
  prevSign: FacingSign,
): SpriteFacing {
  // Pure N/S: hold flip so 2-dir sheets don't moonwalk.
  let sign: FacingSign = prevSign;
  if (octant === 'e' || octant === 'ne' || octant === 'se') sign = 1;
  else if (octant === 'w' || octant === 'nw' || octant === 'sw') sign = -1;
  const screen = OCTANT_SCREEN[octant];
  return {
    sign,
    flipX: sign < 0,
    cardinal: cardinalFromOctant(octant),
    octant,
    lean: OCTANT_LEAN[octant],
    screenX: screen.x,
    screenY: screen.y,
  };
}

/**
 * Map world Δ to sprite facing for sheets authored facing screen-right.
 * - 2-dir: flipX from E/W-ish octants; pure N/S keep `prevSign`.
 * - 8-dir: `octant` + `lean` + screen unit for aim / slash VFX.
 */
export function spriteFacingFromDelta(
  dx: number,
  dy: number,
  prevSign: FacingSign = 1,
  prevOctant: FacingOctant = prevSign >= 0 ? 'e' : 'w',
): SpriteFacing {
  const octant = facingOctantFromDelta(dx, dy, prevOctant);
  return facingFromOctant(octant, prevSign);
}

/**
 * Iso facing for SE-authored sprites: +1 faces screen-right, -1 screen-left.
 * Prefer `spriteFacingFromDelta` when sticky facing / octant is needed.
 */
export function facingFromDelta(
  dx: number,
  dy: number,
  prevSign: FacingSign = 1,
): FacingSign {
  return spriteFacingFromDelta(dx, dy, prevSign).sign;
}

/** Apply 2-dir flipX (lean is caller-owned — walk bob composes it). */
export function applyFlipFacing(
  sprite: { setFlipX: (v: boolean) => void },
  facing: SpriteFacing | FacingSign,
): void {
  const flip = typeof facing === 'number' ? facing < 0 : facing.flipX;
  sprite.setFlipX(flip);
}

/**
 * Facing rows ≥2 encode left/right in the sheet — clear flipX.
 * Single-row sheets keep sticky flipX.
 */
export function applySheetFacing(
  sprite: { setFlipX: (v: boolean) => void },
  facing: SpriteFacing | FacingSign,
  rowCount: number,
): void {
  if (rowCount > 1) {
    sprite.setFlipX(false);
    return;
  }
  applyFlipFacing(sprite, facing);
}

/** Screen unit vector for an octant (east +, south +). */
export function octantScreenUnit(octant: FacingOctant): {
  x: number;
  y: number;
} {
  return { ...OCTANT_SCREEN[octant] };
}
