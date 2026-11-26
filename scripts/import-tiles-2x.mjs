/**
 * Normalize Bing 2× tile JPEGs → 256×128 PNG (magenta→alpha, trim, fit).
 *
 *   bun run scripts/import-tiles-2x.mjs
 *
 * Reads D:\repos\image-wizard-cli\out-tiles-2x\tiles\*_0.jpeg
 * Writes public/assets/tiles/{id}.png
 */
import { copyFile, mkdir, readdir, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.resolve('D:/repos/image-wizard-cli/out-tiles-2x/tiles');
const OUT = path.join(ROOT, 'public/assets/tiles');
const BACKUP = path.join(ROOT, 'assets-src/tiles/legacy-128');
const TW = 256;
const TH = 128;

/**
 * Magenta chroma key — JPEG compresses #FF00FF into a wide pink band.
 * @param {number} r @param {number} g @param {number} b
 */
function isNearMagenta(r, g, b) {
  // Classic key + JPEG bleed (high R+B, low G).
  if (g > 110) return false;
  if (r >= 180 && b >= 180) return true;
  if (r >= 140 && b >= 100 && r + b >= 280 && g <= 90) return true;
  if (r >= 160 && b >= 80 && g <= 60 && r - g >= 80) return true;
  return false;
}

/** Iso diamond alpha for a 256×128 canvas (2:1). */
function applyIsoDiamondMask(data, w, h) {
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      // Manhattan diamond in 2:1 space.
      const dx = Math.abs(x - cx) / (w / 2);
      const dy = Math.abs(y - cy) / (h / 2);
      if (dx + dy > 1.02) data[i + 3] = 0;
    }
  }
}

/** Job id → shipped texture key (drop _0.jpeg suffix). */
const MAP = [
  ['tile_hub_0', 'tile_hub_0'],
  ['tile_hub_1', 'tile_hub_1'],
  ['tile_hub_2', 'tile_hub_2'],
  ['tile_hub_3', 'tile_hub_3'],
  ['tile_hub_4', 'tile_hub_4'],
  ['tile_hub_plaza_warm', 'tile_hub_plaza_warm'],
  ['tile_hub_cobble_wet', 'tile_hub_cobble_wet'],
  ['tile_dungeon_0', 'tile_dungeon_0'],
  ['tile_dungeon_1', 'tile_dungeon_1'],
  ['tile_dungeon_2', 'tile_dungeon_2'],
  ['tile_dungeon_ashen', 'tile_dungeon_ashen'],
  ['tile_dungeon_crystal', 'tile_dungeon_crystal'],
  ['tile_dungeon_grove', 'tile_dungeon_grove'],
  ['tile_dungeon_salt', 'tile_dungeon_salt'],
  ['tile_dungeon_ash_grit', 'tile_dungeon_ash_grit'],
  ['tile_dungeon_salt_crust', 'tile_dungeon_salt_crust'],
];

/**
 * @param {string} inputPath
 * @param {string} outputPath
 */
async function normalizeTile(inputPath, outputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    if (isNearMagenta(data[i], data[i + 1], data[i + 2])) {
      data[i + 3] = 0;
    }
  }

  let spritePng = await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();

  try {
    spritePng = await sharp(spritePng).trim({ threshold: 12 }).png().toBuffer();
  } catch {
    /* keep */
  }

  const meta = await sharp(spritePng).metadata();
  const srcW = meta.width || 1;
  const srcH = meta.height || 1;
  // Cover 256×128 then center-crop — Bing slabs are ~square after trim;
  // letterboxing left half-empty iso diamonds on the floor.
  const scale = Math.max(TW / srcW, TH / srcH);
  const fittedW = Math.max(TW, Math.round(srcW * scale));
  const fittedH = Math.max(TH, Math.round(srcH * scale));
  // Bias crop upward so the diamond face stays in frame (slab sides below).
  const left = Math.max(0, Math.floor((fittedW - TW) / 2));
  const top = Math.max(0, Math.floor((fittedH - TH) * 0.28));

  const { data: cropped, info: cInfo } = await sharp(spritePng)
    .resize(fittedW, fittedH, { kernel: 'nearest' })
    .extract({ left, top, width: TW, height: TH })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Second pass: kill JPEG-bleed pink that survived the first key.
  for (let i = 0; i < cropped.length; i += 4) {
    if (isNearMagenta(cropped[i], cropped[i + 1], cropped[i + 2])) {
      cropped[i + 3] = 0;
    }
  }
  applyIsoDiamondMask(cropped, cInfo.width, cInfo.height);

  const tmpPath = `${outputPath}.tmp.png`;
  // Palette off — pngquant remaps soft alpha edges into pink sludge.
  await sharp(cropped, {
    raw: {
      width: cInfo.width,
      height: cInfo.height,
      channels: 4,
    },
  })
    .png({ compressionLevel: 9 })
    .toFile(tmpPath);
  try {
    await unlink(outputPath);
  } catch {
    /* no prior */
  }
  await rename(tmpPath, outputPath);
  return { width: TW, height: TH, fittedW, fittedH, cropTop: top };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await mkdir(BACKUP, { recursive: true });

  const files = await readdir(SRC);
  console.log(`Source: ${SRC} (${files.length} files)`);

  for (const [jobId, outKey] of MAP) {
    const srcName = `${jobId}_0.jpeg`;
    const srcPath = path.join(SRC, srcName);
    if (!files.includes(srcName)) {
      console.warn(`  skip missing ${srcName}`);
      continue;
    }
    const dest = path.join(OUT, `${outKey}.png`);
    // Backup existing hub/dungeon replacements once.
    if (
      outKey.startsWith('tile_hub_') ||
      outKey === 'tile_dungeon_0' ||
      outKey === 'tile_dungeon_1' ||
      outKey === 'tile_dungeon_2'
    ) {
      try {
        await copyFile(dest, path.join(BACKUP, `${outKey}.png`));
      } catch {
        /* no prior */
      }
    }
    const r = await normalizeTile(srcPath, dest);
    console.log(
      `  ${outKey}.png  ${r.width}×${r.height} (cover ${r.fittedW}×${r.fittedH}, top ${r.cropTop})`,
    );
  }
  console.log('Done →', OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
