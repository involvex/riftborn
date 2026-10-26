import Phaser from 'phaser';
import { audioBus } from '../core/AudioBus';
import {
  classLabel,
  describeGear,
  describeGearFull,
  resolveGearClass,
} from '../systems/ItemGen';
import { getItemDef } from '../systems/InventorySystem';
import { gameState } from '../systems/GameState';
import { addSlotIcon } from '../render/ItemIcons';
import type { EquipmentSlots, InventorySlot } from '../types/save';
import { uiFont, uiPanelSize } from '../core/UiScale';

type EqKey = keyof EquipmentSlots;

/**
 * Bag UI: equipment strip + grid.
 * Armor values only on hover / Character tab. Double-click to equip.
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
  private lastClickIndex: number | null = null;
  private lastClickAt = 0;
  private panelW = 800;
  private panelH = 560;
  open = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(10_025);
    this.bg = scene.add.rectangle(0, 0, 100, 100, 0x0e1218, 0.97);
    this.bg.setStrokeStyle(2, 0xc4a574, 0.8);
    this.title = scene.add
      .text(0, 0, 'Inventory', {
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        color: '#e8e4d8',
      })
      .setOrigin(0.5);
    this.detail = scene.add
      .text(0, 0, 'Double-click gear to equip · Hover for full stats', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '12px',
        color: '#8a9aaa',
        align: 'center',
      })
      .setOrigin(0.5, 0);
    this.eqRoot = scene.add.container(0, 0);
    this.gridRoot = scene.add.container(0, 0);
    const close = scene.add
      .text(0, 0, 'Close (I / Esc)', {
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
    const { w, h } = uiPanelSize(this.scene, 0.94, 0.88, 860, 620);
    this.panelW = w;
    this.panelH = h;
    this.bg.setSize(w, h);
    this.title.setPosition(0, -h / 2 + 22);
    this.title.setStyle({ fontSize: uiFont(this.scene, 22, 16, 26) });
    const close = this.root.getData('closeBtn') as Phaser.GameObjects.Text;
    close.setPosition(0, h / 2 - 18);
    this.detail.setPosition(0, h / 2 - 48);
    this.detail.setWordWrapWidth(w - 36);
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

    const w = this.panelW;
    const h = this.panelH;
    const pad = 18;
    const innerW = w - pad * 2;

    const eq = gameState.inventory.equipment;
    const slots: { key: EqKey; label: string }[] = [
      { key: 'weapon', label: 'WPN' },
      { key: 'hat', label: 'HAT' },
      { key: 'chest', label: 'CHT' },
      { key: 'legs', label: 'LEG' },
      { key: 'feet', label: 'FET' },
      { key: 'tool', label: 'TOOL' },
    ];
    const eqCols = 3;
    const eqGap = 8;
    const eqCellW = (innerW - eqGap * (eqCols - 1)) / eqCols;
    const eqCellH = 44;
    this.eqRoot.setPosition(-innerW / 2, -h / 2 + 48);

    slots.forEach((s, i) => {
      const col = i % eqCols;
      const row = Math.floor(i / eqCols);
      const x = col * (eqCellW + eqGap) + eqCellW / 2;
      const y = row * (eqCellH + eqGap) + eqCellH / 2;
      const cell = this.scene.add
        .rectangle(x, y, eqCellW, eqCellH, 0x1a2230, 1)
        .setStrokeStyle(1, 0x4a5568)
        .setInteractive({ useHandCursor: true });
      const iconSize = Math.min(36, eqCellH - 8);
      const iconX = x - eqCellW / 2 + 6;
      const iconY = y - iconSize / 2;
      const icons: Phaser.GameObjects.GameObject[] = [];
      if (s.key === 'tool' && eq.tool) {
        icons.push(
          ...addSlotIcon(this.scene, iconX, iconY, iconSize, {
            kind: 'stack',
            itemId: eq.tool,
          }),
        );
      } else if (s.key !== 'tool' && eq[s.key]) {
        icons.push(
          ...addSlotIcon(this.scene, iconX, iconY, iconSize, {
            kind: 'gear',
            item: eq[s.key]!,
          }),
        );
      }
      const label =
        s.key === 'tool'
          ? eq.tool
            ? (getItemDef(eq.tool)?.name ?? eq.tool)
            : '—'
          : (eq[s.key]?.name ?? '—');
      const short = label.length > 16 ? `${label.slice(0, 14)}…` : label;
      const text = this.scene.add
        .text(iconX + iconSize + 8, y, `${s.label}  ${short}`, {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '11px',
          color: '#e8e4d8',
        })
        .setOrigin(0, 0.5);
      cell.on('pointerup', () => this.onEquipClick(s.key));
      cell.on('pointerover', () => {
        if (s.key !== 'tool' && eq[s.key]) {
          this.detail.setText(describeGearFull(eq[s.key]!));
        } else if (s.key === 'tool' && eq.tool) {
          this.detail.setText(getItemDef(eq.tool)?.name ?? eq.tool);
        }
      });
      this.eqRoot.add([cell, ...icons, text]);
    });

    const eqBlockH = 2 * eqCellH + eqGap;
    const bagTop = -h / 2 + 48 + eqBlockH + 20;
    const bagBottom = h / 2 - 72;
    const bagH = Math.max(120, bagBottom - bagTop);

    const cols = gameState.inventory.bagCols;
    const rows = gameState.inventory.bagRows;
    const gap = 4;
    const cell = Math.max(
      28,
      Math.min(
        52,
        Math.floor((innerW - gap * (cols - 1)) / cols),
        Math.floor((bagH - 22 - gap * (rows - 1)) / rows),
      ),
    );
    const gridW = cols * cell + (cols - 1) * gap;
    this.gridRoot.setPosition(-gridW / 2, bagTop);

    const bagLabel = this.scene.add.text(
      0,
      0,
      `Bag  ${gameState.inventory.slots.length}/${gameState.inventory.capacity}   ·   Gold ${gameState.inventory.count('gold')}`,
      {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: '#c4a574',
      },
    );
    this.gridRoot.add(bagLabel);

    const playerClass = gameState.progression.classId;

    for (let i = 0; i < cols * rows; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * (cell + gap);
      const y = 22 + row * (cell + gap);
      const slot = gameState.inventory.slots[i] as InventorySlot | undefined;
      const rect = this.scene.add
        .rectangle(x + cell / 2, y + cell / 2, cell, cell, 0x16202c, 1)
        .setStrokeStyle(1, this.selectedIndex === i ? 0x6ec6ff : 0x3a4555)
        .setInteractive({ useHandCursor: true });

      const contents: Phaser.GameObjects.GameObject[] = [rect];
      if (slot) {
        if (slot.kind === 'stack') {
          contents.push(
            ...addSlotIcon(this.scene, x, y, cell, {
              kind: 'stack',
              itemId: slot.itemId,
            }),
          );
          const qty = this.scene.add
            .text(x + cell - 3, y + cell - 3, `x${slot.qty}`, {
              fontFamily: 'Consolas, monospace',
              fontSize: `${Math.max(9, Math.floor(cell * 0.22))}px`,
              color: '#e8e4d8',
              stroke: '#0a0c10',
              strokeThickness: 3,
            })
            .setOrigin(1, 1);
          contents.push(qty);
        } else {
          const req = resolveGearClass(slot.item);
          const usable = !req || req === playerClass;
          contents.push(
            ...addSlotIcon(this.scene, x, y, cell, {
              kind: 'gear',
              item: slot.item,
              dimmed: !usable,
            }),
          );
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
          const req = resolveGearClass(slot.item);
          const usable = !req || req === playerClass;
          const hint = usable
            ? 'Double-click to equip'
            : `${classLabel(req)} only`;
          this.detail.setText(`${describeGearFull(slot.item)}  — ${hint}`);
        }
      });

      this.gridRoot.add(contents);
    }
  }

  private onBagClick(index: number): void {
    const slot = gameState.inventory.slots[index];
    if (!slot) {
      this.selectedIndex = null;
      this.lastClickIndex = null;
      this.refresh();
      return;
    }

    const now = this.scene.time.now;
    const isDouble =
      this.lastClickIndex === index && now - this.lastClickAt < 380;
    this.lastClickIndex = index;
    this.lastClickAt = now;

    audioBus.uiClick();

    if (slot.kind === 'gear') {
      this.selectedIndex = index;
      if (!isDouble) {
        this.detail.setText(
          `${describeGear(slot.item)}  — double-click to equip`,
        );
        this.refresh();
        return;
      }
      this.tryEquipGear(slot.item.uid);
      return;
    }

    const def = getItemDef(slot.itemId);
    if (def?.kind === 'tool' && isDouble) {
      gameState.inventory.equipTool(slot.itemId);
      gameState.persist();
      this.detail.setText(`Equipped ${def.name}`);
      this.refresh();
      return;
    }
    this.selectedIndex = index;
    this.detail.setText(
      `${def?.name ?? slot.itemId} ×${slot.qty}` +
        (def?.kind === 'tool' ? '  — double-click to equip' : ''),
    );
    this.refresh();
  }

  private tryEquipGear(uid: string): void {
    const slot = gameState.inventory.slots.find(
      (s) => s.kind === 'gear' && s.item.uid === uid,
    );
    if (!slot || slot.kind !== 'gear') return;
    if (
      !gameState.inventory.canEquipGear(
        slot.item,
        gameState.progression.classId,
      )
    ) {
      this.detail.setText(
        `Requires ${classLabel(resolveGearClass(slot.item))} — cannot equip`,
      );
      this.refresh();
      return;
    }
    if (gameState.inventory.equipGear(uid, gameState.progression.classId)) {
      gameState.recalcMaxHp();
      gameState.persist();
      this.detail.setText(`Equipped ${slot.item.name}`);
    } else {
      this.detail.setText('Cannot equip (bag full when swapping?)');
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
