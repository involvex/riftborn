import Phaser from 'phaser';
import { audioBus } from '../core/AudioBus';
import { shouldShowTouchControls } from './TouchControls';

export type SummaryLine = { text: string; color?: string };

/**
 * Modal run / rift summary overlay (death or boss clear).
 */
export class SummaryOverlay {
  readonly root: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private bg: Phaser.GameObjects.Rectangle;
  private title: Phaser.GameObjects.Text;
  private body: Phaser.GameObjects.Text;
  private actionBtn: Phaser.GameObjects.Text;
  private openFlag = false;
  private onAction: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.bg = scene.add
      .rectangle(0, 0, 420, 320, 0x0a0c10, 0.94)
      .setStrokeStyle(2, 0xc4a574);
    this.title = scene.add
      .text(0, -120, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '26px',
        color: '#e8e4d8',
      })
      .setOrigin(0.5);
    this.body = scene.add
      .text(0, -20, '', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '16px',
        color: '#b0c0d0',
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5);
    this.actionBtn = scene.add
      .text(0, 110, 'Continue', {
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        color: '#0a0c10',
        backgroundColor: '#c4a574',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.actionBtn.on('pointerup', () => {
      audioBus.uiClick();
      this.onAction?.();
    });
    this.root = scene.add
      .container(0, 0, [this.bg, this.title, this.body, this.actionBtn])
      .setScrollFactor(0)
      .setDepth(10_050)
      .setVisible(false);
  }

  get open(): boolean {
    return this.openFlag;
  }

  show(opts: {
    title: string;
    lines: SummaryLine[];
    actionLabel: string;
    onAction: () => void;
  }): void {
    this.title.setText(opts.title);
    this.body.setText(opts.lines.map((l) => l.text).join('\n'));
    this.actionBtn.setText(opts.actionLabel);
    this.onAction = opts.onAction;
    this.layout();
    this.root.setVisible(true);
    this.openFlag = true;
  }

  hide(): void {
    this.root.setVisible(false);
    this.openFlag = false;
    this.onAction = null;
  }

  /** Fire the primary action (Esc / Back). */
  confirm(): void {
    if (!this.openFlag) return;
    this.onAction?.();
  }

  layout(): void {
    const { width, height } = this.scene.scale;
    this.root.setPosition(width / 2, height / 2);
    const touch = shouldShowTouchControls();
    const w = Math.min(440, Math.floor(width * (touch ? 0.82 : 0.72)));
    const h = Math.min(340, Math.floor(height * (touch ? 0.82 : 0.7)));
    this.bg.setSize(w, h);
    this.title.setPosition(0, -h / 2 + (touch ? 32 : 40));
    this.title.setFontSize(touch ? '22px' : '26px');
    this.body.setPosition(0, -10);
    this.body.setFontSize(touch ? '14px' : '16px');
    // ≥44px tall tap target on phone
    this.actionBtn.setStyle({
      fontSize: touch ? '16px' : '18px',
      padding: { x: touch ? 20 : 16, y: touch ? 12 : 8 },
    });
    this.actionBtn.setPosition(0, h / 2 - (touch ? 40 : 48));
  }

  destroy(): void {
    this.root.destroy(true);
  }
}

export function formatPlayTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}
