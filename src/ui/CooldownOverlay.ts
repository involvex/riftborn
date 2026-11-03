/**
 * Radial cooldown sweep helpers for touch skill pads.
 * Progress 1 = full remaining (dark overlay), 0 = ready.
 */

export function cooldownSweepProgress(
  remainingSec: number,
  totalSec: number,
): number {
  if (totalSec <= 0 || remainingSec <= 0) return 0;
  return Math.min(1, Math.max(0, remainingSec / totalSec));
}

type SweepGraphics = {
  clear: () => void;
  fillStyle: (c: number, a: number) => void;
  slice: (
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    anticlockwise?: boolean,
    overshoot?: boolean,
  ) => void;
};

/**
 * Draw a pie/sweep from -90° (12 o'clock) clockwise covering `progress`
 * of the circle. Graphics object should already be positioned at the pad.
 */
export function drawCooldownSweep(
  g: SweepGraphics,
  radius: number,
  progress: number,
  color = 0x05080c,
  alpha = 0.82,
): void {
  g.clear();
  if (progress <= 0.001) return;
  const start = -Math.PI / 2;
  const end = start + Math.PI * 2 * Math.min(1, progress);
  g.fillStyle(color, alpha);
  // Phaser slice fills a pie wedge (includes center).
  g.slice(0, 0, radius, start, end, false, true);
}
