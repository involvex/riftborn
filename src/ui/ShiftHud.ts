import Phaser from 'phaser';
import { gameEvents } from '../core/EventBus';
import { uiFontSize } from '../core/UiFont';
import { SHIFT_LAYERS, type ShiftLayerId } from '../data/shiftLayers';
import { SHIFT_COST, SHIFT_MAX_ENERGY } from '../systems/ShiftSystem';
import { shouldShowTouchControls } from './TouchControls';

export type ShiftHudPayload = {
  active: boolean;
  layer: ShiftLayerId;
  energy: number;
  cooldownLeft: number;
  canShift: boolean;
  /** True when standing near a layer-locked gate tile. */
  nearGate?: boolean;
};

/** Rift-only layer name + shift energy bar (top-left under HP). */
export class ShiftHud {
  readonly root: Phaser.GameObjects.Container;
  private readonly label: Phaser.GameObjects.Text;
  private readonly barBg: Phaser.GameObjects.Rectangle;
  private readonly barFill: Phaser.GameObjects.Rectangle;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly unsub: () => void;

  constructor(scene: Phaser.Scene) {
    this.root = scene.add.container(16, 98).setScrollFactor(0).setDepth(10_000);
    const profile = shouldShowTouchControls() ? 'touch' : 'desktop';
    this.label = scene.add.text(0, 0, '', {
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: uiFontSize('label', profile),
      color: '#c8a070',
      stroke: '#0a0c10',
      strokeThickness: 3,
      resolution: 2,
    });
    this.barBg = scene.add
      .rectangle(0, 20, 160, 10, 0x1a1428, 0.95)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0x6a50c8, 0.85);
    this.barFill = scene.add
      .rectangle(1, 20, 0, 8, 0xa090ff, 1)
      .setOrigin(0, 0.5);
    this.hint = scene.add.text(0, 32, 'Q Shift', {
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: uiFontSize('hint', profile),
      color: '#7a8090',
      stroke: '#0a0c10',
      strokeThickness: 2,
      resolution: 2,
    });
    this.root.add([this.label, this.barBg, this.barFill, this.hint]);
    this.root.setVisible(false);

    this.unsub = gameEvents.on('ui:shiftHud', (p) => {
      this.apply(p as ShiftHudPayload);
    });
  }

  apply(p: ShiftHudPayload): void {
    if (!p.active) {
      this.root.setVisible(false);
      return;
    }
    this.root.setVisible(true);
    const def = SHIFT_LAYERS[p.layer];
    this.label.setColor(def.hudColor);
    this.label.setText(`Layer · ${def.name}`);
    const ratio = Phaser.Math.Clamp(p.energy / SHIFT_MAX_ENERGY, 0, 1);
    this.barFill.width = Math.max(0, 158 * ratio);
    this.barFill.setFillStyle(
      p.energy >= SHIFT_COST && p.cooldownLeft <= 0 ? 0xa090ff : 0x5a5080,
      1,
    );
    const cd =
      p.cooldownLeft > 0 ? ` · CD ${(p.cooldownLeft / 1000).toFixed(1)}s` : '';
    if (p.nearGate) {
      this.hint.setColor('#7ad4e8');
      this.hint.setText(
        p.canShift ? 'Q Shift — gate ahead' : `Q Shift near gate${cd}`,
      );
    } else {
      this.hint.setColor('#7a8090');
      this.hint.setText(
        p.canShift ? 'Q Shift ready' : `Q Shift${cd} · kills fill energy`,
      );
    }
  }

  destroy(): void {
    this.unsub();
    this.root.destroy(true);
  }
}
