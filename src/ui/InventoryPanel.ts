import Phaser from 'phaser';
import { audioBus } from '../core/AudioBus';
import { describeGear } from '../systems/ItemGen';
import { getItemDef } from '../systems/InventorySystem';
import { gameState } from '../systems/GameState';
import type { EquipmentSlots, InventorySlot } from '../types/save';
import { uiFont, uiPanelSize } from '../core/UiScale';

type EqKey = keyof EquipmentSlots;

/**
 * Large bag UI: equipment column + 8×6 bag grid.
 */
export class InventoryPanel {
  readonly root: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private gridRoot: Phaser.GameObjects.Container;
  private eqRoot: Phaser.GameObjects.Container;
  private detail!: Phaser.GameObjects.Text;
  private title!: Phaser.GameObjects.Text;
  private bg!: Phaser.GameObjects.Rectangle;
  private selectedIndex: number | null = null;
  open = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(10_025);
    this.bg = scene.add.rectangle(0, 0, 100, 100, 0x0e1218, 0.97);
    this.bg.setStrokeStyle(2, 0xc4a574, 0.8);
    this.title = scene.add
      .text(0, 0, 'Inventory', {
        fontFamily: 'Georgia, serif',
        fontSize: '24px',
        color: '#e8e4d8',
      })
      .setOrigin(0.5);
    this.detail = scene.add
      .text(0, 0, 'Click gear to equip · Click equipped to unequip', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '13px',
        color: '#8a9aaa',
        wordWrap: { width: 520 },
      })
      .setOrigin(0.5, 0);
    this.eqRoot = scene.add.container(0, 0);
    this.gridRoot = scene.add.container(0, 0);
    const close = scene.add
      .text(0, 0, 'Close (I / Esc)', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '14px',
        color: '#8a9aaa',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    close.on('pointerup', () => this.hide());

    this.root.add([
      this.bg,
      this.title,
      this.eqRoot,
      this.gridRoot,
      this.detail,
      close,
    ]);
    this.root.setData('closeBtn', close);
    this.root.setVisible(false);
    this.layout();
  }

  layout(): void {
    const { w, h } = uiPanelSize(this.scene, 0.86, 0.82, 980, 640);
    this.bg.setSize(w, h);
    this.title.setPosition(0, -h / 2 + 28);
    this.title.setStyle({ fontSize: uiFont(this.scene, 26, 18, 32) });
    const close = this.root.getData('closeBtn') as Phaser.GameObjects.Text;
    close.setPosition(0, h / 2 - 22);
    this.detail.setPosition(0, h / 2 - 56);
    this.detail.setWordWrapWidth(w - 48);
    this.eqRoot.setPosition(-w / 2 + 130, -20);
    this.gridRoot.setPosition(-40, -h / 2 + 70);
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
    this.selectedIndex = null;
  }

  toggle(): void {
    if (this.open) this.hide();
    else this.show();
  }

  refresh(): void {
    this.eqRoot.removeAll(true);
    this.gridRoot.removeAll(true);

    const eq = gameState.inventory.equipment;
    const slots: { key: EqKey; label: string }[] = [
      { key: 'weapon', label: 'Weapon' },
      { key: 'hat', label: 'Hat' },
      { key: 'chest', label: 'Chest' },
      { key: 'legs', label: 'Legs' },
      { key: 'feet', label: 'Feet' },
      { key: 'tool', label: 'Tool' },
    ];

    slots.forEach((s, i) => {
      const y = -150 + i * 58;
      const cell = this.scene.add
        .rectangle(0, y, 200, 50, 0x1a2230, 1)
        .setStrokeStyle(1, 0x4a5568)
        .setInteractive({ useHandCursor: true });
      const label =
        s.key === 'tool'
          ? eq.tool
            ? (getItemDef(eq.tool)?.name ?? eq.tool)
            : '—'
          : (eq[s.key]?.name ?? '—');
      const text = this.scene.add
        .text(-90, y, `${s.label}\n${label}`, {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '12px',
          color: '#e8e4d8',
          lineSpacing: 2,
        })
        .setOrigin(0, 0.5);
      cell.on('pointerup', () => this.onEquipClick(s.key));
      cell.on('pointerover', () => {
        if (s.key !== 'tool' && eq[s.key]) {
          this.detail.setText(describeGear(eq[s.key]!));
        } else if (s.key === 'tool' && eq.tool) {
          this.detail.setText(getItemDef(eq.tool)?.name ?? eq.tool);
        }
      });
      this.eqRoot.add([cell, text]);
    });

    const cols = gameState.inventory.bagCols;
    const rows = gameState.inventory.bagRows;
    const cell = 58;
    const gap = 6;
    const bagLabel = this.scene.add.text(
      0,
      -28,
      `Bag  (${gameState.inventory.slots.length}/${gameState.inventory.capacity})`,
      {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        color: '#c4a574',
      },
    );
    this.gridRoot.add(bagLabel);

    for (let i = 0; i < cols * rows; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * (cell + gap);
      const y = row * (cell + gap);
      const slot = gameState.inventory.slots[i] as InventorySlot | undefined;
      const rect = this.scene.add
        .rectangle(x + cell / 2, y + cell / 2, cell, cell, 0x16202c, 1)
        .setStrokeStyle(1, this.selectedIndex === i ? 0x6ec6ff : 0x3a4555)
        .setInteractive({ useHandCursor: true });

      const contents: Phaser.GameObjects.GameObject[] = [rect];
      if (slot) {
        if (slot.kind === 'stack') {
          const def = getItemDef(slot.itemId);
          const color = Phaser.Display.Color.HexStringToColor(
            def?.color ?? '#888888',
          ).color;
          const gem = this.scene.add.circle(
            x + cell / 2,
            y + cell / 2 - 4,
            10,
            color,
          );
          const qty = this.scene.add
            .text(x + cell - 4, y + cell - 4, `x${slot.qty}`, {
              fontFamily: 'Consolas, monospace',
              fontSize: '11px',
              color: '#e8e4d8',
            })
            .setOrigin(1, 1);
          contents.push(gem, qty);
        } else {
          const rarityColor =
            slot.item.rarity === 'legendary'
              ? 0xffb74d
              : slot.item.rarity === 'rare'
                ? 0x4db6ff
                : slot.item.rarity === 'magic'
                  ? 0x81c784
                  : 0xb0bec5;
          const gem = this.scene.add
            .rectangle(x + cell / 2, y + cell / 2 - 2, 22, 22, rarityColor, 0.9)
            .setStrokeStyle(1, 0xffffff, 0.35);
          const tag = this.scene.add
            .text(
              x + cell / 2,
              y + cell - 10,
              slot.item.slot.slice(0, 3).toUpperCase(),
              {
                fontFamily: 'Segoe UI, sans-serif',
                fontSize: '10px',
                color: '#e8e4d8',
              },
            )
            .setOrigin(0.5, 1);
          contents.push(gem, tag);
        }
      }

      rect.on('pointerup', () => this.onBagClick(i));
      rect.on('pointerover', () => {
        if (!slot) {
          this.detail.setText('Empty slot');
          return;
        }
        if (slot.kind === 'stack') {
          const def = getItemDef(slot.itemId);
          this.detail.setText(`${def?.name ?? slot.itemId}  ×${slot.qty}`);
        } else {
          this.detail.setText(`${describeGear(slot.item)}  — click to equip`);
        }
      });

      this.gridRoot.add(contents);
    }
  }

  private onBagClick(index: number): void {
    const slot = gameState.inventory.slots[index];
    if (!slot) {
      this.selectedIndex = null;
      this.refresh();
      return;
    }
    audioBus.uiClick();
    if (slot.kind === 'gear') {
      if (gameState.inventory.equipGear(slot.item.uid)) {
        gameState.recalcMaxHp();
        gameState.persist();
        this.detail.setText(`Equipped ${slot.item.name}`);
      } else {
        this.detail.setText('Cannot equip (bag full when swapping?)');
      }
    } else {
      const def = getItemDef(slot.itemId);
      if (def?.kind === 'tool') {
        gameState.inventory.equipTool(slot.itemId);
        gameState.persist();
        this.detail.setText(`Equipped ${def.name}`);
      } else {
        this.selectedIndex = index;
        this.detail.setText(`${def?.name ?? slot.itemId} ×${slot.qty}`);
      }
    }
    this.refresh();
  }

  private onEquipClick(key: EqKey): void {
    audioBus.uiClick();
    if (key === 'tool') {
      if (!gameState.inventory.equipment.tool) return;
      if (!gameState.inventory.canAdd(gameState.inventory.equipment.tool, 1)) {
        this.detail.setText('Bag full');
        return;
      }
      const id = gameState.inventory.equipment.tool;
      gameState.inventory.equipment.tool = null;
      gameState.inventory.add(id, 1);
      gameState.persist();
      this.detail.setText('Unequipped tool');
      this.refresh();
      return;
    }
    if (gameState.inventory.unequipGear(key)) {
      gameState.recalcMaxHp();
      gameState.persist();
      this.detail.setText('Unequipped');
      this.refresh();
    } else {
      this.detail.setText('Cannot unequip (bag full)');
    }
  }
}
