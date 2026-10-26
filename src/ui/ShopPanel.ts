import Phaser from 'phaser';
import { audioBus } from '../core/AudioBus';
import { uiFont, uiPanelSize } from '../core/UiScale';
import { gearSellValue, stackSellValue } from '../systems/Economy';
import { describeGear } from '../systems/ItemGen';
import { getItemDef } from '../systems/InventorySystem';
import { gameState } from '../systems/GameState';

type ShopTab = 'buy' | 'sell';

/** Vendor trade UI — buy gear / sell bag items for gold. */
export class ShopPanel {
  readonly root: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly goldText: Phaser.GameObjects.Text;
  private readonly list: Phaser.GameObjects.Container;
  private readonly detail: Phaser.GameObjects.Text;
  private tab: ShopTab = 'buy';
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
      .text(0, 0, 'Buy gear or sell junk from your bag.', {
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
    const { w, h } = uiPanelSize(this.scene, 0.92, 0.82, 480, 520);
    this.bg.setSize(w, h);
    this.title.setPosition(0, -h / 2 + 26);
    this.title.setStyle({ fontSize: uiFont(this.scene, 22, 16, 26) });
    this.goldText.setPosition(0, -h / 2 + 52);
    this.list.setPosition(0, -h / 2 + 78);
    this.detail.setPosition(0, h / 2 - 70);
    this.detail.setWordWrapWidth(w - 40);
    const close = this.root.getData('close') as Phaser.GameObjects.Text;
    close.setPosition(0, h / 2 - 22);
    this.root.setPosition(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
    );
  }

  show(): void {
    this.tab = 'buy';
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
    const rowW = Math.min(400, this.bg.width - 48);

    const buyTab = this.makeTab(-70, 0, 'Buy', this.tab === 'buy', () => {
      this.tab = 'buy';
      this.refresh();
    });
    const sellTab = this.makeTab(70, 0, 'Sell', this.tab === 'sell', () => {
      this.tab = 'sell';
      this.refresh();
    });
    this.list.add([...buyTab, ...sellTab]);

    if (this.tab === 'buy') this.renderBuy(rowW);
    else this.renderSell(rowW);
  }

  private makeTab(
    x: number,
    y: number,
    label: string,
    active: boolean,
    onClick: () => void,
  ): Phaser.GameObjects.GameObject[] {
    const bg = this.scene.add
      .rectangle(x, y, 100, 28, active ? 0x3a3020 : 0x1a2230, 1)
      .setStrokeStyle(1, active ? 0xc4a574 : 0x4a5568)
      .setInteractive({ useHandCursor: true });
    const text = this.scene.add
      .text(x, y, label, {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '13px',
        color: active ? '#e8e4d8' : '#8a9aaa',
      })
      .setOrigin(0.5);
    bg.on('pointerup', () => {
      audioBus.uiClick();
      onClick();
    });
    return [bg, text];
  }

  private renderBuy(rowW: number): void {
    const offers = gameState.shop.listOffers();
    offers.forEach((offer, i) => {
      const y = 40 + i * 56;
      const row = this.scene.add
        .rectangle(0, y, rowW, 48, 0x1a2230, 1)
        .setStrokeStyle(1, 0x4a5568)
        .setInteractive({ useHandCursor: true });
      const label = this.scene.add
        .text(-rowW / 2 + 12, y - 8, `${offer.label}  ·  ${offer.price}g`, {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '14px',
          color: '#e8e4d8',
        })
        .setOrigin(0, 0.5);
      const blurb = this.scene.add
        .text(-rowW / 2 + 12, y + 10, offer.blurb, {
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

  private renderSell(rowW: number): void {
    const junkBtn = this.scene.add
      .text(0, 36, 'Sell all junk (common gear)', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '13px',
        color: '#0a0c10',
        backgroundColor: '#c4a574',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    junkBtn.on('pointerup', () => {
      audioBus.uiClick();
      const { count, gold } = gameState.shop.sellAllJunk();
      gameState.persist();
      this.detail.setText(
        count ? `Sold ${count} junk · +${gold}g` : 'No common gear in your bag',
      );
      this.refresh();
    });
    this.list.add(junkBtn);

    const slots = gameState.inventory.slots;
    const maxRows = 6;
    let shown = 0;
    for (let i = 0; i < slots.length && shown < maxRows; i++) {
      const slot = slots[i];
      let price = 0;
      let title: string;
      if (slot.kind === 'stack') {
        const unit = stackSellValue(slot.itemId);
        if (unit <= 0) continue;
        price = unit * slot.qty;
        title = `${getItemDef(slot.itemId)?.name ?? slot.itemId} ×${slot.qty}`;
      } else {
        price = gearSellValue(slot.item);
        title = `[${slot.item.rarity}] ${slot.item.name}`;
      }
      const y = 72 + shown * 48;
      shown += 1;
      const bagIndex = i;
      const row = this.scene.add
        .rectangle(0, y, rowW, 42, 0x1a2230, 1)
        .setStrokeStyle(1, 0x4a5568)
        .setInteractive({ useHandCursor: true });
      const label = this.scene.add
        .text(-rowW / 2 + 12, y, `${title}  ·  ${price}g`, {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '13px',
          color: '#e8e4d8',
        })
        .setOrigin(0, 0.5);
      row.on('pointerover', () => {
        row.setStrokeStyle(1, 0xc4a574);
        this.detail.setText(`Click to sell for ${price}g`);
      });
      row.on('pointerout', () => row.setStrokeStyle(1, 0x4a5568));
      row.on('pointerup', () => {
        audioBus.uiClick();
        const result = gameState.shop.sellBagIndex(bagIndex);
        if (!result.ok) {
          this.detail.setText(result.reason);
          return;
        }
        gameState.persist();
        this.detail.setText(`Sold ${result.label} · +${result.gold}g`);
        this.refresh();
      });
      this.list.add([row, label]);
    }
    if (shown === 0) {
      this.detail.setText('Nothing sellable in your bag right now.');
    }
  }
}
