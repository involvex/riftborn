/**
 * Build 14-frame game sheets from idle portraits.
 * Walk/attack strips from AI often mismatch the idle character or are
 * identical frames — we synthesize motion from idle for a stable look.
 * Layout: idle 0–3, walk 4–9, attack 10–13 (128×128).
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

/** @type {{ idle: string, out: string }[]} */
const MAP = [
  { idle: 'hero_warrior_idle.png', out: 'spr_player_male.png' },
  { idle: 'hero_female_idle.png', out: 'spr_player_female.png' },
  { idle: 'hero_mystic_idle.png', out: 'spr_player_nonbinary.png' },
  { idle: 'hero_mystic_idle.png', out: 'spr_player_mystic.png' },
  { idle: 'hero_mage_idle.png', out: 'spr_player_mage.png' },
  { idle: 'enemy_crawler.png', out: 'spr_crawler.png' },
  { idle: 'enemy_shade.png', out: 'spr_shade.png' },
  { idle: 'enemy_wisp.png', out: 'spr_wisp.png' },
  { idle: 'enemy_rift_lord.png', out: 'spr_rift_lord.png' },
];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function knockBlackToPng(inputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const px = Buffer.from(data);
  for (let i = 0; i < px.length; i += 4) {
    const lum = (px[i] + px[i + 1] + px[i + 2]) / 3;
    if (lum < 18) px[i + 3] = 0;
    else if (lum < 32)
      px[i + 3] = Math.min(px[i + 3], Math.floor(((lum - 18) / 14) * 255));
  }
  return sharp(px, {
    raw: { width: info.width, height: info.height, channels: 4 },
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
    const maxW = FW - 24;
    const maxH = FH - 28;
    const baseScale = Math.min(maxW / srcW, maxH / srcH, 1);
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
  // Anchor near feet so bob/lunge doesn't float the sprite
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

/** Subtle stride bob — keeps the same isometric portrait identity. */
function walkMotion(i) {
  const t = (i / 6) * Math.PI * 2;
  const step = Math.sin(t);
  return {
    x: Math.round(step * 3),
    y: Math.round(-Math.abs(Math.sin(t)) * 4),
    scale: 1 + Math.abs(step) * 0.015,
  };
}

/** Wind-up → lunge → recover from the same idle art. */
function attackMotion(i) {
  const poses = [
    { x: -2, y: 1, scale: 0.98 },
    { x: 4, y: -2, scale: 1.04 },
    { x: 8, y: -3, scale: 1.06 },
    { x: 2, y: 0, scale: 1.0 },
  ];
  return poses[i] ?? poses[0];
}

async function buildSheet(row) {
  const idlePath = path.join(SRC, row.idle);
  if (!(await exists(idlePath))) {
    console.log(`skip missing idle ${row.idle}`);
    return false;
  }

  const idlePng = await knockBlackToPng(idlePath);
  const frames = [];

  for (let i = 0; i < 4; i++) {
    frames.push(await toCell(idlePng, idleMotion(i)));
  }
  for (let i = 0; i < 6; i++) {
    frames.push(await toCell(idlePng, walkMotion(i)));
  }
  for (let i = 0; i < 4; i++) {
    frames.push(await toCell(idlePng, attackMotion(i)));
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

  console.log(`wrote ${row.out} (idle-locked motion)`);
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
