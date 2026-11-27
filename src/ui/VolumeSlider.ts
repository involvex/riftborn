import Phaser from 'phaser';

export type VolumeSliderOpts = {
  x: number;
  y: number;
  width: number;
  /** Left label prefix, e.g. "Master". */
  label: string;
  /** Current 0..1 value. */
  value: number;
  /** Compact = smaller fonts / track for phone menus. */
  compact?: boolean;
  onChange: (value: number) => void;
};

/**
 * Horizontal drag slider for settings volume rows.
 * Returns a Container; caller parents it into menuBody / settingsBody.
 */
export function createVolumeSlider(
  scene: Phaser.Scene,
  opts: VolumeSliderOpts,
): Phaser.GameObjects.Container {
  const w = Math.max(120, opts.width);
  const compact = opts.compact ?? false;
  const trackH = compact ? 8 : 10;
  const knobR = compact ? 8 : 10;
  const labelSize = compact ? '12px' : '15px';
  const trackW = w;

  const root = scene.add.container(opts.x, opts.y);
  let value = clamp01(opts.value);

  const label = scene.add
    .text(0, compact ? -16 : -20, formatLabel(opts.label, value), {
      fontFamily: 'Georgia, serif',
      fontSize: labelSize,
      color: '#e8e4d8',
    })
    .setOrigin(0.5, 0.5);

  const track = scene.add
    .rectangle(0, 0, trackW, trackH, 0x1a2030, 1)
    .setStrokeStyle(1, 0x5a5040, 0.9)
    .setOrigin(0.5);

  const fill = scene.add
    .rectangle(-trackW / 2, 0, trackW * value, trackH, 0xc4a574, 1)
    .setOrigin(0, 0.5);

  const knob = scene.add
    .circle(knobX(value, trackW), 0, knobR, 0xe0c890, 1)
    .setStrokeStyle(1, 0x0a0c10, 0.5);

  const hit = scene.add
    .rectangle(
      0,
      0,
      trackW + knobR * 2,
      Math.max(28, knobR * 3),
      0x000000,
      0.001,
    )
    .setInteractive({ useHandCursor: true, draggable: false });

  root.add([label, track, fill, knob, hit]);

  const applyVisual = (v: number) => {
    value = clamp01(v);
    fill.width = Math.max(0.001, trackW * value);
    knob.x = knobX(value, trackW);
    label.setText(formatLabel(opts.label, value));
  };

  const setFromLocalX = (localX: number) => {
    const t = (localX + trackW / 2) / trackW;
    const next = clamp01(Math.round(t * 100) / 100);
    if (Math.abs(next - value) < 0.001) return;
    applyVisual(next);
    opts.onChange(next);
  };

  hit.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    const local = hit.getLocalPoint(pointer.x, pointer.y);
    setFromLocalX(local.x);
    scene.input.on('pointermove', onMove);
    scene.input.once('pointerup', onUp);
  });

  const onMove = (pointer: Phaser.Input.Pointer) => {
    if (!pointer.isDown) return;
    const local = hit.getLocalPoint(pointer.x, pointer.y);
    setFromLocalX(local.x);
  };

  const onUp = () => {
    scene.input.off('pointermove', onMove);
  };

  root.once(Phaser.GameObjects.Events.DESTROY, () => {
    scene.input.off('pointermove', onMove);
  });

  return root;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function knobX(value: number, trackW: number): number {
  return -trackW / 2 + trackW * clamp01(value);
}

function formatLabel(prefix: string, value: number): string {
  return `${prefix}: ${Math.round(clamp01(value) * 100)}%`;
}
