import { screenDirToWorldDelta } from '../systems/SkillAim';

export type StickMoveResult = {
  worldDir: { x: number; y: number };
  speed01: number;
};

/** Layout/resize must not snap the knob home while the thumb is dragging. */
export function shouldResetStickOnLayout(pointerId: number | null): boolean {
  return pointerId === null;
}

/** Clamp a knob offset (from stick center) to the visual stick radius. */
export function clampStickKnobOffset(
  dx: number,
  dy: number,
  max: number,
): { dx: number; dy: number } {
  if (max <= 0) return { dx: 0, dy: 0 };
  const len = Math.hypot(dx, dy);
  if (len <= max || len === 0) return { dx, dy };
  return { dx: (dx / len) * max, dy: (dy / len) * max };
}

/**
 * Pure function to convert stick input to world movement.
 * dx, dy are screen-space offsets from stick center.
 * radius is the effective radius for normalization.
 */
export function stickToMove(
  dx: number,
  dy: number,
  radius: number,
): StickMoveResult {
  if (radius <= 0) {
    return { worldDir: { x: 1, y: 0 }, speed01: 0 };
  }

  const len = Math.hypot(dx, dy);
  const mag = len / radius;

  // Deadzone 0.12
  if (mag < 0.12) {
    return { worldDir: { x: 1, y: 0 }, speed01: 0 };
  }

  // Normalize screen direction
  const dirX = dx / len;
  const dirY = dy / len;

  // Convert screen direction to world direction (exactly one conversion)
  const worldDir = screenDirToWorldDelta(dirX, dirY);

  // Full speed at 0.5 magnitude, analogue in between
  let speed01: number;
  if (mag >= 0.5) {
    speed01 = 1;
  } else {
    // Scale from deadzone to full speed at 0.5
    speed01 = (mag - 0.12) / (0.5 - 0.12);
  }
  if (speed01 < 0) speed01 = 0;
  if (speed01 > 1) speed01 = 1;

  // Normalize world direction
  const wlen = Math.hypot(worldDir.dx, worldDir.dy) || 1;
  return {
    worldDir: { x: worldDir.dx / wlen, y: worldDir.dy / wlen },
    speed01,
  };
}

/**
 * Compute rest position for stick base (home position).
 * Returns position to return to when released.
 */
export function getStickRestPosition(layout: {
  stick: { x: number; y: number; r: number };
}): { x: number; y: number } {
  return { x: layout.stick.x, y: layout.stick.y };
}

/** Total stick accel ramp duration — soft start, full speed at the end. */
export const STICK_ACCEL_MS = 80;

/**
 * Accel ramp curve, front-loaded: sqrt keeps the 80 ms ease-in from a
 * standstill but reaches usable speed far earlier — a straight linear ramp
 * makes taps and micro-corrections feel sluggish (25 % at 20 ms).
 */
export function stickAccelFactor(elapsedMs: number): number {
  if (!(elapsedMs > 0)) return 0;
  const t = Math.min(1, elapsedMs / STICK_ACCEL_MS);
  return Math.sqrt(t);
}

/**
 * Check if a point is in the valid stick hit area.
 * Hit area is the whole lower left half of screen except SHIFT and DASH buttons.
 */
export function isInStickHitArea(
  px: number,
  py: number,
  width: number,
  height: number,
  dashX?: number,
  dashY?: number,
  dashR?: number,
  shiftX?: number,
  shiftY?: number,
  shiftR?: number,
): boolean {
  // Lower left half of screen
  if (px > width / 2) return false;
  if (py < height / 2) return false;

  // Exclude SHIFT and DASH buttons
  if (dashX !== undefined && dashY !== undefined && dashR !== undefined) {
    const distDash = Math.hypot(px - dashX, py - dashY);
    if (distDash <= dashR + 5) return false;
  }
  if (shiftX !== undefined && shiftY !== undefined && shiftR !== undefined) {
    const distShift = Math.hypot(px - shiftX, py - shiftY);
    if (distShift <= shiftR + 5) return false;
  }

  return true;
}
