import type Phaser from 'phaser';
import { uiLayoutSpace } from '../core/UiScale';

export const MENU_BG_KEY = 'ui_menu_bg';
export const MENU_BG_PATH = 'assets/ui/menu_bg.png';

/** Preload the shared title / create backdrop. */
export function preloadMenuBackdrop(scene: Phaser.Scene): void {
  if (scene.textures.exists(MENU_BG_KEY)) return;
  scene.load.image(MENU_BG_KEY, MENU_BG_PATH);
}

/**
 * Cover the camera with the branded menu art (dimmed).
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
