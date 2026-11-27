/**
 * Letterbox existing captures to 1920×1080 Store desktop screenshots.
 * Writes docs/screenshots/store/*.png
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'docs', 'screenshots');
const outDir = path.join(srcDir, 'store');
const W = 1920;
const H = 1080;
const BG = { r: 10, g: 12, b: 16, alpha: 1 };

const picks = [
  { src: 'town.png', out: '01-hub.png' },
  { src: 'hub.png', out: '01b-hub-alt.png' },
  { src: 'shift-ash.png', out: '02-shift-ash.png' },
  { src: 'shift-shadow.png', out: '03-shift-shadow.png' },
  { src: 'shift-combat.png', out: '04-combat.png' },
  { src: 'rift.png', out: '05-rift.png' },
];

fs.mkdirSync(outDir, { recursive: true });

for (const pick of picks) {
  const inPath = path.join(srcDir, pick.src);
  if (!fs.existsSync(inPath)) {
    console.warn('skip_missing', pick.src);
    continue;
  }
  const fitted = await sharp(inPath)
    .resize(W, H, { fit: 'contain', background: BG })
    .png()
    .toBuffer();
  const outPath = path.join(outDir, pick.out);
  await sharp(fitted).toFile(outPath);
  const meta = await sharp(outPath).metadata();
  console.log('wrote', pick.out, `${meta.width}x${meta.height}`);
}
