/**
 * Download a generated pose URL → PNG under public/assets/sprites/.
 * Usage: bun run scripts/save-pose-url.mjs <outName.png> <url>
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const [, , outName, url] = process.argv;
if (!outName || !url) {
  console.error('usage: bun run scripts/save-pose-url.mjs <name.png> <url>');
  process.exit(1);
}

const ROOT = path.resolve(import.meta.dirname, '..');
const dest = path.join(ROOT, 'public/assets/sprites', outName);
await mkdir(path.dirname(dest), { recursive: true });

const res = await fetch(url);
if (!res.ok) {
  console.error('fetch failed', res.status, url);
  process.exit(1);
}
const buf = Buffer.from(await res.arrayBuffer());
await sharp(buf).ensureAlpha().png().toFile(dest);
console.log('saved', dest);
