import sharp from 'sharp';
import fs from 'fs';

const crestPath = 'mobile/assets/splash-icon.png';
const { data, info } = await sharp(crestPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  if (r < 28 && g < 32 && b < 40) data[i + 3] = 0;
}

const transparent = await sharp(data, { raw: info }).png().toBuffer();

const W = 1920;
const H = 1080;
const crestSize = 460;
const resized = await sharp(transparent)
  .resize(crestSize, crestSize, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

const splashSvg = Buffer.from(
  `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="100%" height="100%" fill="#0a0c10"/>` +
    `<text x="50%" y="78%" text-anchor="middle" font-family="Georgia, serif" ` +
    `font-size="72" fill="#e8e4d8" letter-spacing="8">RIFTBORN</text>` +
    `<text x="50%" y="86%" text-anchor="middle" font-family="Segoe UI, sans-serif" ` +
    `font-size="28" fill="#8a9aaa">SHIFT between Asche &amp; Schatten</text>` +
    `</svg>`,
);

// Menu backdrop: crest only — Boot/Create scenes own the title text.
const menuSvg = Buffer.from(
  `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="100%" height="100%" fill="#0a0c10"/>` +
    `</svg>`,
);

fs.mkdirSync('mobile/assets', { recursive: true });
fs.mkdirSync('public/assets/ui', { recursive: true });

await sharp(splashSvg)
  .composite([
    {
      input: resized,
      left: Math.round((W - crestSize) / 2),
      top: Math.round(H * 0.16),
    },
  ])
  .png()
  .toFile('mobile/assets/splash.png');

await sharp(menuSvg)
  .composite([
    {
      input: resized,
      left: Math.round((W - crestSize) / 2),
      top: Math.round(H * 0.22),
    },
  ])
  .modulate({ brightness: 0.55 })
  .png()
  .toFile('public/assets/ui/menu_bg.png');

fs.copyFileSync('mobile/assets/splash.png', 'public/assets/ui/splash.png');
console.log('splash + menu_bg written');
