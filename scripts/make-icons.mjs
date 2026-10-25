import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = path.join(root, 'electron', 'build');
const sourceJpg = path.join(buildDir, 'source-icon.jpg');
const pngPath = path.join(buildDir, 'icon.png');
const icoPath = path.join(buildDir, 'icon.ico');
const faviconOut = path.join(root, 'public', 'favicon.png');

fs.mkdirSync(buildDir, { recursive: true });

if (!fs.existsSync(sourceJpg)) {
  console.error('Missing', sourceJpg);
  process.exit(1);
}

await sharp(sourceJpg).resize(512, 512, { fit: 'cover' }).png().toFile(pngPath);

await sharp(sourceJpg).resize(64, 64).png().toFile(faviconOut);

const sizes = [16, 24, 32, 48, 64, 128, 256];
const buffers = await Promise.all(
  sizes.map((size) => sharp(pngPath).resize(size, size).png().toBuffer()),
);
fs.writeFileSync(icoPath, await pngToIco(buffers));

console.log('Wrote', pngPath);
console.log('Wrote', icoPath);
console.log('Wrote', faviconOut);
