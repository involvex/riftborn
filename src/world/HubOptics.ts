/**
 * Pure knobs for hub visual readability (V1 optics pass).
 * Keeps MapGen / WorldScene densities and tints testable.
 */

/** Random fringe decor spawn attempts (trees/rocks/bushes). */
export const HUB_FRINGE_DECOR_ATTEMPTS = 48;

/**
 * Chance a path tile also gets an adjacent bush/rock/lantern.
 * Lower = cleaner roads and POI approaches (was ~0.16).
 */
export const HUB_PATH_EDGE_DECOR_CHANCE = 0.1;

/** Soft green wash on wilderness floor tiles. */
export const HUB_WILD_FLOOR_TINT = 0xc4e0b8;

/** Soft transition wash between town and fringe. */
export const HUB_TRANSITION_FLOOR_TINT = 0xd8e4c8;

/** True when a walkable dungeon cell borders void/wall. */
export function isDungeonFloorEdge(
  cells: number[][],
  x: number,
  y: number,
): boolean {
  if (cells[y]?.[x] !== 1) return false;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (cells[y + dy]?.[x + dx] !== 1) return true;
    }
  }
  return false;
}
