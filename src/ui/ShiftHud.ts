import Phaser from 'phaser';
import { Events, gameEvents } from '../core/EventBus';
import { formatHotkey } from '../core/Hotkeys';
import { uiFontGameSize, uiFontSize } from '../core/UiFont';
import { getAppliedRenderScale } from '../core/GraphicsQuality';
import { computeGameTouchLayout } from './TouchLayout';
import { SHIFT_LAYERS, type ShiftLayerId } from '../data/shiftLayers';
import { SHIFT_COST, SHIFT_MAX_ENERGY } from '../systems/ShiftSystem';
import { shouldShowTouchControls } from './TouchControls';
import { shiftHudTouchMetrics } from './ShiftHudLayout';

export type ShiftHudPayload = {
  active: boolean;
  layer: ShiftLayerId;
  energy: number;
  cooldownLeft: number;
  canShift: boolean;
  /** True when standing near a layer-locked gate tile. */
  nearGate?: boolean;
};

export { shiftHudTouchMetrics } from './ShiftHudLayout';

/** Rift-only layer name + shift energy bar (top-left under HP). */
export class ShiftHud {
  readonly root: Phaser.GameObjects.Container;
  private readonly label: Phaser.GameObjects.Text;
  private readonly barBg: Phaser.GameObjects.Rectangle;
  private readonly barFill: Phaser.GameObjects.Rectangle;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly touch: boolean;
  private actionLabel: string;
  private lastPayload: ShiftHudPayload | null = null;
  private barW = 160;
  private readonly unsubs: (() => void)[] = [];

  constructor(scene: Phaser.Scene) {
    this.root = scene.add.container(16, 98).setScrollFactor(0).setDepth(10_000);
    this.touch = shouldShowTouchControls();
    const profile = this.touch ? 'touch' : 'desktop';
    const font = (role: 'label' | 'hint') =>
      this.touch ? uiFontGameSize(role, 'touch') : uiFontSize(role, profile);
    this.actionLabel = this.touch ? 'SHIFT' : formatHotkey('shift');
    this.label = scene.add.text(0, 0, '', {
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: font('label'),
      color: '#c8a070',
      stroke: '#0a0c10',
      strokeThickness: this.touch ? 2 : 3,
      resolution: 2,
    });
    this.barBg = scene.add
      .rectangle(0, 20, 160, 10, 0x1a1428, 0.95)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0x6a50c8, 0.85);
    this.barFill = scene.add
      .rectangle(1, 20, 0, 8, 0xa090ff, 1)
      .setOrigin(0, 0.5);
    this.hint = scene.add.text(0, 32, `${this.actionLabel} Shift`, {
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: font('hint'),
      color: '#7a8090',
      stroke: '#0a0c10',
      strokeThickness: 2,
      resolution: 2,
    });
    this.root.add([this.label, this.barBg, this.barFill, this.hint]);
    this.layout();
    scene.scale.on('resize', () => this.layout());
    this.root.setVisible(false);

    this.unsubs.push(
      gameEvents.on('ui:shiftHud', (p) => {
        this.apply(p as ShiftHudPayload);
      }),
    );
    // Desktop hint must follow hotkey rebinding (touch keeps the SHIFT label).
    this.unsubs.push(
      gameEvents.on(Events.SETTINGS_CHANGED, () => {
        if (this.touch) return;
        this.actionLabel = formatHotkey('shift');
        if (this.lastPayload) this.apply(this.lastPayload);
      }),
    );
  }

  layout(): void {
    const scene = this.root.scene;
    if (!this.touch) {
      this.root.setPosition(16, 98);
      this.barW = 160;
      this.barBg.setSize(160, 10);
      this.barBg.setPosition(0, 20);
      this.barFill.setPosition(1, 20);
      this.barFill.height = 8;
      this.hint.setPosition(0, 32);
      if (this.lastPayload) this.apply(this.lastPayload);
      return;
    }
    const s = getAppliedRenderScale();
    this.label.setFontSize(uiFontGameSize('label', 'touch'));
    this.hint.setFontSize(uiFontGameSize('hint', 'touch'));
    const m = computeGameTouchLayout(scene.scale.width, scene.scale.height);
    const L = shiftHudTouchMetrics({
      statusX: m.status.x,
      statusY: m.status.y,
      statusH: m.status.h,
      renderScale: s,
    });
    this.root.setPosition(L.x, L.y);
    this.barW = L.barW;
    this.barBg.setPosition(0, L.barY);
    this.barBg.setSize(L.barW, L.barH);
    this.barFill.setPosition(1, L.barY);
    this.barFill.height = Math.max(3, L.barH - 2);
    this.hint.setPosition(0, L.hintY);
    if (this.lastPayload) this.apply(this.lastPayload);
  }

  apply(p: ShiftHudPayload): void {
    this.lastPayload = p;
    if (!p.active) {
      this.root.setVisible(false);
      return;
    }
    this.root.setVisible(true);
    const def = SHIFT_LAYERS[p.layer];
    this.label.setColor(def.hudColor);
    this.label.setText(`Layer · ${def.name}`);
    const ratio = Phaser.Math.Clamp(p.energy / SHIFT_MAX_ENERGY, 0, 1);
    this.barFill.width = Math.max(0, (this.barW - 2) * ratio);
    this.barFill.setFillStyle(
      p.energy >= SHIFT_COST && p.cooldownLeft <= 0 ? 0xa090ff : 0x5a5080,
      1,
    );
    const cd =
      p.cooldownLeft > 0 ? ` · CD ${(p.cooldownLeft / 1000).toFixed(1)}s` : '';
    const key = this.actionLabel;
    if (p.nearGate) {
      this.hint.setColor('#7ad4e8');
      this.hint.setText(
        p.canShift ? `${key} — Gate!` : `${key} near gate${cd}`,
      );
    } else {
      this.hint.setColor('#7a8090');
      this.hint.setText(
        p.canShift ? `${key} ready` : `${key}${cd} · kills fill energy`,
      );
    }
  }

  destroy(): void {
    for (const unsub of this.unsubs) unsub();
    this.root.destroy(true);
  }
}
