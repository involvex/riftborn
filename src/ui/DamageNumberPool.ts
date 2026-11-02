import Phaser from 'phaser';
import { currentGraphicsProfile } from '../core/GraphicsQuality';
import { COMBAT_FEEL, isCombatCrit } from '../render/CombatFeel';

/**
 * Reuse Text objects for floating damage instead of alloc+destroy
 * every hit (main GC spike on Android WebView).
 */
export class DamageNumberPool {
  private readonly scene: Phaser.Scene;
  private readonly layer: Phaser.GameObjects.Container;
  private readonly free: Phaser.GameObjects.Text[] = [];
  private activeCount = 0;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Container) {
    this.scene = scene;
    this.layer = layer;
  }

  spawn(x: number, y: number, amount: number, kind: string): void {
    const profile = currentGraphicsProfile();
    if (this.activeCount >= profile.maxDamageNumbers) return;

    const style = COMBAT_FEEL.damageNumbers;
    const toPlayer = kind === 'player';
    const crit = !toPlayer && isCombatCrit(amount);
    const color = toPlayer
      ? style.playerColor
      : crit
        ? style.critColor
        : style.enemyColor;
    const fontSize = toPlayer
      ? style.fontPlayer
      : crit
        ? style.fontCrit
        : style.fontEnemy;
    const drift = (Math.random() - 0.5) * (profile.tier === 'low' ? 10 : 18);
    const label = crit ? `${amount}!` : String(amount);

    const t = this.acquire();
    t.setText(label);
    t.setPosition(x + drift, y);
    t.setStyle({
      fontFamily: 'Segoe UI, sans-serif',
      fontSize,
      color,
      fontStyle: 'bold',
      stroke: style.stroke,
      strokeThickness: profile.tier === 'low' ? 2 : style.strokeThickness,
      resolution: profile.textResolution,
    });
    t.setAlpha(1);
    t.setScale(toPlayer ? 1 : crit ? 1.25 : 1.15);
    t.setVisible(true);
    this.activeCount += 1;

    this.scene.tweens.killTweensOf(t);
    this.scene.tweens.add({
      targets: t,
      y: y - (toPlayer ? 36 : crit ? 52 : 44),
      x: x + drift * 1.4,
      alpha: 0,
      scale: toPlayer ? 0.85 : crit ? 1.05 : 0.95,
      duration: toPlayer ? 700 : crit ? 780 : 650,
      ease: 'Cubic.easeOut',
      onComplete: () => this.release(t),
    });
  }

  private acquire(): Phaser.GameObjects.Text {
    const existing = this.free.pop();
    if (existing) return existing;
    const t = this.scene.add
      .text(0, 0, '', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '16px',
        color: '#fff',
      })
      .setOrigin(0.5)
      .setDepth(40);
    this.layer.add(t);
    return t;
  }

  private release(t: Phaser.GameObjects.Text): void {
    this.scene.tweens.killTweensOf(t);
    t.setVisible(false);
    t.setAlpha(0);
    this.activeCount = Math.max(0, this.activeCount - 1);
    this.free.push(t);
  }
}
