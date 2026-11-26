export type ShiftHudTouchMetrics = {
  x: number;
  y: number;
  barW: number;
  barH: number;
  barY: number;
  hintY: number;
};

/**
 * Park the SHIFT strip just under the status block so it never covers
 * HP / XP / bounty / FPS on Low-buffer phones.
 */
export function shiftHudTouchMetrics(opts: {
  statusX: number;
  statusY: number;
  statusH: number;
  renderScale: number;
}): ShiftHudTouchMetrics {
  const s = Math.min(1, Math.max(0.35, opts.renderScale || 1));
  return {
    x: opts.statusX,
    y: opts.statusY + opts.statusH + Math.round(2 * s),
    barW: Math.max(72, Math.round(140 * s)),
    barH: Math.max(5, Math.round(8 * s)),
    barY: Math.round(16 * s),
    hintY: Math.round(26 * s),
  };
}
