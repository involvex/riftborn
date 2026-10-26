import Phaser from 'phaser';
import { gameEvents } from '../core/EventBus';
import { audioBus } from '../core/AudioBus';

/** Detect whether on-screen controls should show. */
export function shouldShowTouchControls(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('touch') && params.get('touch') !== '0') return true;
    if (params.get('touch') === '0') return false;
  } catch {
    /* ignore */
  }
  if (typeof window === 'undefined') return false;
  const coarse =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;
  const small = Math.max(window.innerWidth, window.innerHeight) <= 900;
  return coarse || small;
}

/**
 * Virtual stick + action buttons for phone / ?touch=1.
 * Emits EventBus events consumed by WorldScene / UIScene.
 */
export class TouchControls {
  readonly root: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private stickBase!: Phaser.GameObjects.Arc;
  private stickKnob!: Phaser.GameObjects.Arc;
  private stickPointerId: number | null = null;
  private stickCx = 0;
  private stickCy = 0;
  private readonly stickR = 52;
  dx = 0;
  dy = 0;
  private active = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(10_006);
    this.buildStick();
    this.buildActions();
    this.buildQuick();
    this.layout();
    this.root.setVisible(false);
  }

  get enabled(): boolean {
    return this.active;
  }

  setEnabled(on: boolean): void {
    this.active = on;
    this.root.setVisible(on);
    if (!on) {
      this.dx = 0;
      this.dy = 0;
      this.resetKnob();
    }
  }

  layout(): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    this.stickCx = 88;
    this.stickCy = h - 100;
    this.stickBase.setPosition(this.stickCx, this.stickCy);
    this.resetKnob();

    const actions = this.root.getData(
      'actions',
    ) as Phaser.GameObjects.Container;
    actions.setPosition(w - 100, h - 110);

    const quick = this.root.getData('quick') as Phaser.GameObjects.Container;
    quick.setPosition(w - 16, 160);
  }

  private buildStick(): void {
    this.stickBase = this.scene.add
      .circle(0, 0, this.stickR, 0x121820, 0.55)
      .setStrokeStyle(2, 0x4a6070, 0.85)
      .setInteractive();
    this.stickKnob = this.scene.add
      .circle(0, 0, 22, 0xc4a574, 0.85)
      .setStrokeStyle(2, 0xe8e4d8, 0.5);

    this.stickBase.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.stickPointerId = p.id;
      this.updateStick(p.x, p.y);
    });
    this.scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.stickPointerId !== p.id) return;
      this.updateStick(p.x, p.y);
    });
    this.scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.stickPointerId !== p.id) return;
      this.stickPointerId = null;
      this.dx = 0;
      this.dy = 0;
      this.resetKnob();
      gameEvents.emit('input:move', { dx: 0, dy: 0 });
    });

    this.root.add([this.stickBase, this.stickKnob]);
  }

  private updateStick(px: number, py: number): void {
    let dx = px - this.stickCx;
    let dy = py - this.stickCy;
    const len = Math.hypot(dx, dy) || 1;
    const max = this.stickR - 8;
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    this.stickKnob.setPosition(this.stickCx + dx, this.stickCy + dy);
    const nx = dx / max;
    const ny = dy / max;
    // Deadzone
    this.dx =
      Math.abs(nx) < 0.2 ? 0 : Math.sign(nx) * (Math.abs(nx) > 0.55 ? 1 : 0.5);
    this.dy =
      Math.abs(ny) < 0.2 ? 0 : Math.sign(ny) * (Math.abs(ny) > 0.55 ? 1 : 0.5);
    // Quantize to 8-way
    if (this.dx !== 0 || this.dy !== 0) {
      this.dx = Math.sign(this.dx);
      this.dy = Math.sign(this.dy);
    }
    gameEvents.emit('input:move', { dx: this.dx, dy: this.dy });
  }

  private resetKnob(): void {
    this.stickKnob.setPosition(this.stickCx, this.stickCy);
  }

  private buildActions(): void {
    const c = this.scene.add.container(0, 0);
    c.add(this.btn(0, -50, 'ATK', () => gameEvents.emit('combat:attack', {})));
    c.add(this.btn(-55, 10, 'E', () => gameEvents.emit('ui:interact', {})));
    c.add(this.btn(55, 10, 'DASH', () => gameEvents.emit('combat:dash', {})));
    this.root.add(c);
    this.root.setData('actions', c);
  }

  private buildQuick(): void {
    const c = this.scene.add.container(0, 0);
    const mk = (y: number, label: string, ev: string) => {
      const b = this.btn(0, y, label, () => {
        audioBus.uiClick();
        gameEvents.emit(ev, {});
      });
      // Origin right
      b.setPosition(-40, y);
      return b;
    };
    c.add(mk(0, 'INV', 'ui:openInventory'));
    c.add(mk(48, 'MAP', 'ui:toggleMap'));
    c.add(mk(96, 'MENU', 'ui:toggleMenu'));
    this.root.add(c);
    this.root.setData('quick', c);
  }

  private btn(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const bg = this.scene.add
      .circle(0, 0, 28, 0x1a2230, 0.85)
      .setStrokeStyle(2, 0x6ec6a0, 0.9)
      .setInteractive({ useHandCursor: true });
    bg.on('pointerup', onClick);
    const t = this.scene.add
      .text(0, 0, label, {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: label.length > 3 ? '10px' : '12px',
        color: '#e8e4d8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    return this.scene.add.container(x, y, [bg, t]);
  }
}
