import Phaser from 'phaser';
import type { CharacterClassId, CharacterGender } from '../types/game';

/** Procedural fallback frame size. */
const FW = 48;
const FH = 48;
/** Painted sheet frame size (scripts/process-sprites.mjs). */
export const PAINTED_FW = 128;
export const PAINTED_FH = 128;
/** idle 0–3, walk 4–9, attack 10–13 */
const FRAMES = 14;

const SHEET_KEYS = [
  'spr_player_male',
  'spr_player_female',
  'spr_player_nonbinary',
  'spr_player_mage',
  'spr_player_mystic',
  'spr_shade',
  'spr_crawler',
  'spr_wisp',
  'spr_rift_lord',
] as const;

const NODE_KEYS = ['spr_tree', 'spr_vein'] as const;

type Palette = {
  outline: string;
  skin: string;
  hair: string;
  cloth: string;
  accent: string;
  boot: string;
};

let ready = false;
const paintedKeys = new Set<string>();

export function preloadGameSprites(scene: Phaser.Scene): void {
  for (const key of SHEET_KEYS) {
    scene.load.spritesheet(key, `assets/sprites/game/${key}.png`, {
      frameWidth: PAINTED_FW,
      frameHeight: PAINTED_FH,
    });
  }
  for (const key of NODE_KEYS) {
    scene.load.image(key, `assets/sprites/game/${key}.png`);
  }
}

export function ensureGameSprites(scene: Phaser.Scene): void {
  if (ready && scene.textures.exists('spr_player_male')) {
    registerAnims(scene);
    return;
  }

  for (const key of SHEET_KEYS) {
    if (scene.textures.exists(key) && textureLooksPainted(scene, key)) {
      paintedKeys.add(key);
      continue;
    }
    // Missing/broken load → procedural placeholder
    if (scene.textures.exists(key)) scene.textures.remove(key);
    if (key.startsWith('spr_player')) {
      generatePlayer(scene, key, paletteForPlayer(key));
    } else if (key === 'spr_crawler') {
      generateEnemy(scene, key, '#8A7A60', '#C4B080', 'crawler');
    } else if (key === 'spr_wisp') {
      generateEnemy(scene, key, '#E07040', '#FFB070', 'wisp');
    } else if (key === 'spr_rift_lord') {
      generateEnemy(scene, key, '#2A80C0', '#6EC6FF', 'lord');
    } else {
      generateEnemy(scene, key, '#5A3A6A', '#8A5A9A', 'shade');
    }
  }

  for (const key of NODE_KEYS) {
    if (scene.textures.exists(key)) {
      paintedKeys.add(key);
      continue;
    }
    generateNode(scene, key, key === 'spr_tree');
  }

  registerAnims(scene);
  ready = true;
}

export function isPaintedSprite(key: string): boolean {
  return paintedKeys.has(key);
}

export function playerSpriteKey(
  gender: CharacterGender,
  classId?: CharacterClassId,
): string {
  if (classId === 'mage') return 'spr_player_mage';
  if (classId === 'mystic') return 'spr_player_mystic';
  if (gender === 'female') return 'spr_player_female';
  if (gender === 'nonbinary') return 'spr_player_nonbinary';
  return 'spr_player_male';
}

export function enemySpriteKey(defId: string): string {
  if (defId === 'ash_scamp') return 'spr_shade';
  if (defId === 'crawler') return 'spr_crawler';
  if (defId === 'wisp') return 'spr_wisp';
  if (defId === 'rift_lord') return 'spr_rift_lord';
  return 'spr_shade';
}

function textureLooksPainted(scene: Phaser.Scene, key: string): boolean {
  const tex = scene.textures.get(key);
  const frame = tex.get(0);
  return frame && frame.width >= 96;
}

function paletteForPlayer(key: string): Palette {
  if (key.includes('female')) {
    return {
      outline: '#1a1410',
      skin: '#d4b896',
      hair: '#3a2818',
      cloth: '#6a4a5a',
      accent: '#a87888',
      boot: '#3a2820',
    };
  }
  if (key.includes('mage')) {
    return {
      outline: '#1a1410',
      skin: '#c4a574',
      hair: '#2a3040',
      cloth: '#3a5070',
      accent: '#5a8fd4',
      boot: '#2a3038',
    };
  }
  if (key.includes('mystic') || key.includes('nonbinary')) {
    return {
      outline: '#1a1410',
      skin: '#c9b8a0',
      hair: '#3a5060',
      cloth: '#4a5a6a',
      accent: '#6a8a9a',
      boot: '#2a3038',
    };
  }
  return {
    outline: '#1a1410',
    skin: '#c4a574',
    hair: '#2a2018',
    cloth: '#5a6a4a',
    accent: '#8a9a6a',
    boot: '#3a3028',
  };
}

function registerAnims(scene: Phaser.Scene): void {
  for (const key of SHEET_KEYS) {
    if (!scene.textures.exists(key)) continue;
    addAnim(scene, `${key}_idle`, key, 0, 3, 4, true);
    addAnim(scene, `${key}_walk`, key, 4, 9, 9, true);
    addAnim(scene, `${key}_attack`, key, 10, 13, 11, false);
  }
}

function addAnim(
  scene: Phaser.Scene,
  key: string,
  texture: string,
  start: number,
  end: number,
  rate: number,
  loop: boolean,
): void {
  if (scene.anims.exists(key)) {
    scene.anims.remove(key);
  }
  scene.anims.create({
    key,
    frames: scene.anims.generateFrameNumbers(texture, { start, end }),
    frameRate: rate,
    repeat: loop ? -1 : 0,
  });
}

function generatePlayer(scene: Phaser.Scene, key: string, pal: Palette): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, FW * FRAMES, FH);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;

  for (let f = 0; f < FRAMES; f++) {
    const ox = f * FW;
    const bob = f < 4 ? Math.sin((f / 4) * Math.PI * 2) * 1.5 : 0;
    const walkPhase = f >= 4 && f < 10 ? (f - 4) / 6 : 0;
    const atk = f >= 10 ? (f - 10) / 3 : 0;
    drawPlayerFrame(ctx, ox, bob, walkPhase, atk, pal, f);
  }

  tex.refresh();
  for (let i = 0; i < FRAMES; i++) {
    tex.add(i, 0, i * FW, 0, FW, FH);
  }
}

function drawPlayerFrame(
  ctx: CanvasRenderingContext2D,
  ox: number,
  bob: number,
  walk: number,
  atk: number,
  pal: Palette,
  frame: number,
): void {
  const cy = 28 + bob;
  const legSwing =
    frame >= 4 && frame < 10 ? Math.sin(walk * Math.PI * 2) * 4 : 0;
  const armSwing =
    frame >= 10
      ? -8 - atk * 14
      : frame >= 4 && frame < 10
        ? Math.sin(walk * Math.PI * 2 + Math.PI) * 3
        : 0;

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ellipse(ctx, ox + 24, 42, 14, 5);

  ctx.fillStyle = pal.boot;
  fillRect(ctx, ox + 18 + legSwing * 0.3, cy + 6, 5, 8);
  fillRect(ctx, ox + 25 - legSwing * 0.3, cy + 6, 5, 8);

  ctx.fillStyle = pal.cloth;
  fillRect(ctx, ox + 16, cy - 8, 16, 16);
  ctx.fillStyle = pal.accent;
  fillRect(ctx, ox + 18, cy - 4, 12, 6);

  ctx.fillStyle = pal.skin;
  fillRect(ctx, ox + 12, cy - 6 + armSwing * 0.15, 5, 10);
  fillRect(ctx, ox + 31, cy - 6 - armSwing * 0.1, 5, 10);

  if (frame >= 10) {
    ctx.strokeStyle = '#c4a574';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ox + 34, cy - 2);
    ctx.lineTo(ox + 34 + atk * 16, cy - 10 - atk * 8);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#a09070';
    fillRect(ctx, ox + 33, cy - 4, 3, 12);
  }

  ctx.fillStyle = pal.skin;
  circle(ctx, ox + 24, cy - 14, 7);
  ctx.fillStyle = pal.hair;
  ellipse(ctx, ox + 24, cy - 18, 9, 5);

  ctx.strokeStyle = pal.outline;
  ctx.lineWidth = 1;
  ctx.strokeRect(ox + 16.5, cy - 7.5, 15, 15);
}

function generateEnemy(
  scene: Phaser.Scene,
  key: string,
  body: string,
  glow: string,
  kind: 'shade' | 'crawler' | 'wisp' | 'lord',
): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, FW * FRAMES, FH);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;

  for (let f = 0; f < FRAMES; f++) {
    const ox = f * FW;
    const bob = f < 4 ? Math.sin((f / 4) * Math.PI * 2) * 2 : 0;
    const walk = f >= 4 && f < 10 ? (f - 4) / 6 : 0;
    const atk = f >= 10 ? (f - 10) / 3 : 0;
    drawEnemyFrame(ctx, ox, bob, walk, atk, body, glow, kind, f);
  }

  tex.refresh();
  for (let i = 0; i < FRAMES; i++) {
    tex.add(i, 0, i * FW, 0, FW, FH);
  }
}

function drawEnemyFrame(
  ctx: CanvasRenderingContext2D,
  ox: number,
  bob: number,
  walk: number,
  atk: number,
  body: string,
  glow: string,
  kind: 'shade' | 'crawler' | 'wisp' | 'lord',
  frame: number,
): void {
  const cx = ox + 24;
  const cy = 28 + bob;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ellipse(ctx, cx, 42, kind === 'lord' ? 16 : 11, 4);

  if (kind === 'wisp') {
    const pulse = 1 + Math.sin((frame / FRAMES) * Math.PI * 2) * 0.15;
    ctx.fillStyle = glow;
    ctx.globalAlpha = 0.45;
    circle(ctx, cx, cy - 4, 14 * pulse);
    ctx.globalAlpha = 1;
    ctx.fillStyle = body;
    circle(ctx, cx, cy - 4, 8 * pulse);
    ctx.fillStyle = '#fff8e0';
    circle(ctx, cx - 2, cy - 6, 2);
    if (frame >= 10) {
      ctx.strokeStyle = glow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 12 + atk * 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    return;
  }

  if (kind === 'crawler') {
    const stretch =
      frame >= 4 && frame < 10 ? Math.sin(walk * Math.PI * 2) * 3 : 0;
    ctx.fillStyle = body;
    ellipse(ctx, cx, cy, 16 + stretch, 9);
    ctx.fillStyle = glow;
    circle(ctx, cx + 8, cy - 2, 4);
    ctx.fillStyle = '#1a1010';
    circle(ctx, cx + 9, cy - 3, 1.5);
    ctx.strokeStyle = body;
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      const swing = frame >= 4 ? Math.sin(walk * Math.PI * 2 + i) * 3 : 0;
      ctx.beginPath();
      ctx.moveTo(cx + i * 4, cy + 4);
      ctx.lineTo(cx + i * 5 + swing, cy + 12);
      ctx.stroke();
    }
    if (frame >= 10) {
      ctx.fillStyle = glow;
      ellipse(ctx, cx + 10 + atk * 8, cy, 8, 5);
    }
    return;
  }

  const scale = kind === 'lord' ? 1.35 : 1;
  ctx.fillStyle = body;
  ellipse(ctx, cx, cy, 12 * scale, 10 * scale);
  ctx.fillStyle = '#1a1020';
  if (kind === 'lord') {
    fillRect(ctx, cx - 10, cy - 18, 6, 10);
    fillRect(ctx, cx + 4, cy - 18, 6, 10);
    ctx.fillStyle = glow;
    ellipse(ctx, cx, cy - 6, 10, 8);
  } else {
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 2);
    ctx.lineTo(cx, cy - 16);
    ctx.lineTo(cx + 10, cy - 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = glow;
  circle(ctx, cx - 3, cy - 2, 2 * scale);
  circle(ctx, cx + 3, cy - 2, 2 * scale);

  const drift = frame >= 4 && frame < 10 ? Math.sin(walk * Math.PI * 2) * 2 : 0;
  ctx.fillStyle = body;
  ctx.globalAlpha = 0.5;
  ellipse(ctx, cx + drift, cy + 6, 8 * scale, 4);
  ctx.globalAlpha = 1;

  if (frame >= 10) {
    ctx.strokeStyle = glow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 14 * scale + atk * 6, -0.4, Math.PI * 0.6);
    ctx.stroke();
  }
}

function generateNode(scene: Phaser.Scene, key: string, isTree: boolean): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, FW, FH);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ellipse(ctx, 24, 42, 12, 4);

  if (isTree) {
    ctx.fillStyle = '#4a3020';
    fillRect(ctx, 20, 22, 8, 18);
    ctx.fillStyle = '#2E5A3C';
    circle(ctx, 24, 16, 14);
    ctx.fillStyle = '#3a7a4c';
    circle(ctx, 18, 14, 7);
    circle(ctx, 30, 18, 8);
  } else {
    ctx.fillStyle = '#5a6a7a';
    ctx.beginPath();
    ctx.moveTo(24, 8);
    ctx.lineTo(10, 36);
    ctx.lineTo(38, 36);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#6ec6ff';
    circle(ctx, 24, 24, 5);
    ctx.fillStyle = '#a0e0ff';
    circle(ctx, 24, 24, 2);
  }

  tex.refresh();
}

function fillRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function circle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function ellipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}
