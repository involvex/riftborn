import Phaser from 'phaser';
import { uiLayoutSpace } from '../core/UiScale';

export const MENU_BG_KEY = 'ui_menu_bg';
export const MENU_BG_PATH = 'assets/ui/menu_bg.png';
export const MENU_CREST_KEY = 'ui_menu_crest';
export const MENU_CREST_PATH = 'assets/ui/menu_crest.png';

/** Preload the shared title / create backdrop and crest. */
export function preloadMenuBackdrop(scene: Phaser.Scene): void {
  if (!scene.textures.exists(MENU_BG_KEY)) {
    scene.load.image(MENU_BG_KEY, MENU_BG_PATH);
  }
  if (!scene.textures.exists(MENU_CREST_KEY)) {
    scene.load.image(MENU_CREST_KEY, MENU_CREST_PATH);
  }
}

/**
 * Cover the camera with the branded menu fill.
 * Returns the image so callers can place UI above it.
 */
export function addMenuBackdrop(
  scene: Phaser.Scene,
): Phaser.GameObjects.Image | null {
  if (!scene.textures.exists(MENU_BG_KEY)) return null;
  const { width: cssW, height: cssH, scale: s } = uiLayoutSpace(scene);
  const w = Math.max(1, Math.round(cssW * s));
  const h = Math.max(1, Math.round(cssH * s));
  // No setDepth — when parented in a UI container, list order draws
  // this under later siblings; depth would fight container sorting.
  const img = scene.add
    .image(w / 2, h / 2, MENU_BG_KEY)
    .setOrigin(0.5)
    .setAlpha(0.85);
  const tex = scene.textures.get(MENU_BG_KEY).getSourceImage() as {
    width: number;
    height: number;
  };
  const sx = w / Math.max(1, tex.width);
  const sy = h / Math.max(1, tex.height);
  const cover = Math.max(sx, sy);
  img.setScale(cover);
  return img;
}

/**
 * Crest emblem sized to fit a height budget (between subtitle and buttons).
 */
export function addMenuCrest(
  scene: Phaser.Scene,
  x: number,
  y: number,
  maxH: number,
): Phaser.GameObjects.Image | null {
  if (!scene.textures.exists(MENU_CREST_KEY)) return null;
  const tex = scene.textures.get(MENU_CREST_KEY);
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  const src = tex.getSourceImage() as { width: number; height: number };
  const img = scene.add.image(x, y, MENU_CREST_KEY).setOrigin(0.5);
  const scale = Math.min(1, maxH / Math.max(1, src.height));
  img.setScale(scale);
  img.setAlpha(0.95);
  return img;
}
