import Phaser from 'phaser';
import { uiFont } from '../core/UiScale';
import { gameState } from '../systems/GameState';
import { MAX_LEVEL, xpForLevel } from '../systems/ProgressionSystem';
import { shouldShowTouchControls } from './TouchControls';

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
  private barW = 220;
  private readonly barH = 16;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(16, 12).setScrollFactor(0).setDepth(10_000);
    this.barW = this.computeBarW();

    this.meta = scene.add.text(0, 0, '', {
      fontFamily: 'Georgia, serif',
      fontSize: uiFont(scene, 15, 12, 18),
      color: '#e8e4d8',
    });

    this.hpBg = scene.add
      .rectangle(0, 28, this.barW, this.barH, 0x2a1212, 0.95)
      .setOrigin(0, 0.5);
    this.hpBg.setStrokeStyle(1, 0x5a3030, 0.9);
    this.hpFill = scene.add
      .rectangle(1, 28, this.barW - 2, this.barH - 2, 0xc62828, 1)
      .setOrigin(0, 0.5);
    this.hpText = scene.add
      .text(this.barW / 2, 28, '', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '11px',
        color: '#ffe8e8',
      })
      .setOrigin(0.5);

    this.xpBg = scene.add
      .rectangle(0, 50, this.barW, 12, 0x121a24, 0.95)
      .setOrigin(0, 0.5);
    this.xpBg.setStrokeStyle(1, 0x3a5068, 0.9);
    this.xpFill = scene.add
      .rectangle(1, 50, this.barW - 2, 10, 0x2e7d9a, 1)
      .setOrigin(0, 0.5);
    this.xpText = scene.add
      .text(this.barW / 2, 50, '', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '10px',
        color: '#c8e4f0',
      })
      .setOrigin(0.5);

    this.bounty = scene.add.text(0, 66, '', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '11px',
      color: '#e0c890',
    });

    this.root.add([
      this.meta,
      this.hpBg,
      this.hpFill,
      this.hpText,
      this.xpBg,
      this.xpFill,
      this.xpText,
      this.bounty,
    ]);
    this.refresh();
  }

  private computeBarW(): number {
    const sw = this.scene.scale.width;
    return Math.round(Math.min(220, Math.max(130, sw * 0.26)));
  }

  layout(): void {
    const touch = shouldShowTouchControls();
    this.barW = this.computeBarW();
    this.hpBg.width = this.barW;
    this.xpBg.width = this.barW;
    this.hpText.setX(this.barW / 2);
    this.xpText.setX(this.barW / 2);
    // Leave a row under meta for BAG/MAP/MENU on phones
    this.root.setPosition(touch ? 10 : 12, touch ? 6 : 10);
    this.meta.setFontSize(uiFont(this.scene, touch ? 12 : 15, 11, 18));
    this.meta.setWordWrapWidth(Math.min(this.barW + 40, this.scene.scale.width * 0.5));
    this.refresh();
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
    this.hpFill.width = Math.max(0, (this.barW - 2) * hpRatio);
    this.hpText.setText(`HP  ${Math.ceil(gameState.hp)} / ${gameState.maxHp}`);

    const xpRatio =
      lv >= MAX_LEVEL
        ? 1
        : Phaser.Math.Clamp(gameState.progression.xp / Math.max(1, need), 0, 1);
    this.xpFill.width = Math.max(0, (this.barW - 2) * xpRatio);
    this.xpText.setText(
      lv >= MAX_LEVEL ? 'XP  MAX' : `XP  ${gameState.progression.xp} / ${need}`,
    );
  }
}
