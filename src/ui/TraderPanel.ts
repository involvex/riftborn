import Phaser from 'phaser';
import { audioBus } from '../core/AudioBus';
import { uiFont, uiPanelSize } from '../core/UiScale';
import { getItemDef } from '../systems/InventorySystem';
import { gameState } from '../systems/GameState';

type TraderTab = 'supplies' | 'mats' | 'repair';

/** Nix — buy supplies, sell materials, patch wounds. */
export class TraderPanel {
  readonly root: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly goldText: Phaser.GameObjects.Text;
  private readonly list: Phaser.GameObjects.Container;
  private readonly detail: Phaser.GameObjects.Text;
  private tab: TraderTab = 'supplies';
  open = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(10_031);
    this.bg = scene.add.rectangle(0, 0, 420, 440, 0x0e1218, 0.97);
    this.bg.setStrokeStyle(2, 0x8ab4d4, 0.85);
    this.title = scene.add
      .text(0, 0, 'Nix — Scrapper', {
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
      .text(0, 0, 'Mats, tonics, and a town patch-up.', {
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
    const { w, h } = uiPanelSize(this.scene, 0.92, 0.82, 480, 540);
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
    this.tab = 'supplies';
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
    this.goldText.setText(`Gold: ${gameState.trader.gold()}`);
    const rowW = Math.min(400, this.bg.width - 48);

    const tabs: { id: TraderTab; label: string; x: number }[] = [
      { id: 'supplies', label: 'Buy', x: -110 },
      { id: 'mats', label: 'Sell mats', x: 0 },
      { id: 'repair', label: 'Repair', x: 110 },
    ];
    for (const t of tabs) {
      this.list.add([
        ...this.makeTab(t.x, 0, t.label, this.tab === t.id, () => {
          this.tab = t.id;
          this.refresh();
        }),
      ]);
    }

    if (this.tab === 'supplies') this.renderSupplies(rowW);
    else if (this.tab === 'mats') this.renderMats(rowW);
    else this.renderRepair(rowW);
  }

  private makeTab(
    x: number,
    y: number,
    label: string,
    active: boolean,
    onClick: () => void,
  ): Phaser.GameObjects.GameObject[] {
    const bg = this.scene.add
      .rectangle(x, y, 100, 28, active ? 0x2a4050 : 0x1a2230, 1)
      .setStrokeStyle(1, active ? 0x8ab4d4 : 0x3a4555)
      .setInteractive({ useHandCursor: true });
    bg.on('pointerup', () => {
      audioBus.uiClick();
      onClick();
    });
    const text = this.scene.add
      .text(x, y, label, {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '12px',
        color: active ? '#e8e4d8' : '#8a9aaa',
      })
      .setOrigin(0.5);
    return [bg, text];
  }

  private renderSupplies(rowW: number): void {
    this.detail.setText('Bundles go to your bag · tonics apply instantly.');
    const offers = gameState.trader.listSupplies();
    offers.forEach((offer, i) => {
      const y = 40 + i * 44;
      const row = this.scene.add
        .rectangle(0, y, rowW, 38, 0x1a2230, 1)
        .setStrokeStyle(1, 0x4a5568)
        .setInteractive({ useHandCursor: true });
      const label = this.scene.add
        .text(-rowW / 2 + 12, y, `${offer.label}  ·  ${offer.price}g`, {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '13px',
          color: '#e8e4d8',
        })
        .setOrigin(0, 0.5);
      row.on('pointerover', () => this.detail.setText(offer.blurb));
      row.on('pointerup', () => {
        audioBus.uiClick();
        const result = gameState.trader.buySupply(offer.id, {
          hp: gameState.hp,
          maxHp: gameState.maxHp,
          setHp: (n) => {
            gameState.hp = n;
          },
          skills: gameState.skills,
        });
        if (!result.ok) {
          this.detail.setText(result.reason);
          return;
        }
        gameState.persist();
        this.detail.setText(result.message);
        this.refresh();
      });
      this.list.add([row, label]);
    });
  }

  private renderMats(rowW: number): void {
    this.detail.setText(
      'Nix pays 1.4× Mira’s mat prices. Gear stays with Mira.',
    );
    const slots = gameState.inventory.slots;
    let shown = 0;
    for (let i = 0; i < slots.length && shown < 7; i++) {
      const slot = slots[i];
      if (slot.kind !== 'stack') continue;
      const unit = gameState.trader.matBuyPrice(slot.itemId);
      if (unit <= 0) continue;
      const name = getItemDef(slot.itemId)?.name ?? slot.itemId;
      const price = unit * slot.qty;
      const y = 40 + shown * 44;
      shown += 1;
      const itemId = slot.itemId;
      const qty = slot.qty;
      const row = this.scene.add
        .rectangle(0, y, rowW, 38, 0x1a2230, 1)
        .setStrokeStyle(1, 0x4a5568)
        .setInteractive({ useHandCursor: true });
      const label = this.scene.add
        .text(-rowW / 2 + 12, y, `${name} ×${qty}  ·  ${price}g`, {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '13px',
          color: '#e8e4d8',
        })
        .setOrigin(0, 0.5);
      row.on('pointerup', () => {
        audioBus.uiClick();
        const result = gameState.trader.sellMaterial(itemId, qty);
        if (!result.ok) {
          this.detail.setText(result.reason);
          return;
        }
        gameState.persist();
        this.detail.setText(`Sold · +${result.gold}g`);
        this.refresh();
      });
      this.list.add([row, label]);
    }
    if (shown === 0) {
      const empty = this.scene.add
        .text(0, 80, 'No materials in bag', {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '14px',
          color: '#6a8090',
        })
        .setOrigin(0.5);
      this.list.add(empty);
    }
  }

  private renderRepair(rowW: number): void {
    const cost = gameState.trader.patchCost(gameState.hp, gameState.maxHp);
    const missing = Math.max(0, gameState.maxHp - gameState.hp);
    this.detail.setText(
      missing <= 0
        ? 'You’re already at full health.'
        : `Missing ${missing} HP · town patch-up (no durability yet).`,
    );
    const y = 70;
    const row = this.scene.add
      .rectangle(0, y, rowW, 52, 0x1a2230, 1)
      .setStrokeStyle(1, cost > 0 ? 0x8ab4d4 : 0x3a4555)
      .setInteractive({ useHandCursor: true });
    const label = this.scene.add
      .text(0, y, cost > 0 ? `Patch wounds — ${cost}g` : 'Already patched up', {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        color: cost > 0 ? '#e8e4d8' : '#6a8090',
      })
      .setOrigin(0.5);
    row.on('pointerup', () => {
      if (cost <= 0) return;
      audioBus.uiClick();
      const result = gameState.trader.patchWounds(
        gameState.hp,
        gameState.maxHp,
        (n) => {
          gameState.hp = n;
        },
      );
      if (!result.ok) {
        this.detail.setText(result.reason);
        return;
      }
      gameState.persist();
      audioBus.loot('magic');
      this.detail.setText(`Patched up · −${result.gold}g`);
      this.refresh();
    });
    this.list.add([row, label]);
  }
}
