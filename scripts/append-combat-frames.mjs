/**
 * Extend existing 14-frame game sheets with derived hit/death cells → 20 frames.
 * Safe to re-run: 20-frame sheets are left alone.
 */
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  CORE_FRAMES,
  DEATH_COUNT,
  FH,
  FW,
  HIT_COUNT,
  TOTAL_FRAMES,
  deathSourceFrame,
  deriveDeathRgba,
  deriveHitRgba,
  hitSourceFrame,
} from './lib/combat-frames.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public/assets/sprites/game');

const SHEETS = [
  'spr_player_male',
  'spr_player_female',
  'spr_player_nonbinary',
  'spr_player_mage',
  'spr_player_mystic',
  'spr_shade',
  'spr_crawler',
  'spr_wisp',
  'spr_bat',
  'spr_rift_lord',
];

async function cellRgba(sheetPath, frame) {
  const { data } = await sharp(sheetPath)
    .extract({ left: frame * FW, top: 0, width: FW, height: FH })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return Buffer.from(data);
}

async function rgbaToPng(rgba) {
  return sharp(rgba, {
    raw: { width: FW, height: FH, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function extendOne(name) {
  const file = path.join(OUT, `${name}.png`);
  const meta = await sharp(file).metadata();
  const w = meta.width || 0;
  if (w >= FW * TOTAL_FRAMES) {
    console.log(`skip ${name} (already ${TOTAL_FRAMES}+ frames)`);
    return false;
  }
  if (w < FW * CORE_FRAMES) {
    console.log(`skip ${name} (unexpected width ${w})`);
    return false;
  }

  const cores = [];
  for (let i = 0; i < CORE_FRAMES; i++) {
    cores.push(await rgbaToPng(await cellRgba(file, i)));
  }

  /** @type {Buffer[]} */
  const hitCells = [];
  for (let i = 0; i < HIT_COUNT; i++) {
    const src = await cellRgba(file, hitSourceFrame(i));
    hitCells.push(await rgbaToPng(deriveHitRgba(src, i)));
  }

  /** @type {Buffer[]} */
  const deathCells = [];
  for (let i = 0; i < DEATH_COUNT; i++) {
    const srcIdx = deathSourceFrame(i);
    const src =
      srcIdx >= CORE_FRAMES
        ? await sharp(hitCells[srcIdx - CORE_FRAMES])
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true })
            .then((r) => Buffer.from(r.data))
        : await cellRgba(file, srcIdx);
    deathCells.push(await rgbaToPng(deriveDeathRgba(src, i)));
  }

  const cells = [...cores, ...hitCells, ...deathCells];
  if (cells.length !== TOTAL_FRAMES) {
    throw new Error(`${name}: expected ${TOTAL_FRAMES}, got ${cells.length}`);
  }

  await sharp({
    create: {
      width: FW * TOTAL_FRAMES,
      height: FH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(cells.map((input, i) => ({ input, left: i * FW, top: 0 })))
    .png()
    .toFile(file);

  console.log(`extended ${name} → ${TOTAL_FRAMES} frames`);
  return true;
}

await readdir(OUT);
let n = 0;
for (const name of SHEETS) {
  if (await extendOne(name)) n += 1;
}
console.log(`done append-combat-frames (${n} updated)`);
