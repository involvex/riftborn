import Phaser from 'phaser';
import { gameEvents } from '../core/EventBus';
import { audioBus } from '../core/AudioBus';
import {
  computeTouchLayout,
  TOUCH_CHROME_COUNT,
  type TouchLayout,
  type TouchPoint,
} from './TouchLayout';

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

const CHROME_AUTO_CLOSE_MS = 4000;
const MENU_INDEX = TOUCH_CHROME_COUNT - 1;

type Btn = {
  root: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
};

type ChromeEntry = { label: string; event: string; stroke: number };

const CHROME: ChromeEntry[] = [
  { label: 'BAG', event: 'ui:openInventory', stroke: 0x4a6070 },
  { label: 'CHAR', event: 'ui:openCharacter', stroke: 0xc4a574 },
  { label: 'SKILL', event: 'ui:openSkills', stroke: 0x6ec6a0 },
  { label: 'MAP', event: 'ui:toggleMap', stroke: 0x5a8fd4 },
  { label: '☰', event: 'ui:toggleMenu', stroke: 0x8a9aaa },
];

/**
 * Phone pads — stick+DASH left, ATK+skills+E right.
 * Top chrome tray toggled by tapping the minimap or ☰ (collapsed by default).
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
  private shiftBtn!: Btn;
  private townBtn!: Btn;
  private chromeBtns: Btn[] = [];
  private chromeOpen = false;
  private chromeTimer: Phaser.Time.TimerEvent | null = null;
  private chromeIgnoreOutsideUntil = 0;
  private metrics: TouchLayout | null = null;
  dx = 0;
  dy = 0;
  private active = false;
  private interactDimmed = true;
  /** Town button only outside hub (rift / wilderness). */
  private townVisible = false;

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
    this.shiftBtn = this.makeBtn('SHIFT', 0x9a80e0, () =>
      gameEvents.emit('combat:shift', {}),
    );
    this.townBtn = this.makeBtn('⌂', 0xc4a574, () => {
      audioBus.uiClick();
      gameEvents.emit('ui:returnToTown', {});
    });
    this.townBtn.root.setVisible(false);
    this.root.add([
      this.atk.root,
      this.interact.root,
      this.dash.root,
      this.shiftBtn.root,
      this.townBtn.root,
    ]);

    this.chromeBtns = CHROME.slice(0, TOUCH_CHROME_COUNT).map((e, i) =>
      this.makeBtn(e.label, e.stroke, () => this.onChromeTap(i, e)),
    );
    this.root.add(this.chromeBtns.map((b) => b.root));
    this.setChromeOpen(false);
    this.setInteractHint('E', true);

    gameEvents.on('ui:toggleTouchChrome', () => {
      if (!this.active) return;
      this.setChromeOpen(!this.chromeOpen);
    });
    gameEvents.on('ui:setTouchChrome', (p) => {
      if (!this.active) return;
      const open = !!(p as { open?: boolean }).open;
      this.setChromeOpen(open);
    });
    gameEvents.on('ui:interactHint', (p) => {
      const d = p as { label?: string; dimmed?: boolean };
      this.setInteractHint(d.label ?? 'E', !!d.dimmed);
    });
    gameEvents.on('ui:townButton', (p) => {
      const d = p as { visible?: boolean };
      this.setTownVisible(!!d.visible);
    });

    this.scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      this.maybeCloseChromeOutside(p.x, p.y);
    });

    this.layout();
    this.root.setVisible(false);
  }

  setTownVisible(on: boolean): void {
    this.townVisible = on;
    this.townBtn.root.setVisible(this.active && on);
  }

  getMetrics(): TouchLayout | null {
    return this.active ? this.metrics : null;
  }

  get enabled(): boolean {
    return this.active;
  }

  isChromeOpen(): boolean {
    return this.chromeOpen;
  }

  setEnabled(on: boolean): void {
    this.active = on;
    this.root.setVisible(on);
    if (!on) {
      this.dx = 0;
      this.dy = 0;
      this.resetKnob();
      this.metrics = null;
      this.setChromeOpen(false);
    } else {
      this.layout();
    }
  }

  setInteractHint(label: string, dimmed: boolean): void {
    this.interactDimmed = dimmed;
    this.interact.label.setText(label);
    const font =
      label.length >= 5 ? '11px' : label.length >= 4 ? '12px' : '14px';
    this.interact.label.setFontSize(font);
    this.interact.root.setAlpha(dimmed ? 0.42 : 1);
  }

  setChromeOpen(open: boolean): void {
    this.chromeOpen = open;
    this.applyChromeVisibility();
    this.clearChromeTimer();
    if (open && this.active) {
      this.chromeIgnoreOutsideUntil = this.scene.time.now + 80;
      this.chromeTimer = this.scene.time.delayedCall(
        CHROME_AUTO_CLOSE_MS,
        () => {
          this.setChromeOpen(false);
        },
      );
    }
    gameEvents.emit('ui:touchChrome', { open });
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

    this.placeBtn(this.dash, m.dash.x, m.dash.y, m.dash.r, '11px');
    this.placeBtn(this.shiftBtn, m.shift.x, m.shift.y, m.shift.r, '10px');
    this.placeBtn(this.atk, m.atk.x, m.atk.y, m.atk.r, '15px');
    this.placeBtn(
      this.interact,
      m.interact.x,
      m.interact.y,
      m.interact.r,
      this.interactDimmed ? '14px' : '12px',
    );

    this.chromeBtns.forEach((b, i) => {
      const c = m.chromeButtons[i];
      if (!c) return;
      this.placeBtn(b, c.x, c.y, c.r, c.r >= 22 ? '10px' : '9px');
    });
    const town = m.townButton;
    this.placeBtn(this.townBtn, town.x, town.y, town.r, '18px');
    this.townBtn.root.setVisible(this.active && this.townVisible);
    this.applyChromeVisibility();
  }

  private onChromeTap(index: number, entry: ChromeEntry): void {
    audioBus.uiClick();
    if (index === MENU_INDEX) {
      if (!this.chromeOpen) {
        this.setChromeOpen(true);
        return;
      }
      gameEvents.emit(entry.event, {});
      this.setChromeOpen(false);
      return;
    }
    gameEvents.emit(entry.event, {});
    this.setChromeOpen(false);
  }

  private applyChromeVisibility(): void {
    this.chromeBtns.forEach((b, i) => {
      const isMenu = i === MENU_INDEX;
      // Collapsed: only ☰ stays as the expand affordance (+ minimap tap).
      b.root.setVisible(this.active && (this.chromeOpen || isMenu));
    });
  }

  private clearChromeTimer(): void {
    if (this.chromeTimer) {
      this.chromeTimer.remove(false);
      this.chromeTimer = null;
    }
  }

  private maybeCloseChromeOutside(px: number, py: number): void {
    if (!this.active || !this.chromeOpen) return;
    if (this.scene.time.now < this.chromeIgnoreOutsideUntil) return;
    if (this.hitChromeOrMinimap(px, py)) {
      // Keep tray open; refresh auto-close while using chrome.
      this.clearChromeTimer();
      this.chromeTimer = this.scene.time.delayedCall(
        CHROME_AUTO_CLOSE_MS,
        () => {
          this.setChromeOpen(false);
        },
      );
      return;
    }
    this.setChromeOpen(false);
  }

  private hitChromeOrMinimap(px: number, py: number): boolean {
    const m = this.metrics;
    if (!m) return false;
    if (pointInRect(px, py, m.minimap)) return true;
    for (const c of m.chromeButtons) {
      if (pointInCircle(px, py, c)) return true;
    }
    return false;
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
    const max = this.stickR - 6;
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    this.stickKnob.setPosition(this.stickCx + dx, this.stickCy + dy);
    const nx = dx / max;
    const ny = dy / max;
    const mag = Math.hypot(nx, ny);
    const dead = 0.1;
    if (mag < dead) {
      this.dx = 0;
      this.dy = 0;
    } else {
      const t = Math.min(1, (mag - dead) / (1 - dead));
      this.dx = (nx / mag) * t;
      this.dy = (ny / mag) * t;
    }
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

function pointInRect(
  px: number,
  py: number,
  r: { x: number; y: number; w: number; h: number },
): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function pointInCircle(px: number, py: number, c: TouchPoint): boolean {
  return Math.hypot(px - c.x, py - c.y) <= c.r + 4;
}
