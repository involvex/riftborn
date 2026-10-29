/**
 * Convert hackcraft.de particle TGAs (CC-BY) → PNG for Phaser.
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'public/assets/vfx/particles');
const OUT = path.join(ROOT, 'public/assets/vfx/particles');

/** Keep the FX we actually preload in-game. */
const KEEP = new Set([
  'fireflash',
  'fireburst',
  'fireball',
  'bloodsplat',
  'plasmablast',
  'plasmashot',
  'shrapflash',
  'thunderflash',
]);

/**
 * Uncompressed 32-bit TGA → RGBA Buffer.
 * @param {Buffer} buf
 */
function decodeTga(buf) {
  const type = buf[2];
  if (type !== 2) throw new Error(`unsupported TGA type ${type}`);
  const w = buf.readUInt16LE(12);
  const h = buf.readUInt16LE(14);
  const depth = buf[16];
  const desc = buf[17];
  if (depth !== 32) throw new Error(`expected 32-bit TGA, got ${depth}`);
  const topOrigin = (desc & 0x20) !== 0;
  const pixels = Buffer.alloc(w * h * 4);
  let src = 18;
  for (let y = 0; y < h; y++) {
    const dy = topOrigin ? y : h - 1 - y;
    for (let x = 0; x < w; x++) {
      const b = buf[src++];
      const g = buf[src++];
      const r = buf[src++];
      const a = buf[src++];
      const i = (dy * w + x) * 4;
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      pixels[i + 3] = a;
    }
  }
  return { pixels, w, h };
}

await mkdir(OUT, { recursive: true });
const files = await readdir(SRC);
let n = 0;
for (const file of files) {
  if (!file.endsWith('.tga')) continue;
  const base = file.replace(/\.tga$/i, '');
  if (!KEEP.has(base)) continue;
  const raw = await readFile(path.join(SRC, file));
  const { pixels, w, h } = decodeTga(raw);
  await sharp(pixels, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile(path.join(OUT, `${base}.png`));
  n++;
  console.log(`wrote ${base}.png`);
}

await writeFile(
  path.join(OUT, 'README.md'),
  `# Particle FX

Source TGA pack by **hackcraft.de** (CC-BY). Converted subset via
\`bun run scripts/process-particles.mjs\`.

Keys used in-game: ${[...KEEP].join(', ')}.
`,
);
console.log(`done ${n} particle PNGs`);
