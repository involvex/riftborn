import { slideMove } from '../core/Movement';

/**
 * Apply an AI step with optional footprint walk check.
 * When `walkAt` is set (rift/hub), void and walls block; otherwise only
 * the rectangle clamp applies (legacy / no-map tests).
 */
export function enemyTryMove(
  walkAt: ((x: number, y: number) => boolean) | null,
  x: number,
  y: number,
  dx: number,
  dy: number,
  maxBound: number,
): { x: number; y: number } {
  const next =
    walkAt && (dx !== 0 || dy !== 0)
      ? slideMove(walkAt, x, y, dx, dy)
      : { x: x + dx, y: y + dy };
  return {
    x: Math.min(maxBound, Math.max(0.5, next.x)),
    y: Math.min(maxBound, Math.max(0.5, next.y)),
  };
}

/** After a free leap step, snap back if the landing is illegal. */
export function enemyClampToWalk(
  walkAt: ((x: number, y: number) => boolean) | null,
  prevX: number,
  prevY: number,
  nextX: number,
  nextY: number,
  maxBound: number,
): { x: number; y: number; blocked: boolean } {
  const x = Math.min(maxBound, Math.max(0.5, nextX));
  const y = Math.min(maxBound, Math.max(0.5, nextY));
  if (!walkAt || walkAt(x, y)) {
    return { x, y, blocked: false };
  }
  return {
    x: Math.min(maxBound, Math.max(0.5, prevX)),
    y: Math.min(maxBound, Math.max(0.5, prevY)),
    blocked: true,
  };
}
