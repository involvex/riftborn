import Phaser from 'phaser';
import { gameEvents } from '../core/EventBus';
import { audioBus } from '../core/AudioBus';
import { computeTouchLayout, type TouchLayout } from './TouchLayout';

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
 * Phone pads — left stick, right combat cluster.
 * Skills live in AbilityBar using the same TouchLayout metrics.
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
  private atk!: Btn;
  private interact!: Btn;
  private dash!: Btn;
  private quickBtns: Btn[] = [];
  private metrics: TouchLayout | null = null;
  dx = 0;
  dy = 0;
  private active = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(10_006);
    this.buildStick();
    this.atk = this.makeBtn('ATK', 0xc45c3a, () =>
      gameEvents.emit('combat:attack', {}),
    );
    this.interact = this.makeBtn('E', 0x6ec6a0, () =>
      gameEvents.emit('ui:interact', {}),
    );
    this.dash = this.makeBtn('DASH', 0x5a8fd4, () =>
      gameEvents.emit('combat:dash', {}),
    );
    this.root.add([this.atk.root, this.interact.root, this.dash.root]);

    const entries: [string, string][] = [
      ['BAG', 'ui:openInventory'],
      ['MAP', 'ui:toggleMap'],
      ['☰', 'ui:toggleMenu'],
    ];
    this.quickBtns = entries.map(([label, ev]) =>
      this.makeBtn(label, 0x4a6070, () => {
        audioBus.uiClick();
        gameEvents.emit(ev, {});
      }),
    );
    this.root.add(this.quickBtns.map((b) => b.root));

    this.layout();
    this.root.setVisible(false);
  }

  /** Latest layout — AbilityBar / MiniMap read this after layout(). */
  getMetrics(): TouchLayout | null {
    return this.active ? this.metrics : null;
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
      this.metrics = null;
    } else {
      this.layout();
    }
  }

  layout(): void {
    if (!this.active && !shouldShowTouchControls()) return;
    const m = computeTouchLayout(
      this.scene.scale.width,
      this.scene.scale.height,
    );
    this.metrics = m;

    this.stickR = m.stick.r;
    this.stickCx = m.stick.x;
    this.stickCy = m.stick.y;
    this.stickBase.setRadius(m.stick.r);
    this.stickKnob.setRadius(Math.round(m.stick.r * 0.4));
    this.stickHit.setSize(m.stick.r * 2.8, m.stick.r * 2.8);
    this.stickBase.setPosition(this.stickCx, this.stickCy);
    this.stickHit.setPosition(this.stickCx, this.stickCy);
    this.resetKnob();

    this.placeBtn(this.atk, m.atk.x, m.atk.y, m.atk.r, '15px');
    this.placeBtn(
      this.interact,
      m.interact.x,
      m.interact.y,
      m.interact.r,
      '14px',
    );
    this.placeBtn(this.dash, m.dash.x, m.dash.y, m.dash.r, '11px');

    this.quickBtns.forEach((b, i) => {
      this.placeBtn(
        b,
        m.quick.x0 + i * m.quick.gap,
        m.quick.y,
        m.quick.r,
        '10px',
      );
    });
  }

  private placeBtn(
    b: Btn,
    x: number,
    y: number,
    r: number,
    fontSize: string,
  ): void {
    b.root.setPosition(x, y);
    b.bg.setRadius(r);
    b.label.setFontSize(fontSize);
  }

  private buildStick(): void {
    this.stickBase = this.scene.add
      .circle(0, 0, this.stickR, 0x121820, 0.45)
      .setStrokeStyle(2, 0x4a6070, 0.75);
    this.stickKnob = this.scene.add
      .circle(0, 0, 24, 0xc4a574, 0.92)
      .setStrokeStyle(2, 0xe8e4d8, 0.55);
    this.stickHit = this.scene.add
      .zone(0, 0, this.stickR * 2.8, this.stickR * 2.8)
      .setOrigin(0.5)
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
    const dead = 0.16;
    this.dx = Math.abs(nx) < dead ? 0 : Math.sign(nx);
    this.dy = Math.abs(ny) < dead ? 0 : Math.sign(ny);
    gameEvents.emit('input:move', { dx: this.dx, dy: this.dy });
  }

  private resetKnob(): void {
    this.stickKnob.setPosition(this.stickCx, this.stickCy);
  }

  private makeBtn(label: string, stroke: number, onClick: () => void): Btn {
    const bg = this.scene.add
      .circle(0, 0, 28, 0x1a2230, 0.88)
      .setStrokeStyle(2.5, stroke, 0.95)
      .setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => {
      bg.setScale(0.92);
      bg.setFillStyle(0x243040, 0.95);
    });
    const release = () => {
      bg.setScale(1);
      bg.setFillStyle(0x1a2230, 0.88);
    };
    bg.on('pointerup', () => {
      release();
      onClick();
    });
    bg.on('pointerout', release);
    const t = this.scene.add
      .text(0, 0, label, {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '12px',
        color: '#e8e4d8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const root = this.scene.add.container(0, 0, [bg, t]);
    return { root, bg, label: t };
  }
}
