/**
 * Warm cobble-matched plaza props (Shop / Forge / Inn / NPCs / chest /
 * obelisk / lantern / well / crate / anvil / board). Pure sharp RGBA —
 * no purple wilderness palette.
 *
 *   bun run scripts/synth-plaza-props.mjs
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public/assets/props');

/** @param {number} r @param {number} g @param {number} b @param {number} [a] */
function rgba(r, g, b, a = 255) {
  return [(r | 0) & 255, (g | 0) & 255, (b | 0) & 255, (a | 0) & 255];
}

const C = {
  clear: rgba(0, 0, 0, 0),
  shadow: rgba(0, 0, 0, 90),
  stone: rgba(74, 64, 52),
  stoneL: rgba(92, 80, 64),
  stoneD: rgba(42, 34, 26),
  wallShop: rgba(58, 48, 40),
  wallForge: rgba(42, 58, 50),
  wallInn: rgba(42, 40, 56),
  roofShop: rgba(42, 34, 24),
  roofForge: rgba(58, 40, 32),
  roofInn: rgba(42, 36, 56),
  trim: rgba(196, 165, 116),
  trimD: rgba(120, 96, 64),
  door: rgba(26, 20, 16),
  window: rgba(230, 195, 92),
  glow: rgba(255, 240, 192, 100),
  wood: rgba(106, 80, 48),
  woodL: rgba(138, 108, 64),
  woodD: rgba(58, 42, 24),
  gold: rgba(212, 160, 48),
  goldL: rgba(255, 208, 96),
  skin: rgba(216, 196, 160),
  cloakMira: rgba(196, 165, 116),
  cloakBram: rgba(110, 198, 160),
  cloakNix: rgba(138, 180, 212),
  blue: rgba(77, 182, 255),
  blueD: rgba(42, 64, 96),
  blueL: rgba(142, 200, 255),
  iron: rgba(90, 96, 104),
  ironL: rgba(140, 148, 156),
};

/**
 * @param {number} w
 * @param {number} h
 */
function canvas(w, h) {
  const buf = Buffer.alloc(w * h * 4);
  return {
    w,
    h,
    buf,
    /** @param {number} x @param {number} y @param {number[]} c */
    set(x, y, c) {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const i = (y * w + x) * 4;
      const a = c[3] / 255;
      if (a >= 0.99) {
        buf[i] = c[0];
        buf[i + 1] = c[1];
        buf[i + 2] = c[2];
        buf[i + 3] = c[3];
        return;
      }
      if (a <= 0) return;
      const oa = buf[i + 3] / 255;
      const outA = a + oa * (1 - a);
      if (outA <= 0) return;
      buf[i] = Math.round((c[0] * a + buf[i] * oa * (1 - a)) / outA);
      buf[i + 1] = Math.round((c[1] * a + buf[i + 1] * oa * (1 - a)) / outA);
      buf[i + 2] = Math.round((c[2] * a + buf[i + 2] * oa * (1 - a)) / outA);
      buf[i + 3] = Math.round(outA * 255);
    },
    /** @param {number} x0 @param {number} y0 @param {number} x1 @param {number} y1 @param {number[]} c */
    fillRect(x0, y0, x1, y1, c) {
      const xa = Math.min(x0, x1);
      const xb = Math.max(x0, x1);
      const ya = Math.min(y0, y1);
      const yb = Math.max(y0, y1);
      for (let y = ya; y <= yb; y++) {
        for (let x = xa; x <= xb; x++) this.set(x, y, c);
      }
    },
    /** @param {number} cx @param {number} cy @param {number} rx @param {number} ry @param {number[]} c */
    fillEllipse(cx, cy, rx, ry, c) {
      const rxi = Math.max(1, Math.round(rx));
      const ryi = Math.max(1, Math.round(ry));
      for (let y = -ryi; y <= ryi; y++) {
        for (let x = -rxi; x <= rxi; x++) {
          if (x * x * ryi * ryi + y * y * rxi * rxi <= rxi * rxi * ryi * ryi) {
            this.set(cx + x, cy + y, c);
          }
        }
      }
    },
    /**
     * @param {number} x0 @param {number} y0
     * @param {number} x1 @param {number} y1
     * @param {number} x2 @param {number} y2
     * @param {number[]} c
     */
    fillTri(x0, y0, x1, y1, x2, y2, c) {
      const minX = Math.min(x0, x1, x2);
      const maxX = Math.max(x0, x1, x2);
      const minY = Math.min(y0, y1, y2);
      const maxY = Math.max(y0, y1, y2);
      const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
      if (area === 0) return;
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const w0 = ((x1 - x) * (y2 - y) - (x2 - x) * (y1 - y)) / area;
          const w1 = ((x2 - x) * (y0 - y) - (x0 - x) * (y2 - y)) / area;
          const w2 = 1 - w0 - w1;
          if (w0 >= 0 && w1 >= 0 && w2 >= 0) this.set(x, y, c);
        }
      }
    },
  };
}

/**
 * @param {ReturnType<typeof canvas>} img
 * @param {number[]} wall
 * @param {number[]} roof
 * @param {{ chimney?: boolean }} [opts]
 */
function drawBuilding(img, wall, roof, opts = {}) {
  const cx = Math.floor(img.w / 2);
  const baseY = img.h - 18;
  img.fillEllipse(cx, baseY + 6, 46, 12, C.shadow);
  img.fillEllipse(cx, baseY + 2, 42, 10, C.stoneD);
  // Side wall
  img.fillRect(cx + 8, baseY - 70, cx + 42, baseY, C.stoneD);
  // Front wall
  img.fillRect(cx - 44, baseY - 70, cx + 14, baseY, wall);
  for (let i = 0; i < 6; i++) {
    img.fillRect(
      cx - 40,
      baseY - 62 + i * 10,
      cx + 10,
      baseY - 61 + i * 10,
      C.stoneD,
    );
  }
  // Door + stoop
  img.fillRect(cx - 14, baseY - 28, cx + 4, baseY, C.door);
  img.fillRect(cx - 8, baseY - 18, cx - 5, baseY - 14, C.trim);
  img.fillRect(cx - 18, baseY, cx + 8, baseY + 5, C.stone);
  // Windows
  img.fillRect(cx - 36, baseY - 54, cx - 24, baseY - 42, C.window);
  img.fillRect(cx + 20, baseY - 54, cx + 32, baseY - 42, C.window);
  img.fillRect(cx - 36, baseY - 36, cx - 24, baseY - 26, C.window);
  img.fillEllipse(cx - 30, baseY - 48, 10, 10, C.glow);
  img.fillEllipse(cx + 26, baseY - 48, 10, 10, C.glow);
  // Roof
  img.fillTri(
    cx - 52,
    baseY - 70,
    cx + 52,
    baseY - 70,
    cx,
    baseY - 112,
    C.door,
  );
  img.fillTri(cx - 44, baseY - 70, cx + 46, baseY - 70, cx, baseY - 104, roof);
  img.fillTri(
    cx - 20,
    baseY - 70,
    cx + 20,
    baseY - 70,
    cx,
    baseY - 88,
    C.trimD,
  );
  if (opts.chimney) {
    img.fillRect(cx + 22, baseY - 100, cx + 32, baseY - 78, C.stone);
    img.fillRect(cx + 20, baseY - 104, cx + 34, baseY - 98, C.stoneD);
  }
}

/**
 * @param {ReturnType<typeof canvas>} img
 * @param {number[]} cloak
 */
function drawNpc(img, cloak) {
  const cx = Math.floor(img.w / 2);
  const baseY = img.h - 10;
  img.fillEllipse(cx, baseY + 2, 12, 5, C.shadow);
  img.fillEllipse(cx, baseY - 1, 9, 4, C.stoneD);
  img.fillTri(cx - 11, baseY - 2, cx + 11, baseY - 2, cx, baseY - 28, cloak);
  img.fillEllipse(cx, baseY - 18, 7, 3, cloak);
  img.fillEllipse(cx, baseY - 28, 6, 6, C.skin);
  img.fillRect(cx - 2, baseY - 34, cx + 2, baseY - 30, cloak);
}

/** @param {ReturnType<typeof canvas>} img */
function drawBoard(img) {
  const cx = Math.floor(img.w / 2);
  const baseY = img.h - 8;
  img.fillEllipse(cx, baseY + 2, 16, 6, C.shadow);
  img.fillRect(cx - 3, baseY - 36, cx + 3, baseY, C.woodD);
  img.fillRect(cx - 20, baseY - 48, cx + 20, baseY - 18, C.wood);
  img.fillRect(cx - 18, baseY - 46, cx + 18, baseY - 20, C.woodL);
  img.fillRect(cx - 14, baseY - 42, cx + 14, baseY - 36, C.gold);
  img.fillRect(cx - 14, baseY - 34, cx + 14, baseY - 28, C.trim);
  img.fillRect(cx - 14, baseY - 26, cx + 14, baseY - 22, C.door);
}

/** @param {ReturnType<typeof canvas>} img @param {boolean} boss */
function drawChest(img, boss) {
  const cx = Math.floor(img.w / 2);
  const baseY = img.h - 8;
  const s = boss ? 1.25 : 1;
  img.fillEllipse(
    cx,
    baseY + 2,
    Math.round(16 * s),
    Math.round(6 * s),
    C.shadow,
  );
  const hw = Math.round(14 * s);
  const hh = Math.round(11 * s);
  img.fillRect(cx - hw, baseY - hh, cx + hw, baseY, C.wood);
  img.fillRect(cx - hw + 1, baseY - hh + 1, cx + hw - 1, baseY - 2, C.woodL);
  img.fillRect(cx - 2, baseY - Math.round(7 * s), cx + 2, baseY - 2, C.goldL);
  img.fillRect(
    cx - hw,
    baseY - hh - Math.round(6 * s),
    cx + hw,
    baseY - hh,
    C.woodD,
  );
  if (boss) {
    img.fillEllipse(cx, baseY - 2, 18, 5, rgba(...C.goldL.slice(0, 3), 90));
  }
}

/** @param {ReturnType<typeof canvas>} img */
function drawObelisk(img) {
  const cx = Math.floor(img.w / 2);
  const baseY = img.h - 10;
  img.fillEllipse(cx, baseY + 2, 16, 6, C.shadow);
  img.fillRect(cx - 10, baseY - 4, cx + 10, baseY, C.blueD);
  img.fillRect(cx - 8, baseY - 56, cx + 8, baseY - 4, C.blueD);
  img.fillRect(cx - 6, baseY - 54, cx + 6, baseY - 6, C.blue);
  img.fillTri(
    cx - 10,
    baseY - 56,
    cx + 10,
    baseY - 56,
    cx,
    baseY - 76,
    C.blueL,
  );
  img.fillEllipse(cx, baseY - 2, 18, 7, rgba(...C.blueL.slice(0, 3), 70));
}

/** @param {ReturnType<typeof canvas>} img */
function drawLantern(img) {
  const cx = Math.floor(img.w / 2);
  const baseY = img.h - 6;
  img.fillEllipse(cx, baseY + 1, 8, 3, C.shadow);
  img.fillRect(cx - 2, baseY - 22, cx + 2, baseY, C.woodD);
  img.fillEllipse(cx, baseY - 26, 6, 6, C.window);
  img.fillEllipse(cx, baseY - 26, 12, 12, C.glow);
  img.fillRect(cx - 4, baseY - 32, cx + 4, baseY - 30, C.trim);
}

/** @param {ReturnType<typeof canvas>} img */
function drawWell(img) {
  const cx = Math.floor(img.w / 2);
  const baseY = img.h - 8;
  img.fillEllipse(cx, baseY + 2, 20, 7, C.shadow);
  img.fillEllipse(cx, baseY, 18, 7, C.stone);
  img.fillEllipse(cx, baseY - 2, 12, 5, C.blueD);
  img.fillRect(cx - 14, baseY - 18, cx - 11, baseY - 2, C.woodD);
  img.fillRect(cx + 11, baseY - 18, cx + 14, baseY - 2, C.woodD);
  img.fillRect(cx - 16, baseY - 20, cx + 16, baseY - 16, C.wood);
}

/** @param {ReturnType<typeof canvas>} img */
function drawCrate(img) {
  const cx = Math.floor(img.w / 2);
  const baseY = img.h - 6;
  img.fillEllipse(cx, baseY + 1, 12, 4, C.shadow);
  img.fillRect(cx - 12, baseY - 16, cx + 12, baseY, C.wood);
  img.fillRect(cx - 10, baseY - 14, cx + 10, baseY - 2, C.woodL);
  img.fillRect(cx - 12, baseY - 10, cx + 12, baseY - 9, C.woodD);
  img.fillRect(cx - 1, baseY - 16, cx + 1, baseY, C.woodD);
}

/** @param {ReturnType<typeof canvas>} img */
function drawAnvil(img) {
  const cx = Math.floor(img.w / 2);
  const baseY = img.h - 6;
  img.fillEllipse(cx, baseY + 1, 12, 4, C.shadow);
  img.fillRect(cx - 8, baseY - 8, cx + 8, baseY, C.iron);
  img.fillRect(cx - 12, baseY - 14, cx + 12, baseY - 8, C.ironL);
  img.fillRect(cx + 8, baseY - 12, cx + 14, baseY - 10, C.iron);
}

/**
 * @param {string} name
 * @param {ReturnType<typeof canvas>} img
 */
async function writePng(name, img) {
  const out = path.join(OUT, `${name}.png`);
  await sharp(img.buf, {
    raw: { width: img.w, height: img.h, channels: 4 },
  })
    .png()
    .toFile(out);
  console.log(`wrote ${path.relative(ROOT, out)} (${img.w}x${img.h})`);
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const shop = canvas(128, 144);
  drawBuilding(shop, C.wallShop, C.roofShop);
  await writePng('prop_plaza_shop', shop);

  const forge = canvas(128, 144);
  drawBuilding(forge, C.wallForge, C.roofForge, { chimney: true });
  await writePng('prop_plaza_forge', forge);

  const inn = canvas(128, 144);
  drawBuilding(inn, C.wallInn, C.roofInn);
  await writePng('prop_plaza_inn', inn);

  const mira = canvas(64, 80);
  drawNpc(mira, C.cloakMira);
  await writePng('prop_plaza_npc_vendor', mira);

  const bram = canvas(64, 80);
  drawNpc(bram, C.cloakBram);
  await writePng('prop_plaza_npc_crafter', bram);

  const nix = canvas(64, 80);
  drawNpc(nix, C.cloakNix);
  await writePng('prop_plaza_npc_trader', nix);

  const board = canvas(72, 80);
  drawBoard(board);
  await writePng('prop_plaza_board', board);

  const chest = canvas(48, 40);
  drawChest(chest, false);
  await writePng('prop_plaza_chest', chest);

  const chestBoss = canvas(56, 48);
  drawChest(chestBoss, true);
  await writePng('prop_plaza_chest_boss', chestBoss);

  const obelisk = canvas(64, 96);
  drawObelisk(obelisk);
  await writePng('prop_plaza_obelisk', obelisk);

  const lantern = canvas(40, 48);
  drawLantern(lantern);
  await writePng('prop_plaza_lantern', lantern);

  const well = canvas(56, 48);
  drawWell(well);
  await writePng('prop_plaza_well', well);

  const crate = canvas(40, 36);
  drawCrate(crate);
  await writePng('prop_plaza_crate', crate);

  const anvil = canvas(40, 32);
  drawAnvil(anvil);
  await writePng('prop_plaza_anvil', anvil);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
