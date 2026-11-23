import Phaser from 'phaser';
import { audioBus } from '../core/AudioBus';
import { formatHotkey } from '../core/Hotkeys';
import { uiFont, uiPanelSizeGame } from '../core/UiScale';
import { gameState } from '../systems/GameState';
import { getAbilityDef, getClassTree } from '../systems/SkillSystem';
import {
  fitSkillTree,
  skillNodeCenter,
  type SkillTreeFit,
} from './SkillTreeLayout';
import { shouldShowTouchControls } from './TouchControls';
import {
  attachOverlayDismiss,
  makePanelHitBlock,
  type OverlayDismissHandles,
} from './OverlayDismiss';

/** Class skill tree — spend skill points to unlock / rank abilities. */
export class SkillTreePanel {
  readonly root: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly points: Phaser.GameObjects.Text;
  private readonly nodesRoot: Phaser.GameObjects.Container;
  private readonly detail: Phaser.GameObjects.Text;
  private dismiss!: OverlayDismissHandles;
  private fit: SkillTreeFit | null = null;
  private panelW = 520;
  open = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(10_028);
    this.bg = scene.add.rectangle(0, 0, 520, 420, 0x0e1218, 0.97);
    this.bg.setStrokeStyle(2, 0x6ec6a0, 0.85);
    makePanelHitBlock(this.bg);
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
    this.dismiss = attachOverlayDismiss(scene, this.root, () => this.hide());
    this.root.setVisible(false);
    this.layout();
  }

  private measure(): { w: number; h: number; fit: SkillTreeFit } {
    const { w, h } = uiPanelSizeGame(this.scene, 0.94, 0.88, 640, 500);
    const tree = getClassTree(gameState.progression.classId);
    const fit = fitSkillTree(
      w,
      h,
      tree.map((n) => ({ col: n.col, row: n.row })),
    );
    this.panelW = w;
    this.fit = fit;
    return { w, h, fit };
  }

  layout(): void {
    const { w, h, fit } = this.measure();
    this.bg.setSize(w, h);
    this.title.setPosition(0, fit.titleY);
    this.title.setStyle({ fontSize: uiFont(this.scene, 22, 14, 26) });
    this.points.setPosition(0, fit.pointsY);
    this.points.setFontSize(`${fit.pointsFont}px`);
    this.points.setWordWrapWidth(Math.max(80, w - 88));
    this.nodesRoot.setPosition(0, 0);
    this.detail.setPosition(0, fit.detailY);
    this.detail.setFontSize(`${fit.rankFont}px`);
    this.detail.setWordWrapWidth(fit.detailWrap);
    const close = this.root.getData('closeBtn') as Phaser.GameObjects.Text;
    // The corner X dismisses the panel. The text row sat on the cards.
    close.setVisible(!shouldShowTouchControls());
    close.setPosition(0, h / 2 - 16);
    this.dismiss.layout(w, h);
    this.root.setPosition(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
    );
    if (this.open) this.refresh();
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
    const tree = getClassTree(gameState.progression.classId);
    const fit = this.fit ?? this.measure().fit;
    const wide = this.panelW >= 520;
    this.points.setText(
      wide
        ? `Skill points: ${gameState.skills.unspentSkillPoints}` +
            `   ·   Active keys ${formatHotkey('skill1')}/${formatHotkey('skill2')}/${formatHotkey('skill3')}/${formatHotkey('skill4')}`
        : `Points ${gameState.skills.unspentSkillPoints}`,
    );
    for (const node of tree) {
      const { x, y } = skillNodeCenter(fit, node.col, node.row);
      const ability = getAbilityDef(node.abilityId);
      const rank = gameState.skills.ranks[node.abilityId] ?? 0;
      const max = ability?.maxRank ?? 3;
      const unlocked = gameState.skills.nodeUnlocked(node);
      const canSpend = gameState.skills.canSpendOn(node.id);
      const locked = !unlocked || rank < 1;

      const box = this.scene.add.rectangle(
        x,
        y,
        fit.nodeW,
        fit.nodeH,
        locked ? 0x1a222c : 0x16241c,
        0.95,
      );
      box.setStrokeStyle(
        2,
        canSpend ? 0x6ec6a0 : rank > 0 ? 0xc4a574 : 0x3a4a5a,
        0.9,
      );
      const label = this.scene.add
        .text(x, y - fit.nodeH * 0.18, node.name, {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: `${fit.nodeFont}px`,
          color: locked && rank < 1 ? '#6a7a8a' : '#e8e4d8',
          align: 'center',
          wordWrap: { width: Math.max(40, fit.nodeW - 10) },
        })
        .setOrigin(0.5);
      const rankTxt = this.scene.add
        .text(x, y + fit.nodeH * 0.22, `Rank ${rank}/${max}`, {
          fontFamily: 'Consolas, monospace',
          fontSize: `${fit.rankFont}px`,
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
      'Click a node to unlock or improve. 4 actives on 1 / 2 / 3 / 4.',
    );
  }
}
