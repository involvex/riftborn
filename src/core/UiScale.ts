import type { Scene } from 'phaser';
import {
  getAppliedGraphicsSizes,
  getAppliedRenderScale,
} from './GraphicsQuality';

/** CSS-intent layout space + buffer scale for title / create screens. */
export function uiLayoutSpace(scene: Scene): {
  width: number;
  height: number;
  scale: number;
} {
  const { logical, buffer, renderScale } = getAppliedGraphicsSizes();
  const s = renderScale > 0.01 ? Math.min(1, Math.max(0.35, renderScale)) : 1;
  if (
    logical.width > 0 &&
    logical.height > 0 &&
    buffer.width > 0 &&
    Math.abs(buffer.width - scene.scale.width) < 2.5
  ) {
    return { width: logical.width, height: logical.height, scale: s };
  }
  return { width: scene.scale.width, height: scene.scale.height, scale: 1 };
}

/** CSS pixels → Phaser game pixels under the live renderScale. */
export function uiPx(cssPx: number, scale = getAppliedRenderScale()): number {
  const s = scale > 0.01 ? Math.min(1, Math.max(0.35, scale)) : 1;
  return Math.max(1, Math.round(cssPx * s));
}

/** Responsive UI helpers based on the current game scale. */
export function uiFont(scene: Scene, base: number, min = 12, max = 72): string {
  const { width, height, scale: rs } = uiLayoutSpace(scene);
  const scale = Math.min(width / 1280, height / 720);
  const size = Math.round(Math.min(max, Math.max(min, base * scale)));
  return `${uiPx(size, rs)}px`;
}

export function uiPad(scene: Scene, base: number): number {
  const { width, height, scale: rs } = uiLayoutSpace(scene);
  const scale = Math.min(width / 1280, height / 720);
  return uiPx(base * Math.max(0.85, scale), rs);
}

export function uiPanelSize(
  scene: Scene,
  widthFrac: number,
  heightFrac: number,
  maxW: number,
  maxH: number,
): { w: number; h: number } {
  return {
    w: Math.min(maxW, Math.floor(scene.scale.width * widthFrac)),
    h: Math.min(maxH, Math.floor(scene.scale.height * heightFrac)),
  };
}

/**
 * Panel size in Phaser game pixels. Caps are CSS-intent; result is
 * shrunk by renderScale so Low-buffer stretch does not overscale UI.
 */
export function uiPanelSizeGame(
  scene: Scene,
  widthFrac: number,
  heightFrac: number,
  maxWCss: number,
  maxHCss: number,
): { w: number; h: number } {
  const s = Math.min(1, Math.max(0.35, getAppliedRenderScale() || 1));
  const cssW = scene.scale.width / s;
  const cssH = scene.scale.height / s;
  return {
    w: Math.max(120, Math.round(Math.min(maxWCss, cssW * widthFrac) * s)),
    h: Math.max(120, Math.round(Math.min(maxHCss, cssH * heightFrac) * s)),
  };
}
