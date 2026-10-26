import Phaser from 'phaser';
import { audioBus } from '../core/AudioBus';
import { uiFont, uiPanelSize } from '../core/UiScale';
import { describeGear } from '../systems/ItemGen';
import { gameState } from '../systems/GameState';

/** Vendor trade UI — buy random gear for gold. */
export class ShopPanel {
  readonly root: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly goldText: Phaser.GameObjects.Text;
  private readonly list: Phaser.GameObjects.Container;
  private readonly detail: Phaser.GameObjects.Text;
  open = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(10_030);
    this.bg = scene.add.rectangle(0, 0, 420, 420, 0x0e1218, 0.97);
    this.bg.setStrokeStyle(2, 0xc4a574, 0.85);
    this.title = scene.add
      .text(0, 0, 'Mira — Armorer', {
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        color: '#e8e4d8',
      })
      .setOrigin(0.5);
    this.goldText = scene.add
      .text(0, 0, '', {
        fontFamily: 'Consolas, monospace',
        fontSize: '14px',
        color: '#e6c35c',
      })
      .setOrigin(0.5);
    this.list = scene.add.container(0, 0);
    this.detail = scene.add
      .text(0, 0, 'Spend gold for rolled armor & weapons.', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '13px',
        color: '#8a9aaa',
        align: 'center',
        wordWrap: { width: 360 },
      })
      .setOrigin(0.5, 0);
    const close = scene.add
      .text(0, 0, 'Close (Esc)', {
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
      this.goldText,
      this.list,
      this.detail,
      close,
    ]);
    this.root.setData('close', close);
    this.root.setVisible(false);
    this.layout();
  }

  layout(): void {
    const { w, h } = uiPanelSize(this.scene, 0.9, 0.75, 440, 460);
    this.bg.setSize(w, h);
    this.title.setPosition(0, -h / 2 + 28);
    this.title.setStyle({ fontSize: uiFont(this.scene, 22, 16, 26) });
    this.goldText.setPosition(0, -h / 2 + 54);
    this.list.setPosition(0, -h / 2 + 90);
    this.detail.setPosition(0, h / 2 - 70);
    this.detail.setWordWrapWidth(w - 40);
    const close = this.root.getData('close') as Phaser.GameObjects.Text;
    close.setPosition(0, h / 2 - 24);
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

  refresh(): void {
    this.list.removeAll(true);
    this.goldText.setText(`Gold: ${gameState.shop.gold()}`);
    const offers = gameState.shop.listOffers();
    offers.forEach((offer, i) => {
      const y = i * 58;
      const row = this.scene.add
        .rectangle(0, y, 360, 50, 0x1a2230, 1)
        .setStrokeStyle(1, 0x4a5568)
        .setInteractive({ useHandCursor: true });
      const label = this.scene.add
        .text(-168, y - 8, `${offer.label}  ·  ${offer.price}g`, {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '14px',
          color: '#e8e4d8',
        })
        .setOrigin(0, 0.5);
      const blurb = this.scene.add
        .text(-168, y + 10, offer.blurb, {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '11px',
          color: '#8a9aaa',
        })
        .setOrigin(0, 0.5);
      row.on('pointerover', () => row.setStrokeStyle(1, 0xc4a574));
      row.on('pointerout', () => row.setStrokeStyle(1, 0x4a5568));
      row.on('pointerup', () => {
        audioBus.uiClick();
        const result = gameState.shop.buy(
          offer.id,
          gameState.progression.classId,
        );
        if (!result.ok) {
          this.detail.setText(result.reason);
          this.goldText.setText(`Gold: ${gameState.shop.gold()}`);
          return;
        }
        gameState.persist();
        this.detail.setText(`Bought ${describeGear(result.gear)}`);
        this.refresh();
      });
      this.list.add([row, label, blurb]);
    });
  }
}
