/**
 * When AI quota is thin: derive walk_1/walk_2 from an existing walk or idle
 * by cropping/offset so the sheet isn't identical frames.
 * Only fills MISSING numbered poses.
 *
 * Usage: bun run scripts/synth-extra-walk-poses.mjs
 */
import { access, copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'public/assets/sprites');

const BASES = [
  'hero_warrior',
  'hero_female',
  'hero_mage',
  'hero_mystic',
  'enemy_shade',
  'enemy_crawler',
  'enemy_wisp',
  'enemy_rift_lord',
];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function derive(srcPath, outPath, opts) {
  const { data, info } = await sharp(srcPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  // Slight perspective shift via extract + pad so silhouette moves
  const cropL = Math.max(0, Math.floor(w * opts.cropL));
  const cropR = Math.max(0, Math.floor(w * opts.cropR));
  const cropT = Math.max(0, Math.floor(h * opts.cropT));
  const cropB = Math.max(0, Math.floor(h * opts.cropB));
  const ew = w - cropL - cropR;
  const eh = h - cropT - cropB;
  const extracted = await sharp(data, {
    raw: { width: w, height: h, channels: 4 },
  })
    .extract({ left: cropL, top: cropT, width: ew, height: eh })
    .resize(w, h, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(outPath);
  return extracted;
}

await mkdir(SRC, { recursive: true });

for (const base of BASES) {
  const candidates = [
    path.join(SRC, `${base}_walk.png`),
    path.join(SRC, `${base}_idle.png`),
    path.join(SRC, `${base}.png`),
    path.join(SRC, `${base}_walk_0.png`),
  ];
  let src = null;
  for (const c of candidates) {
    if (await exists(c)) {
      src = c;
      break;
    }
  }
  if (!src) {
    console.log('skip', base, '(no source)');
    continue;
  }

  const w0 = path.join(SRC, `${base}_walk_0.png`);
  const w1 = path.join(SRC, `${base}_walk_1.png`);
  const w2 = path.join(SRC, `${base}_walk_2.png`);
  const a0 = path.join(SRC, `${base}_attack_0.png`);

  if (!(await exists(w0))) {
    await copyFile(src, w0);
    console.log('seed walk_0', base);
  }
  if (!(await exists(w1))) {
    await derive(src, w1, {
      cropL: 0.04,
      cropR: 0,
      cropT: 0.02,
      cropB: 0,
    });
    console.log('synth walk_1', base);
  }
  if (!(await exists(w2))) {
    await derive(src, w2, {
      cropL: 0,
      cropR: 0.04,
      cropT: 0,
      cropB: 0.03,
    });
    console.log('synth walk_2', base);
  }

  const atkSrc = (await exists(path.join(SRC, `${base}_attack.png`)))
    ? path.join(SRC, `${base}_attack.png`)
    : src;
  if (!(await exists(a0))) {
    await derive(atkSrc, a0, {
      cropL: 0,
      cropR: 0.02,
      cropT: 0.05,
      cropB: 0,
    });
    console.log('synth attack_0', base);
  }
}

console.log('done');
