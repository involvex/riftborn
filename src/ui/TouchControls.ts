import Phaser from 'phaser';
import { gameEvents } from '../core/EventBus';
import { audioBus } from '../core/AudioBus';

/** Detect whether on-screen controls should show. */
export function shouldShowTouchControls(): boolean {
  try {
    const w = window as Window & { __RIFTBORN_TOUCH?: number };
    if (w.__RIFTBORN_TOUCH) return true;
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

type Btn = {
  root: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
};

/**
 * Landscape phone pad: stick BL · ATK/E/DASH BR · INV/MAP/MENU top-right.
 */
export class TouchControls {
  readonly root: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private stickBase!: Phaser.GameObjects.Arc;
  private stickKnob!: Phaser.GameObjects.Arc;
  private stickHit!: Phaser.GameObjects.Zone;
  private stickPointerId: number | null = null;
  private stickCx = 0;
  private stickCy = 0;
  private stickR = 58;
  private actions!: Phaser.GameObjects.Container;
  private quick!: Phaser.GameObjects.Container;
  private atk!: Btn;
  private interact!: Btn;
  private dash!: Btn;
  private quickBtns: Btn[] = [];
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
    const short = Math.min(w, h);
    const pad = Math.max(16, Math.round(short * 0.03));
    const landscape = w >= h;

    this.stickR = landscape ? 56 : 48;
    this.stickBase.setRadius(this.stickR);
    this.stickKnob.setRadius(Math.round(this.stickR * 0.42));
    this.stickHit.setSize(this.stickR * 2.4, this.stickR * 2.4);

    this.stickCx = pad + this.stickR + 8;
    this.stickCy = h - pad - this.stickR - (landscape ? 12 : 28);
    this.stickBase.setPosition(this.stickCx, this.stickCy);
    this.stickHit.setPosition(this.stickCx, this.stickCy);
    this.resetKnob();

    const ax = w - pad - 72;
    const ay = h - pad - (landscape ? 88 : 120);
    this.actions.setPosition(ax, ay);
    this.styleBtn(this.atk, 38, '14px');
    this.styleBtn(this.interact, 28, '13px');
    this.styleBtn(this.dash, 28, '11px');
    this.atk.root.setPosition(0, 0);
    this.interact.root.setPosition(-68, -8);
    this.dash.root.setPosition(8, -72);

    this.quick.setPosition(w - pad, landscape ? 148 : 120);
    this.quickBtns.forEach((b, i) => {
      this.styleBtn(b, 22, '10px');
      b.root.setPosition(-28, i * 46);
    });
  }

  private styleBtn(b: Btn, r: number, fontSize: string): void {
    b.bg.setRadius(r);
    b.label.setFontSize(fontSize);
  }

  private buildStick(): void {
    this.stickBase = this.scene.add
      .circle(0, 0, this.stickR, 0x121820, 0.5)
      .setStrokeStyle(2, 0x4a6070, 0.8);
    this.stickKnob = this.scene.add
      .circle(0, 0, 24, 0xc4a574, 0.9)
      .setStrokeStyle(2, 0xe8e4d8, 0.55);
    this.stickHit = this.scene.add
      .zone(0, 0, this.stickR * 2.4, this.stickR * 2.4)
      .setInteractive();

    this.stickHit.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.stickPointerId = p.id;
      this.updateStick(p.x, p.y);
    });
    this.scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.stickPointerId !== p.id) return;
      this.updateStick(p.x, p.y);
    });
    const end = (p: Phaser.Input.Pointer) => {
      if (this.stickPointerId !== p.id) return;
      this.stickPointerId = null;
      this.dx = 0;
      this.dy = 0;
      this.resetKnob();
      gameEvents.emit('input:move', { dx: 0, dy: 0 });
    };
    this.scene.input.on('pointerup', end);
    this.scene.input.on('pointerupoutside', end);

    this.root.add([this.stickBase, this.stickKnob, this.stickHit]);
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
    this.dx =
      Math.abs(nx) < 0.22 ? 0 : Math.sign(nx) * (Math.abs(nx) > 0.5 ? 1 : 0.5);
    this.dy =
      Math.abs(ny) < 0.22 ? 0 : Math.sign(ny) * (Math.abs(ny) > 0.5 ? 1 : 0.5);
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
    this.actions = this.scene.add.container(0, 0);
    this.atk = this.makeBtn(0, 0, 'ATK', () =>
      gameEvents.emit('combat:attack', {}),
    );
    this.interact = this.makeBtn(0, 0, 'E', () =>
      gameEvents.emit('ui:interact', {}),
    );
    this.dash = this.makeBtn(0, 0, 'DASH', () =>
      gameEvents.emit('combat:dash', {}),
    );
    this.actions.add([this.atk.root, this.interact.root, this.dash.root]);
    this.root.add(this.actions);
  }

  private buildQuick(): void {
    this.quick = this.scene.add.container(0, 0);
    const entries: [string, string][] = [
      ['INV', 'ui:openInventory'],
      ['MAP', 'ui:toggleMap'],
      ['MENU', 'ui:toggleMenu'],
    ];
    this.quickBtns = entries.map(([label, ev]) =>
      this.makeBtn(0, 0, label, () => {
        audioBus.uiClick();
        gameEvents.emit(ev, {});
      }),
    );
    this.quick.add(this.quickBtns.map((b) => b.root));
    this.root.add(this.quick);
  }

  private makeBtn(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Btn {
    const bg = this.scene.add
      .circle(0, 0, 28, 0x1a2230, 0.82)
      .setStrokeStyle(2, 0x6ec6a0, 0.9)
      .setInteractive({ useHandCursor: true });
    bg.on('pointerup', onClick);
    const t = this.scene.add
      .text(0, 0, label, {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '12px',
        color: '#e8e4d8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const root = this.scene.add.container(x, y, [bg, t]);
    return { root, bg, label: t };
  }
}
