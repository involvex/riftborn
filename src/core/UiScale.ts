import type { Scene } from 'phaser';

/** Responsive UI helpers based on the current game scale. */
export function uiFont(scene: Scene, base: number, min = 12, max = 72): string {
  const scale = Math.min(scene.scale.width / 1280, scene.scale.height / 720);
  const size = Math.round(Math.min(max, Math.max(min, base * scale)));
  return `${size}px`;
}

export function uiPad(scene: Scene, base: number): number {
  const scale = Math.min(scene.scale.width / 1280, scene.scale.height / 720);
  return Math.round(base * Math.max(0.85, scale));
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
