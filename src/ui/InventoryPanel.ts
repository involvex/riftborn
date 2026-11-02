import Phaser from 'phaser';
import { audioBus } from '../core/AudioBus';
import { classLabel, resolveGearClass } from '../systems/ItemGen';
import { gearSellValue, stackSellValue } from '../systems/Economy';
import {
  buildGearTooltipLines,
  type TooltipLine,
} from '../systems/GearCompare';
import { getItemDef } from '../systems/InventorySystem';
import { gameState } from '../systems/GameState';
import { addSlotIcon } from '../render/ItemIcons';
import type { EquipmentSlots, InventorySlot } from '../types/save';
import { uiFont, uiPanelSize } from '../core/UiScale';
import { settingsStore } from '../core/SettingsStore';
import type { GearInstance } from '../types/game';
import { attachOverlayDismiss, makePanelHitBlock } from './OverlayDismiss';
import type { OverlayDismissHandles } from './OverlayDismiss';

type EqKey = keyof EquipmentSlots;

const UI_FONT = 'Consolas, "Courier New", monospace';

/**
 * Bag UI: equipment strip + grid.
 * Hover shows multi-line tooltip with equip compare (green/red).
 */
export class InventoryPanel {
  readonly root: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private gridRoot: Phaser.GameObjects.Container;
  private eqRoot: Phaser.GameObjects.Container;
  private detailRoot: Phaser.GameObjects.Container;
  private title!: Phaser.GameObjects.Text;
  private bg!: Phaser.GameObjects.Rectangle;
  private selectedIndex: number | null = null;
  private lastClickIndex: number | null = null;
  private lastClickAt = 0;
  private panelW = 800;
  private panelH = 560;
  private dismiss!: OverlayDismissHandles;
  open = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(10_025);
    this.bg = scene.add.rectangle(0, 0, 100, 100, 0x0a0e14, 0.98);
    this.bg.setStrokeStyle(2, 0xd0b070, 0.95);
    makePanelHitBlock(this.bg);
    this.title = scene.add
      .text(0, 0, 'Inventory', {
        fontFamily: UI_FONT,
        fontSize: '22px',
        color: '#f2eee4',
        resolution: 2,
      })
      .setOrigin(0.5);
    this.detailRoot = scene.add.container(0, 0);
    this.eqRoot = scene.add.container(0, 0);
    this.gridRoot = scene.add.container(0, 0);
    const close = scene.add
      .text(0, 0, 'Close (I / Esc)', {
        fontFamily: UI_FONT,
        fontSize: '13px',
        color: '#c8d0da',
        resolution: 2,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    close.on('pointerup', () => this.hide());

    this.root.add([
      this.bg,
      this.title,
      this.eqRoot,
      this.gridRoot,
      this.detailRoot,
      close,
    ]);
    this.root.setData('closeBtn', close);
    this.dismiss = attachOverlayDismiss(scene, this.root, () => this.hide());
    this.root.setVisible(false);
    this.setDetailPlain('Double-click gear to equip · Hover for compare');
    this.layout();
  }

  layout(): void {
    const { w, h } = uiPanelSize(this.scene, 0.94, 0.88, 860, 620);
    this.panelW = w;
    this.panelH = h;
    this.bg.setSize(w, h);
    this.title.setPosition(0, -h / 2 + 26);
    this.title.setStyle({ fontSize: uiFont(this.scene, 22, 16, 26) });
    const close = this.root.getData('closeBtn') as Phaser.GameObjects.Text;
    close.setPosition(0, h / 2 - 16);
    this.detailRoot.setPosition(0, h / 2 - 110);
    this.dismiss.layout(w, h);
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

  private setDetailPlain(text: string, color = '#a8b4c0'): void {
    this.setDetailLines([{ text, color }]);
  }

  private setDetailLines(lines: TooltipLine[]): void {
    this.detailRoot.removeAll(true);
    const maxW = this.panelW - 48;
    let y = 0;
    for (const line of lines) {
      const t = this.scene.add
        .text(0, y, line.text, {
          fontFamily: UI_FONT,
          fontSize: '12px',
          color: line.color,
          align: 'center',
          resolution: 2,
          wordWrap: { width: maxW },
        })
        .setOrigin(0.5, 0);
      this.detailRoot.add(t);
      y += t.height + 2;
    }
  }

  private showGearTooltip(item: GearInstance, hint: string): void {
    const slot = item.slot;
    const equipped =
      slot === 'weapon' ||
      slot === 'hat' ||
      slot === 'chest' ||
      slot === 'legs' ||
      slot === 'feet'
        ? gameState.inventory.equipment[slot]
        : null;
    this.setDetailLines(
      buildGearTooltipLines(item, equipped, {
        sellGold: gearSellValue(item),
        hint,
      }),
    );
  }

  refresh(): void {
    this.eqRoot.removeAll(true);
    this.gridRoot.removeAll(true);

    const w = this.panelW;
    const h = this.panelH;
    const pad = 22;
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
    const eqGap = 10;
    const eqCellW = (innerW - eqGap * (eqCols - 1)) / eqCols;
    const eqCellH = 48;
    this.eqRoot.setPosition(-innerW / 2, -h / 2 + 54);

    slots.forEach((s, i) => {
      const col = i % eqCols;
      const row = Math.floor(i / eqCols);
      const x = col * (eqCellW + eqGap) + eqCellW / 2;
      const y = row * (eqCellH + eqGap) + eqCellH / 2;
      const cell = this.scene.add
        .rectangle(x, y, eqCellW, eqCellH, 0x141c28, 1)
        .setStrokeStyle(1, 0x5a6a80)
        .setInteractive({ useHandCursor: true });
      const iconSize = Math.min(36, eqCellH - 8);
      const iconX = x - eqCellW / 2 + 8;
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
          fontFamily: UI_FONT,
          fontSize: '12px',
          color: '#f0ebe3',
          resolution: 2,
        })
        .setOrigin(0, 0.5);
      cell.on('pointerup', () => this.onEquipClick(s.key));
      cell.on('pointerover', () => {
        if (s.key !== 'tool' && eq[s.key]) {
          this.showGearTooltip(eq[s.key]!, 'Currently equipped');
        } else if (s.key === 'tool' && eq.tool) {
          this.setDetailPlain(getItemDef(eq.tool)?.name ?? eq.tool);
        }
      });
      this.eqRoot.add([cell, ...icons, text]);
    });

    const eqBlockH = 2 * eqCellH + eqGap;
    const bagTop = -h / 2 + 54 + eqBlockH + 24;
    const bagBottom = h / 2 - 120;
    const bagH = Math.max(120, bagBottom - bagTop);

    const cols = gameState.inventory.bagCols;
    const rows = gameState.inventory.bagRows;
    const gap = 6;
    const cell = Math.max(
      28,
      Math.min(
        52,
        Math.floor((innerW - gap * (cols - 1)) / cols),
        Math.floor((bagH - 26 - gap * (rows - 1)) / rows),
      ),
    );
    const gridW = cols * cell + (cols - 1) * gap;
    this.gridRoot.setPosition(-gridW / 2, bagTop);

    const bagLabel = this.scene.add.text(
      0,
      0,
      `Bag  ${gameState.inventory.slots.length}/${gameState.inventory.capacity}   ·   Gold ${gameState.inventory.count('gold')}`,
      {
        fontFamily: UI_FONT,
        fontSize: '14px',
        color: '#e0c890',
        resolution: 2,
      },
    );
    const sortBtn = this.scene.add
      .text(gridW, 2, 'Sort', {
        fontFamily: UI_FONT,
        fontSize: '12px',
        color: '#0a0c10',
        backgroundColor: '#d0b070',
        padding: { x: 8, y: 3 },
        resolution: 2,
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    sortBtn.on('pointerup', () => {
      audioBus.uiClick();
      gameState.inventory.sortBag();
      gameState.persist();
      this.setDetailPlain('Bag sorted · gear by rarity, then materials');
      this.refresh();
    });
    const junkHint = settingsStore.get().autoSellJunk
      ? '  ·  Auto-sell junk ON'
      : '';
    const hint = this.scene.add.text(0, 18, junkHint, {
      fontFamily: UI_FONT,
      fontSize: '11px',
      color: '#8a9aaa',
      resolution: 2,
    });
    this.gridRoot.add([bagLabel, sortBtn, hint]);

    const playerClass = gameState.progression.classId;

    for (let i = 0; i < cols * rows; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * (cell + gap);
      const y = 30 + row * (cell + gap);
      const slot = gameState.inventory.slots[i] as InventorySlot | undefined;
      const rect = this.scene.add
        .rectangle(x + cell / 2, y + cell / 2, cell, cell, 0x121820, 1)
        .setStrokeStyle(1, this.selectedIndex === i ? 0x7ed0ff : 0x4a5568)
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
              fontFamily: UI_FONT,
              fontSize: `${Math.max(9, Math.floor(cell * 0.22))}px`,
              color: '#f0ebe3',
              stroke: '#0a0c10',
              strokeThickness: 3,
              resolution: 2,
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
          this.setDetailPlain('Empty slot');
          return;
        }
        if (slot.kind === 'stack') {
          const def = getItemDef(slot.itemId);
          const unit = stackSellValue(slot.itemId);
          const sell =
            unit > 0 ? `  ·  sell ${unit * slot.qty}g` : '  ·  not sellable';
          this.setDetailPlain(
            `${def?.name ?? slot.itemId}  ×${slot.qty}${sell}`,
            '#e8e4d8',
          );
        } else {
          const req = resolveGearClass(slot.item);
          const usable = !req || req === playerClass;
          const tip = usable
            ? 'Double-click to equip'
            : `${classLabel(req)} only`;
          this.showGearTooltip(slot.item, tip);
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
        this.showGearTooltip(slot.item, 'Double-click to equip');
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
      this.setDetailPlain(`Equipped ${def.name}`, '#6ecf7a');
      this.refresh();
      return;
    }
    this.selectedIndex = index;
    this.setDetailPlain(
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
      this.setDetailPlain(
        `Requires ${classLabel(resolveGearClass(slot.item))} — cannot equip`,
        '#e07070',
      );
      this.refresh();
      return;
    }
    if (gameState.inventory.equipGear(uid, gameState.progression.classId)) {
      gameState.recalcMaxHp();
      gameState.persist();
      this.setDetailPlain(`Equipped ${slot.item.name}`, '#6ecf7a');
    } else {
      this.setDetailPlain('Cannot equip (bag full when swapping?)', '#e07070');
    }
    this.refresh();
  }

  private onEquipClick(key: EqKey): void {
    audioBus.uiClick();
    if (key === 'tool') {
      if (!gameState.inventory.equipment.tool) return;
      if (!gameState.inventory.canAdd(gameState.inventory.equipment.tool, 1)) {
        this.setDetailPlain('Bag full', '#e07070');
        return;
      }
      const id = gameState.inventory.equipment.tool;
      gameState.inventory.equipment.tool = null;
      gameState.inventory.add(id, 1);
      gameState.persist();
      this.setDetailPlain('Unequipped tool');
      this.refresh();
      return;
    }
    if (gameState.inventory.unequipGear(key)) {
      gameState.recalcMaxHp();
      gameState.persist();
      this.setDetailPlain('Unequipped');
      this.refresh();
    } else {
      this.setDetailPlain('Cannot unequip (bag full)', '#e07070');
    }
  }
}
