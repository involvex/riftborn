/**
 * Build 14-frame game sheets (128×128 cells).
 * Layout: idle 0–3, walk 4–9, attack 10–13.
 *
 * Prefers real pose sources when present:
 *   {base}_idle.png
 *   {base}_walk_0..5.png  OR  {base}_walk.png (single / horizontal strip)
 *   {base}_attack_0..3.png OR  {base}_attack.png
 * Falls back to idle-locked bob/lunge synthesis.
 */
import { access, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'public/assets/sprites');
const OUT = path.join(ROOT, 'public/assets/sprites/game');
const FW = 128;
const FH = 128;
const FRAMES = 14;

/**
 * @type {{
 *   base: string,
 *   idle: string,
 *   out: string,
 *   synthOnly?: boolean,
 * }[]}
 */
const MAP = [
  {
    base: 'hero_warrior',
    idle: 'hero_warrior_idle.png',
    out: 'spr_player_male.png',
  },
  {
    base: 'hero_female',
    idle: 'hero_female_idle.png',
    out: 'spr_player_female.png',
  },
  {
    base: 'hero_mystic',
    idle: 'hero_mystic_idle.png',
    out: 'spr_player_nonbinary.png',
  },
  {
    base: 'hero_mystic',
    idle: 'hero_mystic_idle.png',
    out: 'spr_player_mystic.png',
  },
  {
    base: 'hero_mage',
    idle: 'hero_mage_idle.png',
    out: 'spr_player_mage.png',
  },
  // Enemy walk/attack AI still ships pedestals / shrine tiles — bob the
  // cleaned idle until we re-gen pedestal-free poses.
  // shade / crawler / wisp come from LPC (process-lpc-enemies.mjs)
  {
    base: 'enemy_rift_lord',
    idle: 'enemy_rift_lord.png',
    out: 'spr_rift_lord.png',
    synthOnly: true,
  },
];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Kill AI "card" backgrounds that caused flickering scaffolding.
 * Always flood from edges only — never globally knock near-black
 * (that turned the mage's dark robes into a ghost body).
 *
 * @param {string} inputPath
 * @param {{ stripPedestal?: boolean }} [opts]
 */
async function keyBackgroundToPng(inputPath, opts = {}) {
  const stripPedestal = opts.stripPedestal !== false;
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const px = Buffer.from(data);
  const n = w * h;

  const sample = (x, y) => {
    const i = (y * w + x) * 4;
    return [px[i], px[i + 1], px[i + 2], px[i + 3]];
  };
  const corners = [
    sample(0, 0),
    sample(w - 1, 0),
    sample(0, h - 1),
    sample(w - 1, h - 1),
    sample(Math.floor(w / 2), 0),
    sample(Math.floor(w / 2), h - 1),
    sample(0, Math.floor(h / 2)),
    sample(w - 1, Math.floor(h / 2)),
  ].filter((c) => c[3] > 8);

  const cornerLum =
    corners.reduce((s, c) => s + (c[0] + c[1] + c[2]) / 3, 0) /
    Math.max(1, corners.length);

  const blackStudio = cornerLum < 40;
  const matchesBg = (r, g, b) => {
    if (blackStudio) {
      // Edge-connected near-black only (preserves dark cloth interiors)
      return (r + g + b) / 3 < 28;
    }
    for (const [cr, cg, cb] of corners) {
      const dr = r - cr;
      const dg = g - cg;
      const db = b - cb;
      if (dr * dr + dg * dg + db * db < 52 * 52) return true;
    }
    return false;
  };

  const seen = new Uint8Array(n);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const idx = y * w + x;
    if (seen[idx]) return;
    const i = idx * 4;
    if (px[i + 3] < 8) {
      seen[idx] = 1;
      return;
    }
    if (!matchesBg(px[i], px[i + 1], px[i + 2])) return;
    seen[idx] = 1;
    stack.push(idx);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }

  while (stack.length) {
    const idx = stack.pop();
    const i = idx * 4;
    px[i + 3] = 0;
    const x = idx % w;
    const y = (idx / w) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  // Soft fringe only on pixels already next to cleared BG
  const fringe = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const i = idx * 4;
      if (px[i + 3] < 8) continue;
      const lum = (px[i] + px[i + 1] + px[i + 2]) / 3;
      // Keep dark robes: only soft-knock very-near-black fringe
      if (lum >= (blackStudio ? 14 : 22)) continue;
      let nextToClear = false;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) {
          nextToClear = true;
          break;
        }
        if (px[(ny * w + nx) * 4 + 3] < 8) {
          nextToClear = true;
          break;
        }
      }
      if (nextToClear) fringe.push(i);
    }
  }
  for (const i of fringe) {
    const lum = (px[i] + px[i + 1] + px[i + 2]) / 3;
    if (lum < 8) px[i + 3] = 0;
    else px[i + 3] = Math.min(px[i + 3], Math.floor(((lum - 8) / 10) * 200));
  }

  // Pedestal strip eats dark robes (low-sat near-black matches "shadow").
  // Only run it for enemy / non-hero sources.
  if (stripPedestal) {
    stripPedestalInPlace(px, w, h);
  }

  return sharp(px, {
    raw: { width: w, height: h, channels: 4 },
  })
    .png()
    .toBuffer();
}

/** Low-sat stone / dirt / shadow platform pixels. */
function isPlatformPixel(r, g, b) {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const sat = mx === 0 ? 0 : (mx - mn) / mx;
  const lum = (r + g + b) / 3;
  // Grey cobble / charcoal tile
  if (sat < 0.32 && lum > 18 && lum < 185) return true;
  // Brown / pinkish brick
  if (
    r > 28 &&
    r >= g - 8 &&
    g >= b - 16 &&
    sat < 0.5 &&
    lum > 22 &&
    lum < 170
  ) {
    return true;
  }
  // Dark drop-shadow puddles on pedestals
  if (lum < 28 && sat < 0.45) return true;
  // Fire-glow maroon tile fringe left after strip
  if (r < 120 && g < 70 && b < 55 && lum < 75 && r >= g) return true;
  return false;
}

/**
 * Clear isometric pedestals / tile fringes connected from the bottom.
 */
function stripPedestalInPlace(px, w, h) {
  const n = w * h;
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] < 24) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX <= minX || maxY <= minY) return;

  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const seen = new Uint8Array(n);
  const stack = [];
  const push = (x, y) => {
    if (x < minX || y < minY || x > maxX || y > maxY) return;
    const idx = y * w + x;
    if (seen[idx]) return;
    const i = idx * 4;
    if (px[i + 3] < 20) {
      seen[idx] = 1;
      return;
    }
    if (!isPlatformPixel(px[i], px[i + 1], px[i + 2])) return;
    // Don't climb into the upper character body
    if (y < minY + Math.floor(bh * 0.38)) return;
    seen[idx] = 1;
    stack.push(idx);
  };

  // Seed: bottom edge of content + wide platform runs in lower half
  for (let x = minX; x <= maxX; x++) push(x, maxY);
  for (let y = maxY; y >= maxY - 6 && y >= minY; y--) {
    for (let x = minX; x <= maxX; x++) push(x, y);
  }
  const bandTop = minY + Math.floor(bh * 0.42);
  for (let y = bandTop; y <= maxY; y++) {
    let run = 0;
    let runStart = minX;
    for (let x = minX; x <= maxX + 1; x++) {
      const ok =
        x <= maxX &&
        px[(y * w + x) * 4 + 3] > 20 &&
        isPlatformPixel(
          px[(y * w + x) * 4],
          px[(y * w + x) * 4 + 1],
          px[(y * w + x) * 4 + 2],
        );
      if (ok) {
        if (run === 0) runStart = x;
        run++;
      } else {
        if (run > bw * 0.22) {
          for (let xx = runStart; xx < runStart + run; xx++) push(xx, y);
        }
        run = 0;
      }
    }
  }

  while (stack.length) {
    const idx = stack.pop();
    const i = idx * 4;
    px[i + 3] = 0;
    const x = idx % w;
    const y = (idx / w) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  // Sweep leftover platform / maroon diamond fringe in the lower half
  for (let pass = 0; pass < 3; pass++) {
    for (let y = minY + Math.floor(bh * 0.45); y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const i = (y * w + x) * 4;
        if (px[i + 3] < 20) continue;
        if (!isPlatformPixel(px[i], px[i + 1], px[i + 2])) continue;
        let nearClear = false;
        let opaqueN = 0;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          [2, 0],
          [-2, 0],
          [0, 2],
          [0, -2],
          [1, 1],
          [-1, 1],
          [1, -1],
          [-1, -1],
        ]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) {
            nearClear = true;
            continue;
          }
          if (px[(ny * w + nx) * 4 + 3] < 20) nearClear = true;
          else opaqueN++;
        }
        // Thin outline scraps (diamond tile edges) have few opaque neighbors
        if (nearClear || opaqueN <= 4) px[i + 3] = 0;
      }
    }
  }

  // Drop tiny orphan scraps under the figure (stray pedestal crumbs)
  const mark = new Int32Array(n);
  let label = 0;
  const sizes = [0];
  const minsY = [0];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const start = y * w + x;
      if (mark[start] || px[start * 4 + 3] < 20) continue;
      label++;
      sizes.push(0);
      minsY.push(y);
      const q = [start];
      mark[start] = label;
      while (q.length) {
        const idx = q.pop();
        sizes[label]++;
        const cx = idx % w;
        const cy = (idx / w) | 0;
        if (cy < minsY[label]) minsY[label] = cy;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < minX || ny < minY || nx > maxX || ny > maxY) continue;
          const nidx = ny * w + nx;
          if (mark[nidx] || px[nidx * 4 + 3] < 20) continue;
          mark[nidx] = label;
          q.push(nidx);
        }
      }
    }
  }
  let main = 1;
  for (let i = 2; i <= label; i++) {
    if (sizes[i] > sizes[main]) main = i;
  }
  const floorY = minY + Math.floor(bh * 0.62);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = y * w + x;
      const lab = mark[idx];
      if (!lab || lab === main) continue;
      // Small crumbs, especially ones that only live near the floor
      if (sizes[lab] < 900 || minsY[lab] > floorY) {
        px[idx * 4 + 3] = 0;
      }
    }
  }
}

/** True if chroma-key left a big opaque card (bad walk pose). */
async function isCardLike(pngBuf) {
  const { data, info } = await sharp(pngBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  let opaque = 0;
  let cornerHit = 0;
  const probes = [
    [2, 2],
    [w - 3, 2],
    [2, h - 3],
    [w - 3, h - 3],
    [Math.floor(w / 2), 2],
    [Math.floor(w / 2), h - 3],
  ];
  for (const [x, y] of probes) {
    const i = (y * w + x) * 4;
    if (data[i + 3] > 40) cornerHit++;
  }
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 40) opaque++;
  }
  const fill = opaque / (w * h);
  // Card: corners still solid OR almost the whole frame is filled
  return cornerHit >= 3 || fill > 0.72;
}

/**
 * Reject environment props mistaken for attack/walk poses
 * (fire shrine tiles, cairns, full iso floors).
 */
async function isSceneLike(pngBuf) {
  const { data, info } = await sharp(pngBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  let opaque = 0;
  let stone = 0;
  let hot = 0;
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] < 40) continue;
      opaque++;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (isPlatformPixel(r, g, b)) stone++;
      // Bright fire / lava
      if (r > 160 && g > 60 && g < 200 && b < 100) hot++;
    }
  }
  if (opaque < 800) return true;
  const bw = Math.max(1, maxX - minX + 1);
  const bh = Math.max(1, maxY - minY + 1);
  const aspect = bw / bh;
  const bboxFill = opaque / (bw * bh);
  const stoneShare = stone / opaque;
  const hotShare = hot / opaque;
  // Iso tile / shrine: squat bbox, lots of stone, often multi-flame
  if (aspect > 0.85 && aspect < 1.55 && stoneShare > 0.28 && bboxFill > 0.28) {
    return true;
  }
  if (stoneShare > 0.35 && hotShare > 0.08 && aspect > 0.9) return true;
  // Leftover pedestal still wider than the figure after strip
  let botWide = 0;
  const yBot = maxY - Math.floor(bh * 0.12);
  for (let y = Math.max(minY, yBot); y <= maxY; y++) {
    let row = 0;
    for (let x = minX; x <= maxX; x++) {
      if (data[(y * w + x) * 4 + 3] > 40) row++;
    }
    if (row > botWide) botWide = row;
  }
  if (botWide > bw * 0.72 && stoneShare > 0.18) return true;
  return false;
}

async function knockBlackToPng(inputPath, opts = {}) {
  return keyBackgroundToPng(inputPath, opts);
}

async function toCell(pngBuf, motion = { x: 0, y: 0, scale: 1 }) {
  let resized;
  try {
    const trimmed = sharp(pngBuf).trim({ threshold: 8 });
    const meta = await trimmed.metadata();
    const srcW = meta.width || 1;
    const srcH = meta.height || 1;
    const maxW = FW - 16;
    const maxH = FH - 20;
    // Allow upscale so small AI crops fill the cell (tiny sprites looked
    // "frozen" / unreadable in-world).
    const baseScale = Math.min(maxW / srcW, maxH / srcH);
    const scale = baseScale * motion.scale;
    const tw = Math.max(1, Math.round(srcW * scale));
    const th = Math.max(1, Math.round(srcH * scale));
    resized = await trimmed
      .resize(tw, th, { kernel: 'nearest', fit: 'fill' })
      .png()
      .toBuffer();
  } catch {
    resized = await sharp(pngBuf)
      .resize(FW - 24, FH - 28, { fit: 'inside', kernel: 'nearest' })
      .png()
      .toBuffer();
  }

  const rMeta = await sharp(resized).metadata();
  const rw = rMeta.width || 1;
  const rh = rMeta.height || 1;
  const left = Math.floor((FW - rw) / 2) + motion.x;
  const top = FH - rh - 8 + motion.y;

  return sharp({
    create: {
      width: FW,
      height: FH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: resized,
        left: Math.max(0, Math.min(FW - rw, left)),
        top: Math.max(0, Math.min(FH - rh, top)),
      },
    ])
    .png()
    .toBuffer();
}

function idleMotion(i) {
  return {
    x: 0,
    y: Math.round(Math.sin((i / 4) * Math.PI * 2) * 1.5),
    scale: 1,
  };
}

function walkMotion(i) {
  const t = (i / 6) * Math.PI * 2;
  const step = Math.sin(t);
  return {
    x: Math.round(step * 5),
    y: Math.round(-Math.abs(Math.sin(t)) * 6),
    scale: 1 + Math.abs(step) * 0.03,
  };
}

function attackMotion(i) {
  const poses = [
    { x: -3, y: 2, scale: 0.97 },
    { x: 5, y: -3, scale: 1.05 },
    { x: 10, y: -4, scale: 1.08 },
    { x: 2, y: 0, scale: 1.0 },
  ];
  return poses[i] ?? poses[0];
}

/** Extract N cells from a horizontal strip, or return [buf] if single. */
async function sliceStripOrSingle(pngBuf, count) {
  const meta = await sharp(pngBuf).metadata();
  const w = meta.width || 1;
  const h = meta.height || 1;
  // Treat as strip if roughly count cells wide
  if (w >= h * (count - 0.35) && w / h >= count * 0.7) {
    const cellW = Math.floor(w / count);
    const out = [];
    for (let i = 0; i < count; i++) {
      out.push(
        await sharp(pngBuf)
          .extract({
            left: i * cellW,
            top: 0,
            width: cellW,
            height: h,
          })
          .png()
          .toBuffer(),
      );
    }
    return out;
  }
  return [pngBuf];
}

/** Expand fewer numbered poses into `count` frames (e.g. 3 → 6 walk). */
function expandPoseCycle(bufs, count) {
  if (bufs.length >= count) return bufs.slice(0, count);
  if (bufs.length === 0) return bufs;
  const out = [];
  // Ping-pong so a 3-pose set reads as a loop without a hard cut.
  const cycle = [...bufs, ...bufs.slice(1, -1).reverse()];
  for (let i = 0; i < count; i++) {
    out.push(cycle[i % cycle.length]);
  }
  return out;
}

async function filterUsablePoses(bufs) {
  /** @type {Buffer[]} */
  const ok = [];
  for (const buf of bufs) {
    if (await isCardLike(buf)) continue;
    if (await isSceneLike(buf)) continue;
    ok.push(buf);
  }
  return ok;
}

async function loadPoseBuffers(base, kind, count) {
  const keyOpts = { stripPedestal: !base.startsWith('hero_') };
  /** @type {Buffer[]} */
  const numbered = [];
  for (let i = 0; i < 8; i++) {
    const p = path.join(SRC, `${base}_${kind}_${i}.png`);
    if (await exists(p)) {
      numbered.push(await knockBlackToPng(p, keyOpts));
    } else if (numbered.length > 0) {
      break;
    }
  }
  const goodNumbered = await filterUsablePoses(numbered);
  if (goodNumbered.length >= 2) {
    return {
      buffers: expandPoseCycle(goodNumbered, count),
      mode: 'numbered',
    };
  }
  // One clean numbered pose → treat as single (motion synth later)
  if (goodNumbered.length === 1) {
    return { buffers: goodNumbered, mode: 'single' };
  }
  if (numbered.length > 0 && goodNumbered.length === 0) {
    console.log(`  skip card-like ${base}_${kind}_* (${numbered.length})`);
  }

  const singlePath = path.join(SRC, `${base}_${kind}.png`);
  if (await exists(singlePath)) {
    const raw = await knockBlackToPng(singlePath, keyOpts);
    if (await isCardLike(raw)) {
      console.log(`  skip card-like ${base}_${kind}.png`);
      return null;
    }
    if (await isSceneLike(raw)) {
      console.log(`  skip scene-like ${base}_${kind}.png`);
      return null;
    }
    const sliced = await sliceStripOrSingle(raw, count);
    if (sliced.length === count) {
      return { buffers: sliced, mode: 'strip' };
    }
    return { buffers: sliced, mode: 'single' };
  }
  return null;
}

async function fillRatio(pngBuf) {
  const { data, info } = await sharp(pngBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let opaque = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 40) opaque++;
  }
  return opaque / (info.width * info.height);
}

async function meanRgb(pngBuf) {
  const { data } = await sharp(pngBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let n = 0;
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 40) continue;
    n++;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  if (n < 1) return [0, 0, 0];
  return [r / n, g / n, b / n];
}

/** Reject AI poses that are a different subject (mech vs shade, etc.). */
async function poseMatchesIdle(idleBuf, poseBuf) {
  const a = await fillRatio(idleBuf);
  const b = await fillRatio(poseBuf);
  if (a < 0.01 || b < 0.01) return false;
  const ratio = b / a;
  if (ratio < 0.45 || ratio > 2.4) return false;
  // Palette gate — walk frames of a different hero looked like flicker
  const [ar, ag, ab] = await meanRgb(idleBuf);
  const [br, bg, bb] = await meanRgb(poseBuf);
  const dr = ar - br;
  const dg = ag - bg;
  const db = ab - bb;
  const dist = Math.sqrt(dr * dr + dg * dg + db * db);
  return dist < 55;
}

async function cellsFromPoseSource(pose, count, synthMotion) {
  if (!pose) return null;
  const { buffers, mode } = pose;
  if (mode === 'numbered' || mode === 'strip') {
    const cells = [];
    for (const buf of buffers) {
      cells.push(await toCell(buf, { x: 0, y: 0, scale: 1 }));
    }
    return cells;
  }
  // Single portrait: amplify motion so it reads vs idle
  const cells = [];
  for (let i = 0; i < count; i++) {
    cells.push(await toCell(buffers[0], synthMotion(i)));
  }
  return cells;
}

async function acceptPose(idlePng, pose, label) {
  if (!pose) return null;
  for (const buf of pose.buffers) {
    if (!(await poseMatchesIdle(idlePng, buf))) {
      console.log(`  skip mismatched ${label}`);
      return null;
    }
  }
  return pose;
}

/** Final gate on 128×128 cells — no card corners, not a speck. */
async function cellsLookSolid(cells) {
  for (const cell of cells) {
    if (await isSceneLike(cell)) return false;
    const { data, info } = await sharp(cell)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const w = info.width;
    const h = info.height;
    let opaque = 0;
    let corners = 0;
    let stone = 0;
    for (const [x, y] of [
      [1, 1],
      [w - 2, 1],
      [1, h - 2],
      [w - 2, h - 2],
    ]) {
      if (data[(y * w + x) * 4 + 3] > 40) corners++;
    }
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] <= 40) continue;
      opaque++;
      if (isPlatformPixel(data[i], data[i + 1], data[i + 2])) stone++;
    }
    // Pedestal still glued under the figure
    if (stone / Math.max(1, opaque) > 0.3) return false;
    if (corners > 0 || opaque < 2800) return false;
  }
  return true;
}

async function buildSheet(row) {
  const idlePath = path.join(SRC, row.idle);
  if (!(await exists(idlePath))) {
    console.log(`skip missing idle ${row.idle}`);
    return false;
  }

  const idlePng = await knockBlackToPng(idlePath, {
    stripPedestal: !row.base.startsWith('hero_'),
  });
  const frames = [];
  let walkMode = 'idle-synth';
  let attackMode = 'idle-synth';

  for (let i = 0; i < 4; i++) {
    frames.push(await toCell(idlePng, idleMotion(i)));
  }

  if (!row.synthOnly) {
    const walkPose = await acceptPose(
      idlePng,
      await loadPoseBuffers(row.base, 'walk', 6),
      `${row.base}_walk`,
    );
    let walkCells = await cellsFromPoseSource(walkPose, 6, walkMotion);
    if (walkCells && !(await cellsLookSolid(walkCells))) {
      console.log(`  reject thin/card walk cells ${row.base}`);
      walkCells = null;
    }
    if (walkCells) {
      frames.push(...walkCells);
      walkMode = walkPose.mode;
    }
  }
  if (walkMode === 'idle-synth') {
    for (let i = 0; i < 6; i++) {
      frames.push(await toCell(idlePng, walkMotion(i)));
    }
  }

  if (!row.synthOnly) {
    const attackPose = await acceptPose(
      idlePng,
      await loadPoseBuffers(row.base, 'attack', 4),
      `${row.base}_attack`,
    );
    let attackCells = await cellsFromPoseSource(attackPose, 4, attackMotion);
    if (attackCells && !(await cellsLookSolid(attackCells))) {
      console.log(`  reject thin/card attack cells ${row.base}`);
      attackCells = null;
    }
    if (attackCells) {
      frames.push(...attackCells);
      attackMode = attackPose.mode;
    }
  }
  if (attackMode === 'idle-synth') {
    for (let i = 0; i < 4; i++) {
      frames.push(await toCell(idlePng, attackMotion(i)));
    }
  }

  if (frames.length !== FRAMES) {
    throw new Error(
      `${row.out}: expected ${FRAMES} frames, got ${frames.length}`,
    );
  }

  await sharp({
    create: {
      width: FW * FRAMES,
      height: FH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(frames.map((input, i) => ({ input, left: i * FW, top: 0 })))
    .png()
    .toFile(path.join(OUT, row.out));

  console.log(`wrote ${row.out} (walk=${walkMode}, attack=${attackMode})`);
  return true;
}

await mkdir(OUT, { recursive: true });
let n = 0;
for (const row of MAP) {
  if (await buildSheet(row)) n += 1;
}
const files = await readdir(OUT);
console.log(`done ${n} sheets → ${OUT}`);
console.log(files.filter((f) => f.endsWith('.png')).join(', '));
