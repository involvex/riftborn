/**
 * Build 8-facing-row hero sheets (idle + walk readable; attack synth).
 *
 * Layout: 8 rows × 20 frames (128×128 cells) → 2560×1024 PNG.
 * Row order matches AnimFrames octantSheetRow 8-dir:
 *   e, se, s, sw, w, nw, n, ne
 *
 * Sources:
 *   SE: assets-src/sprites/{base}_idle.png + walk poses
 *   N/NE/E/S: assets-src/sprites/facing/{base}_idle_{n|ne|e|s}.png
 *   W/NW/SW: horizontal mirrors of E/NE/SE
 *
 * Overwrites only the five player sheets; enemies stay 1-row.
 */
import { access, copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  CORE_FRAMES,
  DEATH_COUNT,
  FH,
  FW,
  HIT_COUNT,
  TOTAL_FRAMES,
  deriveDeathRgba,
  deriveHitRgba,
  hitSourceFrame,
} from './lib/combat-frames.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'assets-src/sprites');
const FACING = path.join(SRC, 'facing');
const OUT = path.join(ROOT, 'public/assets/sprites/game');
const FRAMES = TOTAL_FRAMES;
const FACE_ROWS = 8;

/** Octant row order — must match AnimFrames octantSheetRow (≥8). */
const OCTANTS = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];

/**
 * @type {{
 *   base: string,
 *   outs: string[],
 * }[]}
 */
const HEROES = [
  { base: 'hero_warrior', outs: ['spr_player_male.png'] },
  { base: 'hero_female', outs: ['spr_player_female.png'] },
  {
    base: 'hero_mystic',
    outs: ['spr_player_mystic.png', 'spr_player_nonbinary.png'],
  },
  { base: 'hero_mage', outs: ['spr_player_mage.png'] },
];

/** Painted facing keys we require on disk (mirrors are derived). */
const PAINTED = ['n', 'ne', 'e', 's'];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Edge-flood chroma key (heroes keep dark cloth — edge only).
 * @param {string | Buffer} input
 */
async function keyBackground(input) {
  const { data, info } = await sharp(input)
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
    if (blackStudio) return (r + g + b) / 3 < 28;
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
    px[idx * 4 + 3] = 0;
    const x = idx % w;
    const y = (idx / w) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  let opaque = 0;
  for (let i = 3; i < px.length; i += 4) {
    if (px[i] > 40) opaque++;
  }
  if (opaque < 800) {
    throw new Error('keyed PNG has too little opaque silhouette');
  }

  return sharp(px, {
    raw: { width: w, height: h, channels: 4 },
  })
    .png()
    .toBuffer();
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

async function flipH(pngBuf) {
  return sharp(pngBuf).flop().png().toBuffer();
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

async function loadSeWalkCells(base, seIdlePng) {
  /** @type {Buffer[]} */
  const numbered = [];
  for (let i = 0; i < 8; i++) {
    const p = path.join(SRC, `${base}_walk_${i}.png`);
    if (await exists(p)) {
      numbered.push(await keyBackground(p));
    } else if (numbered.length > 0) {
      break;
    }
  }
  if (numbered.length >= 2) {
    const cycle = [...numbered, ...numbered.slice(1, -1).reverse()];
    const cells = [];
    for (let i = 0; i < 6; i++) {
      cells.push(await toCell(cycle[i % cycle.length], walkMotion(i)));
    }
    return cells;
  }
  const stripPath = path.join(SRC, `${base}_walk.png`);
  if (await exists(stripPath)) {
    const strip = await keyBackground(stripPath);
    const meta = await sharp(strip).metadata();
    const w = meta.width || 1;
    const h = meta.height || 1;
    const count = 6;
    if (w >= h * (count - 0.35) && w / h >= count * 0.7) {
      const cellW = Math.floor(w / count);
      const cells = [];
      for (let i = 0; i < count; i++) {
        const slice = await sharp(strip)
          .extract({ left: i * cellW, top: 0, width: cellW, height: h })
          .png()
          .toBuffer();
        cells.push(await toCell(slice, walkMotion(i)));
      }
      return cells;
    }
    const cells = [];
    for (let i = 0; i < 6; i++) {
      cells.push(await toCell(strip, walkMotion(i)));
    }
    return cells;
  }
  const cells = [];
  for (let i = 0; i < 6; i++) {
    cells.push(await toCell(seIdlePng, walkMotion(i)));
  }
  return cells;
}

/**
 * Resolve painted idle PNG for an octant (SE from root; others from facing/).
 * @param {string} base
 * @param {string} oct
 */
async function loadIdleForOctant(base, oct) {
  if (oct === 'se') {
    const p = path.join(SRC, `${base}_idle.png`);
    if (!(await exists(p))) throw new Error(`missing SE idle ${p}`);
    return keyBackground(p);
  }
  if (oct === 'sw') {
    const se = await loadIdleForOctant(base, 'se');
    return flipH(se);
  }
  if (oct === 'w') {
    const e = await loadIdleForOctant(base, 'e');
    return flipH(e);
  }
  if (oct === 'nw') {
    const ne = await loadIdleForOctant(base, 'ne');
    return flipH(ne);
  }
  const p = path.join(FACING, `${base}_idle_${oct}.png`);
  if (!(await exists(p))) {
    throw new Error(`missing facing idle ${p}`);
  }
  return keyBackground(p);
}

async function appendCombat(cells) {
  if (cells.length !== CORE_FRAMES) {
    throw new Error(`expected ${CORE_FRAMES} core, got ${cells.length}`);
  }
  for (let i = 0; i < HIT_COUNT; i++) {
    const src = cells[hitSourceFrame(i)];
    const { data } = await sharp(src)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    cells.push(
      await sharp(deriveHitRgba(Buffer.from(data), i), {
        raw: { width: FW, height: FH, channels: 4 },
      })
        .png()
        .toBuffer(),
    );
  }
  for (let i = 0; i < DEATH_COUNT; i++) {
    const src = i <= 1 ? cells[14] : cells[0];
    const { data } = await sharp(src)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    cells.push(
      await sharp(deriveDeathRgba(Buffer.from(data), i), {
        raw: { width: FW, height: FH, channels: 4 },
      })
        .png()
        .toBuffer(),
    );
  }
  if (cells.length !== FRAMES) {
    throw new Error(`expected ${FRAMES} frames, got ${cells.length}`);
  }
  return cells;
}

/**
 * Build one facing row (20 cells).
 * @param {string} base
 * @param {string} oct
 * @param {Buffer} seIdle
 * @param {Buffer[]} seWalkCells
 */
async function buildFacingRow(base, oct, seIdle, seWalkCells) {
  const idlePng = await loadIdleForOctant(base, oct);
  /** @type {Buffer[]} */
  const cells = [];
  for (let i = 0; i < 4; i++) {
    cells.push(await toCell(idlePng, idleMotion(i)));
  }

  if (oct === 'se') {
    cells.push(...seWalkCells);
  } else if (oct === 'sw') {
    for (let i = 0; i < 6; i++) {
      cells.push(await flipH(seWalkCells[i]));
    }
  } else {
    // Bob walk from that facing's idle (plan: attack can stay synth;
    // non-SE walk uses idle bob).
    for (let i = 0; i < 6; i++) {
      cells.push(await toCell(idlePng, walkMotion(i)));
    }
  }

  for (let i = 0; i < 4; i++) {
    const m = attackMotion(i);
    // Mirror attack lean on west-ish rows so the lunge faces the octant.
    const flipAtk = oct === 'w' || oct === 'nw' || oct === 'sw';
    const motion = flipAtk ? { ...m, x: -m.x } : m;
    cells.push(await toCell(idlePng, motion));
  }

  return appendCombat(cells);
}

async function buildHero(hero) {
  for (const face of PAINTED) {
    const p = path.join(FACING, `${hero.base}_idle_${face}.png`);
    if (!(await exists(p))) {
      throw new Error(`refuse: missing ${p}`);
    }
  }

  const seIdle = await loadIdleForOctant(hero.base, 'se');
  const seWalk = await loadSeWalkCells(hero.base, seIdle);

  /** @type {{ input: Buffer, left: number, top: number }[]} */
  const composites = [];
  for (let r = 0; r < OCTANTS.length; r++) {
    const oct = OCTANTS[r];
    const cells = await buildFacingRow(hero.base, oct, seIdle, seWalk);
    for (let i = 0; i < cells.length; i++) {
      composites.push({
        input: cells[i],
        left: i * FW,
        top: r * FH,
      });
    }
  }

  const outW = FW * FRAMES;
  const outH = FH * FACE_ROWS;
  if (outW !== 2560 || outH !== 1024) {
    throw new Error(`unexpected sheet size ${outW}×${outH}`);
  }

  const primary = path.join(OUT, hero.outs[0]);
  await sharp({
    create: {
      width: outW,
      height: outH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(primary);

  const meta = await sharp(primary).metadata();
  if (meta.width !== 2560 || meta.height !== 1024) {
    throw new Error(
      `${hero.outs[0]} got ${meta.width}×${meta.height}, expected 2560×1024`,
    );
  }

  for (let i = 1; i < hero.outs.length; i++) {
    await copyFile(primary, path.join(OUT, hero.outs[i]));
  }

  console.log(`wrote ${hero.outs.join(', ')} (8 facing rows, ${outW}×${outH})`);
}

await mkdir(OUT, { recursive: true });
await mkdir(FACING, { recursive: true });

for (const hero of HEROES) {
  await buildHero(hero);
}
console.log('done hero 8-dir sheets');
