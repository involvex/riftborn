/**
 * One fight per rift split across ash + shadow on the same tile.
 * SHIFT swaps which half is solid (ghosting already handles the rest).
 */

import type { ShiftLayerId } from '../data/shiftLayers';
import type { ZoneLayout } from './MapGen';

export const SPLIT_ASH_ID = 'enemy_rift_goblin';
export const SPLIT_SHADOW_ID = 'enemy_bone_archer';
export const SPLIT_HALF_COUNT = 2;
/** Keep the puzzle away from the opening packs. */
export const SPLIT_MIN_DIST = 6;

export type SplitPackHalf = {
  enemyId: string;
  count: number;
  x: number;
  y: number;
  layer: ShiftLayerId;
  split: true;
};

export const SPLIT_ENTER_TOAST = 'Split pack — SHIFT swaps who is solid';

/** True when this pack is one half of the SHIFT fight. */
export function isSplitPack(p: { split?: boolean }): boolean {
  return !!p.split;
}

/** Layout always carries zero or one ash+shadow pair on a shared tile. */
export function findSplitPackTile(
  packs: readonly { x: number; y: number; split?: boolean }[],
): { x: number; y: number } | null {
  const half = packs.find((p) => p.split);
  return half ? { x: half.x, y: half.y } : null;
}

/**
 * Append ash goblins + shadow archers on one reachable tile.
 * Extra foes — does not replace openers or layer-supply packs.
 */
export function stampShiftSplitPack(opts: {
  packs: ZoneLayout['packs'];
  candidates: { x: number; y: number }[];
  spawn: { x: number; y: number };
  used: Set<string>;
  minDist?: number;
}): { x: number; y: number } | null {
  const minDist = opts.minDist ?? SPLIT_MIN_DIST;
  if (opts.packs.some((p) => p.split)) return null;

  const ranked = [...opts.candidates]
    .filter((c) => {
      const d = Math.hypot(c.x - opts.spawn.x, c.y - opts.spawn.y);
      return d >= minDist;
    })
    .sort(
      (a, b) =>
        Math.hypot(a.x - opts.spawn.x, a.y - opts.spawn.y) -
        Math.hypot(b.x - opts.spawn.x, b.y - opts.spawn.y),
    );

  for (const c of ranked) {
    const key = `${Math.floor(c.x)},${Math.floor(c.y)}`;
    if (opts.used.has(key)) continue;
    // Prefer a quiet tile — not stacked on an existing pack center.
    let crowded = false;
    for (const p of opts.packs) {
      if (Math.hypot(p.x - c.x, p.y - c.y) < 1.6) {
        crowded = true;
        break;
      }
    }
    if (crowded) continue;

    opts.used.add(key);
    const ash: SplitPackHalf = {
      enemyId: SPLIT_ASH_ID,
      count: SPLIT_HALF_COUNT,
      x: c.x,
      y: c.y,
      layer: 'ash',
      split: true,
    };
    const shadow: SplitPackHalf = {
      enemyId: SPLIT_SHADOW_ID,
      count: SPLIT_HALF_COUNT,
      x: c.x,
      y: c.y,
      layer: 'shadow',
      split: true,
    };
    opts.packs.push(ash, shadow);
    return { x: c.x, y: c.y };
  }
  return null;
}
