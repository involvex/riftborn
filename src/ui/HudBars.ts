import Phaser from 'phaser';
import { uiFont } from '../core/UiScale';
import { gameState } from '../systems/GameState';
import { MAX_LEVEL, xpForLevel } from '../systems/ProgressionSystem';
import { shouldShowTouchControls } from './TouchControls';
import { computeTouchLayout } from './TouchLayout';

const UI_FONT = 'Consolas, "Courier New", monospace';

/** Classic top-left HP (red) + XP bars with compact labels. */
export class HudBars {
  readonly root: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly hpBg: Phaser.GameObjects.Rectangle;
  private readonly hpFill: Phaser.GameObjects.Rectangle;
  private readonly hpText: Phaser.GameObjects.Text;
  private readonly xpBg: Phaser.GameObjects.Rectangle;
  private readonly xpFill: Phaser.GameObjects.Rectangle;
  private readonly xpText: Phaser.GameObjects.Text;
  private readonly meta: Phaser.GameObjects.Text;
  private readonly bounty: Phaser.GameObjects.Text;
  private readonly xpFlash: Phaser.GameObjects.Rectangle;
  private barW = 220;
  private readonly barH = 18;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(16, 12).setScrollFactor(0).setDepth(10_000);
    this.barW = this.computeBarW();

    this.meta = scene.add.text(0, 0, '', {
      fontFamily: UI_FONT,
      fontSize: uiFont(scene, 15, 12, 18),
      color: '#f2eee4',
      resolution: 2,
      stroke: '#0a0c10',
      strokeThickness: 3,
    });

    this.hpBg = scene.add
      .rectangle(0, 30, this.barW, this.barH, 0x1a0c0c, 0.98)
      .setOrigin(0, 0.5);
    this.hpBg.setStrokeStyle(2, 0x8a4040, 1);
    this.hpFill = scene.add
      .rectangle(2, 30, this.barW - 4, this.barH - 4, 0xd32f2f, 1)
      .setOrigin(0, 0.5);
    this.hpText = scene.add
      .text(this.barW / 2, 30, '', {
        fontFamily: UI_FONT,
        fontSize: '12px',
        color: '#fff5f5',
        resolution: 2,
        stroke: '#2a0808',
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    this.xpBg = scene.add
      .rectangle(0, 54, this.barW, 14, 0x0c141c, 0.98)
      .setOrigin(0, 0.5);
    this.xpBg.setStrokeStyle(2, 0x4a7088, 1);
    this.xpFill = scene.add
      .rectangle(2, 54, this.barW - 4, 10, 0x2ea0c8, 1)
      .setOrigin(0, 0.5);
    this.xpFlash = scene.add
      .rectangle(2, 54, 0, 10, 0xb8f0ff, 0.85)
      .setOrigin(0, 0.5)
      .setAlpha(0);
    this.xpText = scene.add
      .text(this.barW / 2, 54, '', {
        fontFamily: UI_FONT,
        fontSize: '11px',
        color: '#e8f6fc',
        resolution: 2,
        stroke: '#0a1520',
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    this.bounty = scene.add.text(0, 72, '', {
      fontFamily: UI_FONT,
      fontSize: '12px',
      color: '#f0d090',
      resolution: 2,
      stroke: '#0a0c10',
      strokeThickness: 3,
    });

    this.root.add([
      this.meta,
      this.hpBg,
      this.hpFill,
      this.hpText,
      this.xpBg,
      this.xpFill,
      this.xpFlash,
      this.xpText,
      this.bounty,
    ]);
    this.refresh();
  }

  private computeBarW(): number {
    const sw = this.scene.scale.width;
    return Math.round(Math.min(240, Math.max(140, sw * 0.28)));
  }

  layout(): void {
    const touch = shouldShowTouchControls();
    if (touch) {
      const m = computeTouchLayout(
        this.scene.scale.width,
        this.scene.scale.height,
      );
      this.barW = Math.round(Math.min(160, Math.max(120, m.status.w - 24)));
      this.root.setPosition(m.status.x, m.status.y);
    } else {
      this.barW = this.computeBarW();
      this.root.setPosition(14, 12);
    }
    this.hpBg.width = this.barW;
    this.xpBg.width = this.barW;
    this.hpText.setX(this.barW / 2);
    this.xpText.setX(this.barW / 2);
    this.meta.setFontSize(uiFont(this.scene, touch ? 11 : 15, 10, 18));
    this.meta.setWordWrapWidth(
      Math.min(this.barW + 24, this.scene.scale.width * 0.4),
    );
    this.bounty.setY(touch ? 68 : 72);
    this.bounty.setFontSize(touch ? 10 : 12);
    this.refresh();
  }

  /** Pulse XP bar + floating +N when XP is gained. */
  playXpGain(amount: number): void {
    if (amount <= 0) return;
    const need = xpForLevel(gameState.progression.level);
    const lv = gameState.progression.level;
    const xpRatio =
      lv >= MAX_LEVEL
        ? 1
        : Phaser.Math.Clamp(gameState.progression.xp / Math.max(1, need), 0, 1);
    const fillW = Math.max(0, (this.barW - 4) * xpRatio);
    this.xpFill.width = fillW;
    this.xpFlash.width = fillW;
    this.xpFlash.setAlpha(0.9);
    this.scene.tweens.add({
      targets: this.xpFlash,
      alpha: 0,
      duration: 420,
      ease: 'Quad.easeOut',
    });
    this.scene.tweens.add({
      targets: this.xpFill,
      scaleY: 1.35,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut',
    });

    const floater = this.scene.add
      .text(this.barW + 8, 54, `+${amount} XP`, {
        fontFamily: UI_FONT,
        fontSize: '13px',
        color: '#9ee8ff',
        resolution: 2,
        stroke: '#0a1520',
        strokeThickness: 3,
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(10_050);
    this.root.add(floater);
    this.scene.tweens.add({
      targets: floater,
      y: floater.y - 22,
      alpha: 0,
      duration: 900,
      ease: 'Quad.easeOut',
      onComplete: () => floater.destroy(),
    });
    this.refresh();
  }

  playLevelUp(): void {
    this.scene.tweens.add({
      targets: this.meta,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 160,
      yoyo: true,
      ease: 'Back.easeOut',
    });
    const burst = this.scene.add
      .text(this.barW / 2, 40, 'LEVEL UP', {
        fontFamily: UI_FONT,
        fontSize: '16px',
        color: '#ffe082',
        resolution: 2,
        stroke: '#2a2010',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10_051);
    this.root.add(burst);
    this.scene.tweens.add({
      targets: burst,
      y: burst.y - 36,
      alpha: 0,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 1100,
      ease: 'Quad.easeOut',
      onComplete: () => burst.destroy(),
    });
  }

  refresh(): void {
    const cls = gameState.progression.classDef().name;
    const need = xpForLevel(gameState.progression.level);
    const lv = gameState.progression.level;
    const bits = [`${gameState.name} · ${cls} · Lv ${lv}`];
    if (gameState.progression.unspentStatPoints) {
      bits.push(`★${gameState.progression.unspentStatPoints}`);
    }
    if (gameState.skills.unspentSkillPoints) {
      bits.push(`◆${gameState.skills.unspentSkillPoints}`);
    }
    if (gameState.inRift) bits.push('[Rift]');
    this.meta.setText(bits.join('  '));

    const bountyLine = gameState.bounties.statusLine();
    this.bounty.setText(bountyLine ? `★ ${bountyLine}` : '');
    this.bounty.setVisible(!!bountyLine);

    const hpRatio = Phaser.Math.Clamp(
      gameState.hp / Math.max(1, gameState.maxHp),
      0,
      1,
    );
    this.hpFill.width = Math.max(0, (this.barW - 4) * hpRatio);
    this.hpText.setText(`HP  ${Math.ceil(gameState.hp)} / ${gameState.maxHp}`);

    const xpRatio =
      lv >= MAX_LEVEL
        ? 1
        : Phaser.Math.Clamp(gameState.progression.xp / Math.max(1, need), 0, 1);
    this.xpFill.width = Math.max(0, (this.barW - 4) * xpRatio);
    this.xpText.setText(
      lv >= MAX_LEVEL ? 'XP  MAX' : `XP  ${gameState.progression.xp} / ${need}`,
    );
  }
}
