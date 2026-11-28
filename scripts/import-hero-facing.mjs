/**
 * Pick facing idle sources from image-wizard out-hero-facing into
 * assets-src/sprites/facing/{base}_idle_{n|ne|e|s}.png
 *
 * Prefers *_0.jpeg/png; falls back to *_1 if _0 missing.
 * Converts to PNG for the pipeline.
 * Usage:
 *   bun run scripts/import-hero-facing.mjs
 *   bun run scripts/import-hero-facing.mjs D:/repos/image-wizard-cli/out-hero-facing
 */
import { access, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const DEST = path.join(ROOT, 'assets-src/sprites/facing');
const DEFAULT_SRC = path.resolve('D:/repos/image-wizard-cli/out-hero-facing');

const BASES = ['hero_warrior', 'hero_female', 'hero_mage', 'hero_mystic'];
const FACES = ['n', 'ne', 'e', 's'];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function findCandidate(srcRoot, id) {
  const heroesDir = path.join(srcRoot, 'heroes');
  const dirs = [heroesDir, srcRoot];
  for (const dir of dirs) {
    if (!(await exists(dir))) continue;
    for (const idx of [0, 1, 2, 3]) {
      for (const ext of ['jpeg', 'jpg', 'png', 'webp']) {
        const p = path.join(dir, `${id}_${idx}.${ext}`);
        if (await exists(p)) return p;
      }
    }
    try {
      const files = await readdir(dir);
      const hit = files.filter((f) => f.startsWith(`${id}_`)).sort();
      if (hit[0]) return path.join(dir, hit[0]);
    } catch {
      /* empty */
    }
  }
  return null;
}

const srcRoot = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_SRC;

await mkdir(DEST, { recursive: true });
let ok = 0;
let missing = 0;
for (const base of BASES) {
  for (const face of FACES) {
    const id = `${base}_idle_${face}`;
    const found = await findCandidate(srcRoot, id);
    if (!found) {
      console.log(`MISSING ${id}`);
      missing++;
      continue;
    }
    const dest = path.join(DEST, `${id}.png`);
    await sharp(found).png().toFile(dest);
    console.log(`ok ${id} ← ${found}`);
    ok++;
  }
}
console.log(`imported ${ok}/16 (missing ${missing}) from ${srcRoot}`);
if (missing > 0) process.exitCode = 1;
