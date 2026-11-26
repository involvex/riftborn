/**
 * Build Riftborn multi-row enemy sheets from Liberated Pixel Cup monsters
 * (Charles Sanchez / LPC — CC-BY-SA 3.0 / GPL).
 *
 * Mapping:
 *   ghost → spr_shade
 *   snake → spr_crawler
 *   bee   → spr_wisp
 *   bat   → spr_bat (flying elite)
 *
 * Layout out: 4 facing rows × 20 frames (idle/walk/attack/hit/death).
 * LPC rows: 0 up, 1 left, 2 down, 3 right — matches octantSheetRow 4-dir.
 */
import { mkdir, writeFile } from 'node:fs/promises';
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
const LPC = path.join(ROOT, 'assets-src/sprites/lpc');
const OUT = path.join(ROOT, 'public/assets/sprites/game');
const FRAMES = TOTAL_FRAMES;
/** LPC up / left / down / right */
const FACE_ROWS = [0, 1, 2, 3];

/** @type {{ src: string, out: string, cols: number, rows: number, walkCols: number[], attackCols: number[] }[]} */
const MAP = [
  {
    src: 'ghost.png',
    out: 'spr_shade.png',
    cols: 6,
    rows: 4,
    walkCols: [0, 1, 2, 1, 0, 2],
    attackCols: [4, 5, 5, 4],
  },
  {
    src: 'snake.png',
    out: 'spr_crawler.png',
    cols: 7,
    rows: 4,
    walkCols: [0, 1, 2, 3, 2, 1],
    attackCols: [4, 5, 6, 4],
  },
  {
    src: 'bee.png',
    out: 'spr_wisp.png',
    cols: 6,
    rows: 4,
    walkCols: [0, 1, 2, 1, 0, 2],
    attackCols: [3, 4, 5, 4],
  },
  {
    src: 'bat.png',
    out: 'spr_bat.png',
    cols: 7,
    rows: 4,
    walkCols: [0, 1, 2, 3, 2, 1],
    attackCols: [4, 5, 6, 5],
  },
];

async function keyBlack(buf) {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const px = Buffer.from(data);
  for (let i = 0; i < px.length; i += 4) {
    const lum = (px[i] + px[i + 1] + px[i + 2]) / 3;
    if (lum < 14) px[i + 3] = 0;
    else if (lum < 28)
      px[i + 3] = Math.min(px[i + 3], Math.floor(((lum - 14) / 14) * 255));
  }
  return sharp(px, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function extractCell(sheetPath, cols, rows, col, row) {
  const meta = await sharp(sheetPath).metadata();
  const w = meta.width || 1;
  const h = meta.height || 1;
  const cw = Math.floor(w / cols);
  const ch = Math.floor(h / rows);
  const raw = await sharp(sheetPath)
    .extract({
      left: col * cw,
      top: row * ch,
      width: cw,
      height: ch,
    })
    .png()
    .toBuffer();
  return keyBlack(raw);
}

async function toCell(pngBuf, motion = { x: 0, y: 0, scale: 1 }) {
  let resized;
  try {
    const trimmed = sharp(pngBuf).trim({ threshold: 8 });
    const meta = await trimmed.metadata();
    const srcW = meta.width || 1;
    const srcH = meta.height || 1;
    const maxW = FW - 20;
    const maxH = FH - 24;
    const baseScale = Math.min(maxW / srcW, maxH / srcH);
    const scale =
      Math.min(Math.max(baseScale, 2.4), baseScale * 1.15) * motion.scale;
    const tw = Math.max(1, Math.min(maxW, Math.round(srcW * scale)));
    const th = Math.max(1, Math.min(maxH, Math.round(srcH * scale)));
    resized = await trimmed
      .resize(tw, th, { kernel: 'nearest', fit: 'fill' })
      .png()
      .toBuffer();
  } catch {
    resized = await sharp(pngBuf)
      .resize(FW - 28, FH - 32, { fit: 'inside', kernel: 'nearest' })
      .png()
      .toBuffer();
  }
  const rMeta = await sharp(resized).metadata();
  const rw = rMeta.width || 1;
  const rh = rMeta.height || 1;
  const left = Math.floor((FW - rw) / 2) + motion.x;
  const top = FH - rh - 10 + motion.y;
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

/** Build one facing row (20 cells) from an LPC face row. */
async function buildFacingRow(def, sheet, face) {
  const cells = [];
  for (let i = 0; i < 4; i++) {
    const col = def.walkCols[i % def.walkCols.length];
    const bob = Math.round(Math.sin((i / 4) * Math.PI * 2) * 2);
    const src = await extractCell(sheet, def.cols, def.rows, col, face);
    cells.push(await toCell(src, { x: 0, y: bob, scale: 1 }));
  }
  for (let i = 0; i < 6; i++) {
    const col = def.walkCols[i % def.walkCols.length];
    const t = (i / 6) * Math.PI * 2;
    const src = await extractCell(sheet, def.cols, def.rows, col, face);
    cells.push(
      await toCell(src, {
        x: Math.round(Math.sin(t) * 3),
        y: Math.round(-Math.abs(Math.sin(t)) * 3),
        scale: 1,
      }),
    );
  }
  for (let i = 0; i < 4; i++) {
    const col = def.attackCols[i % def.attackCols.length];
    const clamped = Math.min(col, def.cols - 1);
    const src = await extractCell(sheet, def.cols, def.rows, clamped, face);
    cells.push(
      await toCell(src, {
        x: i === 1 || i === 2 ? 4 : 0,
        y: i === 1 || i === 2 ? -3 : 0,
        scale: i === 2 ? 1.06 : 1,
      }),
    );
  }

  if (cells.length !== CORE_FRAMES) {
    throw new Error(
      `${def.out} face ${face}: expected ${CORE_FRAMES} core, got ${cells.length}`,
    );
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
    throw new Error(
      `${def.out} face ${face}: expected ${FRAMES}, got ${cells.length}`,
    );
  }
  return cells;
}

async function buildOne(def) {
  const sheet = path.join(LPC, def.src);
  const composites = [];
  for (let r = 0; r < FACE_ROWS.length; r++) {
    const face = Math.min(FACE_ROWS[r], def.rows - 1);
    const cells = await buildFacingRow(def, sheet, face);
    for (let i = 0; i < cells.length; i++) {
      composites.push({
        input: cells[i],
        left: i * FW,
        top: r * FH,
      });
    }
  }

  await sharp({
    create: {
      width: FW * FRAMES,
      height: FH * FACE_ROWS.length,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(path.join(OUT, def.out));

  console.log(
    `wrote ${def.out} (${FACE_ROWS.length} facing rows) from LPC ${def.src}`,
  );
}

await mkdir(OUT, { recursive: true });
for (const row of MAP) {
  await buildOne(row);
}

await writeFile(
  path.join(LPC, 'README.md'),
  `# LPC monster sources

Liberated Pixel Cup creatures by **Charles Sanchez (CharlesGabriel)**.

License: **CC-BY-SA 3.0** / **GNU GPL 3.0** (see
\`public/assets/ATTRIBUTION.md\`).

Processed into 4-facing-row sheets
\`game/spr_shade.png\`, \`spr_crawler.png\`, \`spr_wisp.png\`,
\`spr_bat.png\` via \`bun run scripts/process-lpc-enemies.mjs\`.
`,
);
console.log('done LPC enemies');
