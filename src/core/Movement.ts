import { FIGURE_COLLISION_RADIUS, footprintFits } from './FigureScale';

/** Max lateral nudge at a blocked corner (tiles). */
export const CORNER_NUDGE_MAX = 0.25;

export type SlideResult = { x: number; y: number; moved: boolean };

/**
 * `walkAt` is a full position check (e.g. Player.walkCheck / footprintFits
 * result) — not a raw tile sample. Axis-separated slide only (pre-M1f).
 */
export function slideMoveAxisOnly(
  walkAt: (x: number, y: number) => boolean,
  x: number,
  y: number,
  dx: number,
  dy: number,
): SlideResult {
  let nx = x;
  let ny = y;
  let moved = false;
  if (dx !== 0 && walkAt(x + dx, y)) {
    nx = x + dx;
    moved = true;
  }
  if (dy !== 0 && walkAt(nx, y + dy)) {
    ny = y + dy;
    moved = true;
  }
  return { x: nx, y: ny, moved };
}

/**
 * Axis-separated wall slide + corner nudge (≤ CORNER_NUDGE_MAX).
 * When both axes are blocked: lateral pre-nudge, angled deflection,
 * then pure lateral wall-slide so stair-step corners do not trap.
 */
export function slideMove(
  walkAt: (x: number, y: number) => boolean,
  x: number,
  y: number,
  dx: number,
  dy: number,
  nudgeMax: number = CORNER_NUDGE_MAX,
): SlideResult {
  const axis = slideMoveAxisOnly(walkAt, x, y, dx, dy);
  if (axis.moved) return axis;
  if ((dx === 0 && dy === 0) || nudgeMax <= 0) {
    return { x, y, moved: false };
  }

  const steps = 5;
  for (let i = 1; i <= steps; i++) {
    const n = (nudgeMax * i) / steps;
    for (const [ox, oy] of [
      [n, 0],
      [-n, 0],
      [0, n],
      [0, -n],
      [n, n],
      [n, -n],
      [-n, n],
      [-n, -n],
    ] as const) {
      const sx = x + ox;
      const sy = y + oy;
      if (!walkAt(sx, sy)) continue;
      const retried = slideMoveAxisOnly(walkAt, sx, sy, dx, dy);
      if (retried.moved) return retried;
    }
  }

  const mag = Math.hypot(dx, dy);
  if (mag < 1e-8) return { x, y, moved: false };
  const base = Math.atan2(dy, dx);
  let best: (SlideResult & { progress: number }) | null = null;
  for (const deg of [-90, -75, -60, -45, -30, -15, 15, 30, 45, 60, 75, 90]) {
    const ang = base + (deg * Math.PI) / 180;
    for (const scale of [1, 0.75, 0.5]) {
      const qx = x + Math.cos(ang) * mag * scale;
      const qy = y + Math.sin(ang) * mag * scale;
      if (!walkAt(qx, qy)) continue;
      const progress = dx * (qx - x) + dy * (qy - y);
      if (!best || progress > best.progress) {
        best = { x: qx, y: qy, moved: true, progress };
      }
    }
  }
  if (best) return { x: best.x, y: best.y, moved: true };

  let lateral: SlideResult | null = null;
  let bestProgress = -Infinity;
  for (let i = 1; i <= steps; i++) {
    const n = (nudgeMax * i) / steps;
    for (const [ox, oy] of [
      [n, 0],
      [-n, 0],
      [0, n],
      [0, -n],
    ] as const) {
      const qx = x + ox;
      const qy = y + oy;
      if (!walkAt(qx, qy)) continue;
      const progress = dx * ox + dy * oy;
      if (!lateral || progress > bestProgress) {
        bestProgress = progress;
        lateral = { x: qx, y: qy, moved: true };
      }
    }
  }
  if (lateral) return lateral;
  return { x, y, moved: false };
}

/**
 * Simulate slide+nudge steps through a corridor (mirrors Player.move).
 * `walkAt` is a raw tile sample; footprint is applied here.
 */
export function canTraverseWithFootprint(
  walkAt: (x: number, y: number) => boolean,
  start: { x: number; y: number },
  goal: { x: number; y: number },
  radius: number = FIGURE_COLLISION_RADIUS,
  step = 0.1,
): boolean {
  const fits = (x: number, y: number) => footprintFits(walkAt, x, y, radius);
  let x = start.x;
  let y = start.y;
  const maxIter = 500;
  for (let i = 0; i < maxIter; i++) {
    const dx = goal.x - x;
    const dy = goal.y - y;
    if (Math.hypot(dx, dy) <= step) {
      return fits(goal.x, goal.y);
    }
    const len = Math.hypot(dx, dy) || 1;
    const res = slideMove(fits, x, y, (dx / len) * step, (dy / len) * step);
    if (!res.moved) return false;
    x = res.x;
    y = res.y;
  }
  return false;
}
