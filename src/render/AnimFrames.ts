/**
 * Painted sheet layout + combat-frame derivation params.
 * One facing row: idle 0–3, walk 4–9, attack 10–13, hit 14–15, death 16–19.
 * Multi-row sheets stack DIR_STRIDE frames per facing (4-dir LPC or 8-dir).
 * Hit/death cells are derived from idle/attack (no separate pose art).
 */

import type { FacingOctant } from '../core/IsoMath';

export const PAINTED_CELL = 128;
/** Core poses only (legacy sheets). */
export const CORE_FRAMES = 14;
export const HIT_COUNT = 2;
export const DEATH_COUNT = 4;
export const TOTAL_FRAMES = CORE_FRAMES + HIT_COUNT + DEATH_COUNT;
/** Frames per facing row (idle…death). */
export const DIR_STRIDE = TOTAL_FRAMES;

export const ANIM_RANGES = {
  idle: { start: 0, end: 3 },
  walk: { start: 4, end: 9 },
  attack: { start: 10, end: 13 },
  hit: { start: 14, end: 15 },
  death: { start: 16, end: 19 },
} as const;

export type AnimRangeKey = keyof typeof ANIM_RANGES;

/** How many facing rows a sheet encodes (1 = flipX sheets). */
export function sheetRowCount(frameTotal: number): number {
  if (frameTotal < DIR_STRIDE) return 1;
  return Math.max(1, Math.floor(frameTotal / DIR_STRIDE));
}

/**
 * Map screen octant → sheet row.
 * 8-dir: e,se,s,sw,w,nw,n,ne (matches IsoMath OCTANTS).
 * 4-dir LPC: 0 up, 1 left, 2 down, 3 right.
 */
export function octantSheetRow(octant: FacingOctant, rowCount: number): number {
  if (rowCount <= 1) return 0;
  if (rowCount >= 8) {
    const eight: FacingOctant[] = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
    return Math.max(0, eight.indexOf(octant));
  }
  // 2–7 rows: treat as 4-dir LPC.
  switch (octant) {
    case 'n':
    case 'ne':
      return 0;
    case 'w':
    case 'nw':
      return 1;
    case 's':
    case 'sw':
      return 2;
    default:
      return 3;
  }
}

/** Absolute start/end frame for a kind on a given facing row. */
export function animRangeForRow(
  kind: AnimRangeKey,
  row: number,
): { start: number; end: number } {
  const base = ANIM_RANGES[kind];
  const off = Math.max(0, row) * DIR_STRIDE;
  return { start: base.start + off, end: base.end + off };
}

/** Phaser anim key — octant suffix when the sheet has facing rows. */
export function sheetAnimKey(
  textureKey: string,
  kind: AnimRangeKey,
  octant: FacingOctant,
  rowCount: number,
): string {
  if (rowCount <= 1) return `${textureKey}_${kind}`;
  return `${textureKey}_${kind}_${octant}`;
}

export type HitMotion = {
  /** Horizontal knockback in cell px (screen-right positive). */
  knockPx: number;
  squashX: number;
  squashY: number;
  /** 0 = none, 1 = full white flash. */
  flash: number;
};

/** Derive hit-frame transform from attack/idle source index `i` (0..HIT_COUNT-1). */
export function hitMotion(i: number): HitMotion {
  if (i <= 0) {
    return { knockPx: -6, squashX: 1.05, squashY: 0.92, flash: 0.85 };
  }
  return { knockPx: -10, squashX: 1.12, squashY: 0.82, flash: 0.35 };
}

export type DeathMotion = {
  shrink: number;
  alpha: number;
  /** Vertical settle (positive = down). */
  settleY: number;
  /** Horizontal scatter. */
  scatterX: number;
};

/** Dissolve params for death frame `i` (0..DEATH_COUNT-1). */
export function deathMotion(i: number): DeathMotion {
  const t = Math.max(0, Math.min(1, i / Math.max(1, DEATH_COUNT - 1)));
  return {
    shrink: 1 - t * 0.55,
    alpha: 1 - t * 0.92,
    settleY: Math.round(t * 14),
    scatterX: Math.round((i % 2 === 0 ? -1 : 1) * t * 8),
  };
}

/** Source cell index for deriving hit frame `i` (prefer attack wind-down). */
export function hitSourceFrame(i: number): number {
  return i <= 0 ? ANIM_RANGES.attack.end : ANIM_RANGES.idle.start;
}

/** Source cell index for deriving death frame `i`. */
export function deathSourceFrame(i: number): number {
  if (i <= 1) return ANIM_RANGES.hit.start;
  return ANIM_RANGES.idle.start;
}
