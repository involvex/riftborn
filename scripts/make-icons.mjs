/**
 * Build Electron + Expo + web favicon from electron/build/source-icon.jpg|png
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = path.join(root, 'electron', 'build');
const mobileAssets = path.join(root, 'mobile', 'assets');
const pngPath = path.join(buildDir, 'icon.png');
const icoPath = path.join(buildDir, 'icon.ico');
const faviconOut = path.join(root, 'public', 'favicon.png');
const BG = { r: 14, g: 18, b: 24, alpha: 1 }; // #0e1218

fs.mkdirSync(buildDir, { recursive: true });
fs.mkdirSync(mobileAssets, { recursive: true });

const candidates = [
  path.join(buildDir, 'source-icon.png'),
  path.join(buildDir, 'source-icon.jpg'),
  path.join(buildDir, 'icon.png'),
];
const source = candidates.find((p) => fs.existsSync(p));
if (!source) {
  console.error(
    'Missing icon source — add electron/build/source-icon.jpg (or .png)',
  );
  process.exit(1);
}

const master = sharp(source).rotate(); // respect EXIF
const meta = await master.metadata();
console.log(`Source ${path.basename(source)} ${meta.width}×${meta.height}`);

// Master 1024 square (cover)
const master1024 = await sharp(source)
  .rotate()
  .resize(1024, 1024, { fit: 'cover', position: 'centre' })
  .png()
  .toBuffer();

await sharp(master1024).toFile(pngPath);

// Electron ICO
const icoSizes = [16, 24, 32, 48, 64, 128, 256];
const icoBuffers = await Promise.all(
  icoSizes.map((size) => sharp(master1024).resize(size, size).png().toBuffer()),
);
fs.writeFileSync(icoPath, await pngToIco(icoBuffers));

// Web favicon
await sharp(master1024).resize(64, 64).png().toFile(faviconOut);

// Expo / mobile
await sharp(master1024)
  .resize(1024, 1024)
  .png()
  .toFile(path.join(mobileAssets, 'icon.png'));

await sharp(master1024)
  .resize(48, 48)
  .png()
  .toFile(path.join(mobileAssets, 'favicon.png'));

// Adaptive foreground: icon inset in safe zone (~66%)
const fgSize = 1024;
const fgPad = Math.round(fgSize * 0.18);
const fgInner = fgSize - fgPad * 2;
const foreground = await sharp({
  create: {
    width: fgSize,
    height: fgSize,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([
    {
      input: await sharp(master1024).resize(fgInner, fgInner).png().toBuffer(),
      top: fgPad,
      left: fgPad,
    },
  ])
  .png()
  .toBuffer();
await sharp(foreground).toFile(
  path.join(mobileAssets, 'android-icon-foreground.png'),
);

await sharp({
  create: {
    width: 1024,
    height: 1024,
    channels: 3,
    background: BG,
  },
})
  .png()
  .toFile(path.join(mobileAssets, 'android-icon-background.png'));

// Monochrome: bright silhouette on transparent
const monoBuf = await sharp(master1024)
  .greyscale()
  .normalize()
  .threshold(90)
  .ensureAlpha()
  .resize(fgInner, fgInner)
  .png()
  .toBuffer();
await sharp({
  create: {
    width: fgSize,
    height: fgSize,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([{ input: monoBuf, top: fgPad, left: fgPad }])
  .png()
  .toFile(path.join(mobileAssets, 'android-icon-monochrome.png'));

// Splash: icon centered on brand bg
const splashInner = 512;
const splashPad = Math.round((1024 - splashInner) / 2);
await sharp({
  create: {
    width: 1024,
    height: 1024,
    channels: 3,
    background: BG,
  },
})
  .composite([
    {
      input: await sharp(master1024)
        .resize(splashInner, splashInner)
        .png()
        .toBuffer(),
      top: splashPad,
      left: splashPad,
    },
  ])
  .png()
  .toFile(path.join(mobileAssets, 'splash-icon.png'));

console.log('Wrote', pngPath);
console.log('Wrote', icoPath);
console.log('Wrote', faviconOut);
console.log('Wrote mobile/assets/{icon,splash,android-icon-*}.png');
