import Phaser from 'phaser';
import { audioBus } from '../core/AudioBus';
import { formatHotkey } from '../core/Hotkeys';
import { uiFont, uiPanelSize } from '../core/UiScale';
import { gameState } from '../systems/GameState';
import { getAbilityDef, getClassTree } from '../systems/SkillSystem';

/** Class skill tree — spend skill points to unlock / rank abilities. */
export class SkillTreePanel {
  readonly root: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly points: Phaser.GameObjects.Text;
  private readonly nodesRoot: Phaser.GameObjects.Container;
  private readonly detail: Phaser.GameObjects.Text;
  open = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(10_028);
    this.bg = scene.add.rectangle(0, 0, 520, 420, 0x0e1218, 0.97);
    this.bg.setStrokeStyle(2, 0x6ec6a0, 0.85);
    this.title = scene.add
      .text(0, 0, 'Skill Tree', {
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        color: '#e8e4d8',
      })
      .setOrigin(0.5);
    this.points = scene.add
      .text(0, 0, '', {
        fontFamily: 'Consolas, monospace',
        fontSize: '14px',
        color: '#6ec6a0',
      })
      .setOrigin(0.5);
    this.nodesRoot = scene.add.container(0, 0);
    this.detail = scene.add
      .text(0, 0, '', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '13px',
        color: '#8a9aaa',
        align: 'center',
        wordWrap: { width: 440 },
      })
      .setOrigin(0.5, 0);
    const close = scene.add
      .text(0, 0, `Close (${formatHotkey('skills')} / Esc)`, {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '13px',
        color: '#8a9aaa',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    close.on('pointerup', () => this.hide());
    this.root.add([
      this.bg,
      this.title,
      this.points,
      this.nodesRoot,
      this.detail,
      close,
    ]);
    this.root.setData('closeBtn', close);
    this.root.setVisible(false);
    this.layout();
  }

  layout(): void {
    const { w, h } = uiPanelSize(this.scene, 0.9, 0.82, 560, 460);
    this.bg.setSize(w, h);
    this.title.setPosition(0, -h / 2 + 22);
    this.title.setStyle({ fontSize: uiFont(this.scene, 22, 16, 26) });
    this.points.setPosition(0, -h / 2 + 48);
    this.nodesRoot.setPosition(0, -20);
    this.detail.setPosition(0, h / 2 - 88);
    this.detail.setWordWrapWidth(w - 48);
    const close = this.root.getData('closeBtn') as Phaser.GameObjects.Text;
    close.setPosition(0, h / 2 - 20);
    this.root.setPosition(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
    );
  }

  show(): void {
    this.layout();
    this.refresh();
    this.root.setVisible(true);
    this.open = true;
  }

  hide(): void {
    this.root.setVisible(false);
    this.open = false;
  }

  toggle(): void {
    if (this.open) this.hide();
    else this.show();
  }

  refresh(): void {
    this.nodesRoot.removeAll(true);
    const cls = gameState.progression.classDef();
    this.title.setText(`${cls.name} Skills`);
    this.points.setText(
      `Skill points: ${gameState.skills.unspentSkillPoints}` +
        `   ·   Active keys ${formatHotkey('skill1')}/${formatHotkey('skill2')}/${formatHotkey('skill3')}`,
    );

    const tree = getClassTree(gameState.progression.classId);
    const cellW = 150;
    const cellH = 88;
    for (const node of tree) {
      const x = node.col * cellW;
      const y = (node.row - 0.6) * cellH;
      const ability = getAbilityDef(node.abilityId);
      const rank = gameState.skills.ranks[node.abilityId] ?? 0;
      const max = ability?.maxRank ?? 3;
      const unlocked = gameState.skills.nodeUnlocked(node);
      const canSpend = gameState.skills.canSpendOn(node.id);
      const locked = !unlocked || rank < 1;

      const box = this.scene.add.rectangle(
        x,
        y,
        132,
        72,
        locked ? 0x1a222c : 0x16241c,
        0.95,
      );
      box.setStrokeStyle(
        2,
        canSpend ? 0x6ec6a0 : rank > 0 ? 0xc4a574 : 0x3a4a5a,
        0.9,
      );
      const label = this.scene.add
        .text(x, y - 14, node.name, {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '12px',
          color: locked && rank < 1 ? '#6a7a8a' : '#e8e4d8',
          align: 'center',
          wordWrap: { width: 120 },
        })
        .setOrigin(0.5);
      const rankTxt = this.scene.add
        .text(x, y + 18, `Rank ${rank}/${max}`, {
          fontFamily: 'Consolas, monospace',
          fontSize: '11px',
          color: canSpend ? '#6ec6a0' : '#8a9aaa',
        })
        .setOrigin(0.5);

      box.setInteractive({ useHandCursor: true });
      box.on('pointerover', () => {
        this.detail.setText(
          `${node.blurb}\n${ability?.blurb ?? ''}${canSpend ? '\nClick to spend 1 skill point' : ''}`,
        );
      });
      box.on('pointerup', () => {
        if (!gameState.spendSkill(node.id)) {
          if (!unlocked) {
            this.detail.setText('Unlock the previous skill first.');
          } else if (rank >= max) {
            this.detail.setText('Already at max rank.');
          } else {
            this.detail.setText('No skill points — gain 1 every 5 levels.');
          }
          return;
        }
        audioBus.uiClick();
        this.refresh();
        this.detail.setText(`Ranked up ${node.name} → ${rank + 1}`);
      });

      this.nodesRoot.add([box, label, rankTxt]);
    }

    this.detail.setText(
      'Click a node to unlock or improve. 3 actives on 1 / 2 / 3.',
    );
  }
}
