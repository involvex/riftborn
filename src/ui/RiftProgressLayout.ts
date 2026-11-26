import { uiFontGamePx, uiFontPx } from '../core/UiFont';

const BASE_BAR_W = 14;
const BASE_BAR_H = 160;
/** Phone Low: shorter so the strip clears ATK / ACT. */
const TOUCH_BAR_H = 88;

export type RiftProgressLayout = {
  barW: number;
  barH: number;
  x: number;
  y: number;
  labelFont: string;
};

/** Pure layout for the kill → boss → exit strip. */
export function riftProgressLayout(opts: {
  touch: boolean;
  renderScale: number;
  gameW: number;
  gameH: number;
  mapClearance: number;
  minimap?: { x: number; y: number; w: number; h: number };
  atk?: { x: number; y: number; r: number };
  act?: { x: number; y: number; r: number };
}): RiftProgressLayout {
  const s = Math.min(1, Math.max(0.35, opts.renderScale || 1));
  if (!opts.touch) {
    const barH = BASE_BAR_H;
    return {
      barW: BASE_BAR_W,
      barH,
      x: opts.gameW - 28,
      y: Math.max(opts.mapClearance + barH / 2, opts.gameH / 2 + 40),
      labelFont: `${uiFontPx('rift', 'desktop')}px`,
    };
  }
  const barW = Math.max(6, Math.round(10 * s));
  const barH = Math.max(40, Math.round(TOUCH_BAR_H * s));
  const m = opts.minimap;
  const atk = opts.atk;
  const act = opts.act;
  // Bottom of strip sits above the right-hand combat cluster.
  let bottom = opts.gameH - Math.round(24 * s);
  if (atk) {
    bottom = Math.min(bottom, atk.y - atk.r - Math.round(14 * s));
  }
  if (act) {
    bottom = Math.min(bottom, act.y - act.r - Math.round(10 * s));
  }
  // Prefer under the minimap; fall back to mid-right if that clips.
  let topLimit = Math.round(8 * s);
  if (m) {
    topLimit = m.y + m.h + Math.round(10 * s);
  }
  if (bottom - barH < topLimit) {
    bottom = topLimit + barH;
  }
  const x = m ? m.x + m.w - Math.round(4 * s) : opts.gameW - Math.round(18 * s);
  return {
    barW,
    barH,
    x,
    y: bottom,
    labelFont: `${uiFontGamePx('rift', 'touch')}px`,
  };
}

export const RIFT_PROGRESS_BASE = {
  barW: BASE_BAR_W,
  barH: BASE_BAR_H,
} as const;
