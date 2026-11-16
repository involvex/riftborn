/**
 * Exit portal sits near the boss-room anchor, not at the player's feet.
 * Pure search so tests don't need Phaser.
 */

export type PortalPoint = { x: number; y: number };

/**
 * Prefer `preferred` (boss room), then `fallback` (player).
 * Returns tile centers (`n + 0.5`) on the first walkable cell in a
 * Chebyshev ring expand.
 */
export function pickExitPortalPoint(opts: {
  preferred: PortalPoint | null;
  fallback: PortalPoint;
  isWalkable: (tx: number, ty: number) => boolean;
  maxRadius?: number;
}): PortalPoint {
  const maxR = opts.maxRadius ?? 6;
  const seeds = opts.preferred
    ? [opts.preferred, opts.fallback]
    : [opts.fallback];

  for (const seed of seeds) {
    const sx = Math.floor(seed.x);
    const sy = Math.floor(seed.y);
    for (let r = 0; r <= maxR; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const tx = sx + dx;
          const ty = sy + dy;
          if (opts.isWalkable(tx, ty)) {
            return { x: tx + 0.5, y: ty + 0.5 };
          }
        }
      }
    }
  }

  return {
    x: Math.floor(opts.fallback.x) + 0.5,
    y: Math.floor(opts.fallback.y) + 0.5,
  };
}
