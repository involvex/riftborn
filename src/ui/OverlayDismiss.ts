import Phaser from 'phaser';
import { shouldShowTouchControls } from './TouchControls';

const UI_FONT = 'Segoe UI, sans-serif';

export type OverlayDismissHandles = {
  /** Full-screen dim behind the panel; tap closes. */
  scrim: Phaser.GameObjects.Rectangle;
  /** Top-right X control. */
  closeX: Phaser.GameObjects.Container;
  layout: (panelW: number, panelH: number) => void;
  destroy: () => void;
};

/**
 * Scrim + large X for touch-friendly overlay dismiss.
 * Root must be centered on the screen. Call layout after panel size changes.
 * Panel background should be interactive so empty panel space does not close.
 */
export function attachOverlayDismiss(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
  onClose: () => void,
  opts?: { label?: string },
): OverlayDismissHandles {
  const scrim = scene.add
    .rectangle(0, 0, 100, 100, 0x05070a, 0.55)
    .setInteractive();
  scrim.on('pointerup', () => onClose());

  const size = shouldShowTouchControls() ? 44 : 36;
  const bg = scene.add
    .rectangle(0, 0, size, size, 0x1a2430, 0.95)
    .setStrokeStyle(2, 0xc4a574, 0.9)
    .setInteractive({ useHandCursor: true });
  const mark = scene.add
    .text(0, 0, opts?.label ?? '✕', {
      fontFamily: UI_FONT,
      fontSize: shouldShowTouchControls() ? '22px' : '18px',
      color: '#e8e4d8',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  const closeX = scene.add.container(0, 0, [bg, mark]);
  bg.on('pointerup', (pointer: Phaser.Input.Pointer) => {
    pointer.event?.stopPropagation?.();
    onClose();
  });

  // Scrim first (behind), X last (on top of panel content).
  root.addAt(scrim, 0);
  root.add(closeX);

  const layout = (panelW: number, panelH: number): void => {
    const sw = scene.scale.width;
    const sh = scene.scale.height;
    scrim.setSize(sw + 4, sh + 4);
    const pad = shouldShowTouchControls() ? 10 : 8;
    const btn = shouldShowTouchControls() ? 44 : 36;
    bg.setSize(btn, btn);
    closeX.setPosition(panelW / 2 - pad - btn / 2, -panelH / 2 + pad + btn / 2);
  };

  return {
    scrim,
    closeX,
    layout,
    destroy: () => {
      scrim.destroy();
      closeX.destroy();
    },
  };
}

/** Ensure a panel rectangle swallows pointer events. */
export function makePanelHitBlock(bg: Phaser.GameObjects.Rectangle): void {
  if (!bg.input) bg.setInteractive();
}
