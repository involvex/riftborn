/**
 * Shared combat-frame layout + RGBA derivation for sprite pipelines.
 * Mirrors src/render/AnimFrames.ts (keep in sync).
 */

export const FW = 128;
export const FH = 128;
export const CORE_FRAMES = 14;
export const HIT_COUNT = 2;
export const DEATH_COUNT = 4;
export const TOTAL_FRAMES = CORE_FRAMES + HIT_COUNT + DEATH_COUNT;

export function hitMotion(i) {
  if (i <= 0) {
    return { knockPx: -6, squashX: 1.05, squashY: 0.92, flash: 0.85 };
  }
  return { knockPx: -10, squashX: 1.12, squashY: 0.82, flash: 0.35 };
}

export function deathMotion(i) {
  const t = Math.max(0, Math.min(1, i / Math.max(1, DEATH_COUNT - 1)));
  return {
    shrink: 1 - t * 0.55,
    alpha: 1 - t * 0.92,
    settleY: Math.round(t * 14),
    scatterX: Math.round((i % 2 === 0 ? -1 : 1) * t * 8),
  };
}

export function hitSourceFrame(i) {
  return i <= 0 ? 13 : 0;
}

export function deathSourceFrame(i) {
  return i <= 1 ? 14 : 0;
}

/**
 * Apply hit transform to a FW×FH RGBA buffer.
 * @param {Buffer} rgba
 * @param {number} i hit index
 * @returns {Buffer}
 */
export function deriveHitRgba(rgba, i) {
  const m = hitMotion(i);
  return transformCell(rgba, {
    scaleX: m.squashX,
    scaleY: m.squashY,
    offsetX: m.knockPx,
    offsetY: Math.round((1 - m.squashY) * 6),
    flash: m.flash,
    alphaMul: 1,
  });
}

/**
 * Apply death dissolve to a FW×FH RGBA buffer.
 * @param {Buffer} rgba
 * @param {number} i death index
 * @returns {Buffer}
 */
export function deriveDeathRgba(rgba, i) {
  const m = deathMotion(i);
  return transformCell(rgba, {
    scaleX: m.shrink,
    scaleY: m.shrink,
    offsetX: m.scatterX,
    offsetY: m.settleY,
    flash: 0,
    alphaMul: m.alpha,
  });
}

/**
 * @param {Buffer} src
 * @param {{
 *   scaleX: number,
 *   scaleY: number,
 *   offsetX: number,
 *   offsetY: number,
 *   flash: number,
 *   alphaMul: number,
 * }} opts
 */
function transformCell(src, opts) {
  const out = Buffer.alloc(FW * FH * 4);
  const cx = FW / 2;
  const cy = FH * 0.88;
  for (let y = 0; y < FH; y++) {
    for (let x = 0; x < FW; x++) {
      const sx = Math.round((x - cx - opts.offsetX) / opts.scaleX + cx);
      const sy = Math.round((y - cy - opts.offsetY) / opts.scaleY + cy);
      if (sx < 0 || sy < 0 || sx >= FW || sy >= FH) continue;
      const si = (sy * FW + sx) * 4;
      const a = Math.round(src[si + 3] * opts.alphaMul);
      if (a < 1) continue;
      let r = src[si];
      let g = src[si + 1];
      let b = src[si + 2];
      if (opts.flash > 0) {
        r = Math.min(255, Math.round(r + (255 - r) * opts.flash));
        g = Math.min(255, Math.round(g + (255 - g) * opts.flash));
        b = Math.min(255, Math.round(b + (255 - b) * opts.flash));
      }
      // Checker dissolve on later death frames
      if (opts.alphaMul < 0.55 && (x + y) % 3 === 0) continue;
      const di = (y * FW + x) * 4;
      out[di] = r;
      out[di + 1] = g;
      out[di + 2] = b;
      out[di + 3] = a;
    }
  }
  return out;
}
