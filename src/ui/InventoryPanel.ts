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
import { uiFont } from '../core/UiScale';
import { settingsStore } from '../core/SettingsStore';
import type { GearInstance } from '../types/game';
import {
  attachOverlayDismiss,
  makePanelHitBlock,
  type OverlayDismissHandles,
} from './OverlayDismiss';
import { shouldShowTouchControls } from './TouchControls';
import {
  computeInventoryLayout,
  inventoryPanelFromViewport,
  type InventoryLayout,
} from './InventoryLayout';

type EqKey = keyof EquipmentSlots;

const UI_FONT = 'Consolas, "Courier New", monospace';

/**
 * Bag UI: equipment + grid + detail band via computeInventoryLayout
 * (no overlap; short panels put detail beside the bag).
 */
export class InventoryPanel {
  readonly root: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private gridRoot: Phaser.GameObjects.Container;
  private bagCellsRoot: Phaser.GameObjects.Container;
  private eqRoot: Phaser.GameObjects.Container;
  private detailRoot: Phaser.GameObjects.Container;
  private hintRoot: Phaser.GameObjects.Container;
  private detailBg!: Phaser.GameObjects.Rectangle;
  private title!: Phaser.GameObjects.Text;
  private bg!: Phaser.GameObjects.Rectangle;
  private closeBtn!: Phaser.GameObjects.Text;
  private selectedIndex: number | null = null;
  private lastClickIndex: number | null = null;
  private lastClickAt = 0;
  private panelW = 800;
  private panelH = 560;
  private dismiss!: OverlayDismissHandles;
  private lastLayout: InventoryLayout | null = null;
  /** Pixel scroll into the bag grid (scrollable layouts only). */
  private bagScrollY = 0;
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
    this.detailBg = scene.add.rectangle(0, 0, 100, 72, 0x121820, 0.95);
    this.detailBg.setStrokeStyle(1, 0x3a4a5a, 0.8);
    this.detailRoot = scene.add.container(0, 0);
    this.hintRoot = scene.add.container(0, 0);
    this.eqRoot = scene.add.container(0, 0);
    this.gridRoot = scene.add.container(0, 0);
    this.bagCellsRoot = scene.add.container(0, 0);
    this.closeBtn = scene.add
      .text(0, 0, 'Close (I / Esc)', {
        fontFamily: UI_FONT,
        fontSize: '13px',
        color: '#c8d0da',
        resolution: 2,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.closeBtn.on('pointerup', () => this.hide());

    this.root.add([
      this.bg,
      this.title,
      this.eqRoot,
      this.hintRoot,
      this.gridRoot,
      this.detailBg,
      this.detailRoot,
      this.closeBtn,
    ]);
    this.dismiss = attachOverlayDismiss(scene, this.root, () => this.hide());
    this.root.setVisible(false);
    this.setDetailPlain('Tap gear for stats · Double-tap to equip');
    this.layout();
  }

  /** Panel-local top-left → root-local (origin at panel center). */
  private local(x: number, y: number): { x: number; y: number } {
    return { x: x - this.panelW / 2, y: y - this.panelH / 2 };
  }

  private computeLayout(): InventoryLayout {
    const touch = shouldShowTouchControls();
    const { panelW, panelH } = inventoryPanelFromViewport(
      this.scene.scale.width,
      this.scene.scale.height,
      touch,
    );
    return computeInventoryLayout({
      panelW,
      panelH,
      touch,
      bagCols: gameState.inventory.bagCols,
      bagRows: gameState.inventory.bagRows,
      showCloseX: true,
    });
  }

  layout(): void {
    const layout = this.computeLayout();
    this.lastLayout = layout;
    this.panelW = layout.panel.w;
    this.panelH = layout.panel.h;
    const w = this.panelW;
    const h = this.panelH;

    this.bg.setSize(w, h);
    const titlePos = this.local(
      layout.title.x + layout.title.w / 2,
      layout.title.y + layout.title.h / 2,
    );
    this.title.setPosition(titlePos.x, titlePos.y);
    this.title.setStyle({ fontSize: uiFont(this.scene, 22, 16, 26) });

    this.closeBtn.setVisible(layout.showCloseText);
    if (layout.close) {
      const c = this.local(
        layout.close.x + layout.close.w / 2,
        layout.close.y + layout.close.h / 2,
      );
      this.closeBtn.setPosition(c.x, c.y);
      this.closeBtn.setFontSize(shouldShowTouchControls() ? '14px' : '13px');
    }

    const d = layout.detail;
    const dPos = this.local(d.x + d.w / 2, d.y + d.h / 2);
    this.detailBg.setSize(d.w, d.h);
    this.detailBg.setPosition(dPos.x, dPos.y);
    // Detail text starts near top of detail band.
    const textPos = this.local(d.x + d.w / 2, d.y + 8);
    this.detailRoot.setPosition(textPos.x, textPos.y);

    this.dismiss.layout(w, h);
    this.root.setPosition(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
    );
  }

  show(): void {
    this.bagScrollY = 0;
    this.layout();
    this.refresh();
    this.root.setVisible(true);
    this.open = true;
    this.bindWheel();
  }

  hide(): void {
    this.root.setVisible(false);
    this.open = false;
    this.selectedIndex = null;
    this.unbindWheel();
  }

  toggle(): void {
    if (this.open) this.hide();
    else this.show();
  }

  private bindWheel(): void {
    this.unbindWheel();
    this.scene.input.on('wheel', this.onWheel, this);
  }

  private unbindWheel(): void {
    this.scene.input.off('wheel', this.onWheel, this);
  }

  private onWheel(
    _pointer: Phaser.Input.Pointer,
    _over: Phaser.GameObjects.GameObject[],
    _dx: number,
    dy: number,
  ): void {
    if (!this.open || !this.lastLayout?.scrollable) return;
    const next = Phaser.Math.Clamp(
      this.bagScrollY + dy * 0.35,
      0,
      this.maxBagScroll(),
    );
    if (Math.abs(next - this.bagScrollY) < 0.5) return;
    this.bagScrollY = next;
    this.refresh();
  }

  private maxBagScroll(): number {
    const layout = this.lastLayout;
    if (!layout) return 0;
    const rows = gameState.inventory.bagRows;
    const pitch = layout.cellSize + layout.bagGap;
    const contentH = rows * pitch - layout.bagGap;
    return Math.max(0, contentH - layout.bagGrid.h);
  }

  private setDetailPlain(text: string, color = '#a8b4c0'): void {
    this.setDetailLines([{ text, color }]);
  }

  private setDetailLines(lines: TooltipLine[]): void {
    this.detailRoot.removeAll(true);
    const layout = this.lastLayout;
    const maxW = layout ? Math.max(40, layout.detail.w - 16) : this.panelW - 56;
    const maxH = layout ? Math.max(24, layout.detail.h - 12) : 72;
    const touch = shouldShowTouchControls();
    let y = 0;
    const maxLines = layout?.detailBeside ? (touch ? 8 : 10) : touch ? 4 : 6;
    for (const line of lines.slice(0, maxLines)) {
      if (y >= maxH) break;
      const t = this.scene.add
        .text(0, y, line.text, {
          fontFamily: UI_FONT,
          fontSize: touch ? '11px' : '12px',
          color: line.color,
          align: layout?.detailBeside ? 'left' : 'center',
          resolution: 2,
          wordWrap: { width: maxW },
        })
        .setOrigin(layout?.detailBeside ? 0 : 0.5, 0);
      if (layout?.detailBeside) {
        t.setX(-maxW / 2);
      }
      // Clip lines that would spill past the detail box.
      if (y + t.height > maxH) {
        t.setCrop(0, 0, t.width, Math.max(0, maxH - y));
      }
      this.detailRoot.add(t);
      y += t.height + 1;
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

  /** Fit name to equipment card width via word-wrap (no early char cut). */
  private fitEqName(
    name: string,
    maxPx: number,
    fontSize: string,
  ): Phaser.GameObjects.Text {
    return this.scene.add
      .text(0, 0, name, {
        fontFamily: UI_FONT,
        fontSize,
        color: '#f0ebe3',
        resolution: 2,
        wordWrap: { width: maxPx },
      })
      .setOrigin(0, 0.5);
  }

  refresh(): void {
    this.eqRoot.removeAll(true);
    this.gridRoot.removeAll(true);
    this.hintRoot.removeAll(true);
    this.bagCellsRoot = this.scene.add.container(0, 0);

    const touch = shouldShowTouchControls();
    const layout = this.lastLayout ?? this.computeLayout();
    this.lastLayout = layout;
    const eq = gameState.inventory.equipment;
    const slots: { key: EqKey; label: string }[] = [
      { key: 'weapon', label: 'WPN' },
      { key: 'hat', label: 'HAT' },
      { key: 'chest', label: 'CHT' },
      { key: 'legs', label: 'LEG' },
      { key: 'feet', label: 'FET' },
      { key: 'tool', label: 'TOOL' },
    ];

    const eqOrigin = this.local(layout.equipment.x, layout.equipment.y);
    this.eqRoot.setPosition(eqOrigin.x, eqOrigin.y);
    const eqCellW =
      (layout.equipment.w - layout.eqGap * (layout.eqCols - 1)) / layout.eqCols;
    const eqCellH = layout.eqCellH;

    slots.forEach((s, i) => {
      const col = i % layout.eqCols;
      const row = Math.floor(i / layout.eqCols);
      const x = col * (eqCellW + layout.eqGap) + eqCellW / 2;
      const y = row * (eqCellH + layout.eqGap) + eqCellH / 2;
      const cell = this.scene.add
        .rectangle(x, y, eqCellW, eqCellH, 0x141c28, 1)
        .setStrokeStyle(1, 0x5a6a80)
        .setInteractive({ useHandCursor: true });
      const iconSize = Math.min(touch ? 28 : 36, eqCellH - 8);
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
      const fullName =
        s.key === 'tool'
          ? eq.tool
            ? (getItemDef(eq.tool)?.name ?? eq.tool)
            : '—'
          : (eq[s.key]?.name ?? '—');
      const nameMaxPx = Math.min(
        layout.eqNameMaxPx,
        Math.floor(eqCellW - iconSize - 14),
      );
      const text = this.scene.add
        .text(iconX + iconSize + 6, y - 6, s.label, {
          fontFamily: UI_FONT,
          fontSize: touch ? '9px' : '10px',
          color: '#8a9aaa',
          resolution: 2,
        })
        .setOrigin(0, 0.5);
      const nameTxt = this.fitEqName(
        fullName,
        nameMaxPx,
        touch ? '10px' : '12px',
      );
      nameTxt.setPosition(iconX + iconSize + 6, y + 8);
      cell.on('pointerup', () => this.onEquipClick(s.key));
      cell.on('pointerover', () => {
        if (s.key !== 'tool' && eq[s.key]) {
          this.showGearTooltip(eq[s.key]!, 'Currently equipped');
        } else if (s.key === 'tool' && eq.tool) {
          this.setDetailPlain(getItemDef(eq.tool)?.name ?? eq.tool);
        } else {
          this.setDetailPlain(fullName === '—' ? 'Empty slot' : fullName);
        }
      });
      this.eqRoot.add([cell, ...icons, text, nameTxt]);
    });

    const hintOrigin = this.local(
      layout.hint.x + layout.hint.w / 2,
      layout.hint.y,
    );
    this.hintRoot.setPosition(hintOrigin.x, hintOrigin.y);
    const junkOn = settingsStore.get().autoSellJunk;
    const hintLine = touch
      ? `Double-tap to equip${junkOn ? '  ·  Auto-sell ON' : ''}`
      : `Double-click to equip · Hover for compare${junkOn ? '  ·  Auto-sell junk ON' : ''}`;
    const hint = this.scene.add
      .text(0, 0, hintLine, {
        fontFamily: UI_FONT,
        fontSize: touch ? '10px' : '11px',
        color: '#8a9aaa',
        resolution: 2,
        wordWrap: { width: Math.max(40, layout.hint.w - 4) },
        align: 'center',
      })
      .setOrigin(0.5, 0);
    this.hintRoot.add(hint);

    // Bag header + grid live in gridRoot at panel origin for easier masking.
    this.gridRoot.setPosition(-this.panelW / 2, -this.panelH / 2);

    const bagLabel = this.scene.add
      .text(
        layout.bagLabel.x,
        layout.bagLabel.y + layout.bagLabel.h / 2,
        `Bag ${gameState.inventory.slots.length}/${gameState.inventory.capacity}  ·  ${gameState.inventory.count('gold')}g`,
        {
          fontFamily: UI_FONT,
          fontSize: touch ? '12px' : '14px',
          color: '#e0c890',
          resolution: 2,
          wordWrap: { width: Math.max(40, layout.bagLabel.w - 4) },
        },
      )
      .setOrigin(0, 0.5);
    const sortBtn = this.scene.add
      .text(
        layout.sortBtn.x + layout.sortBtn.w / 2,
        layout.sortBtn.y + layout.sortBtn.h / 2,
        'Sort',
        {
          fontFamily: UI_FONT,
          fontSize: '12px',
          color: '#0a0c10',
          backgroundColor: '#d0b070',
          padding: { x: 8, y: 3 },
          resolution: 2,
        },
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    sortBtn.on('pointerup', () => {
      audioBus.uiClick();
      gameState.inventory.sortBag();
      gameState.persist();
      this.setDetailPlain('Bag sorted · gear by rarity, then materials');
      this.refresh();
    });
    this.gridRoot.add([bagLabel, sortBtn]);

    const cell = layout.cellSize;
    const gap = layout.bagGap;
    const cols = gameState.inventory.bagCols;
    const rows = gameState.inventory.bagRows;
    const gridW = cols * cell + (cols - 1) * gap;
    const gridOriginX =
      layout.bagGrid.x + Math.max(0, (layout.bagGrid.w - gridW) / 2);
    const gridOriginY = layout.bagGrid.y;
    const rowPitch = cell + gap;

    // Windowed rows — avoids Phaser 4 WebGL GeometryMask (unsupported).
    this.bagScrollY = Phaser.Math.Clamp(
      this.bagScrollY,
      0,
      this.maxBagScroll(),
    );
    const firstRow = layout.scrollable
      ? Math.floor(this.bagScrollY / rowPitch)
      : 0;
    const rowsToShow = layout.scrollable
      ? Math.min(rows, layout.visibleRows + 1)
      : rows;
    const yOffset = layout.scrollable ? -(this.bagScrollY % rowPitch) : 0;

    this.bagCellsRoot.setPosition(gridOriginX, gridOriginY + yOffset);
    this.gridRoot.add(this.bagCellsRoot);

    if (layout.scrollable) {
      const hit = this.scene.add
        .rectangle(
          layout.bagGrid.x + layout.bagGrid.w / 2,
          layout.bagGrid.y + layout.bagGrid.h / 2,
          layout.bagGrid.w,
          layout.bagGrid.h,
          0x000000,
          0.001,
        )
        .setInteractive({ draggable: true, useHandCursor: true });
      this.gridRoot.add(hit);
      let dragStart = 0;
      let scrollStart = 0;
      hit.on('dragstart', (_p: Phaser.Input.Pointer, _x: number, y: number) => {
        dragStart = y;
        scrollStart = this.bagScrollY;
      });
      hit.on('drag', (_p: Phaser.Input.Pointer, _x: number, y: number) => {
        const next = Phaser.Math.Clamp(
          scrollStart - (y - dragStart),
          0,
          this.maxBagScroll(),
        );
        if (Math.abs(next - this.bagScrollY) < 1) return;
        this.bagScrollY = next;
        this.refresh();
      });
    }

    const playerClass = gameState.progression.classId;

    for (let r = 0; r < rowsToShow; r++) {
      const row = firstRow + r;
      if (row >= rows) break;
      // Clip last partial row below the bag viewport.
      if (
        layout.scrollable &&
        yOffset + r * rowPitch + cell > layout.bagGrid.h
      ) {
        break;
      }
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col;
        const x = col * (cell + gap);
        const y = r * rowPitch;
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
              ? touch
                ? 'Double-tap to equip'
                : 'Double-click to equip'
              : `${classLabel(req)} only`;
            this.showGearTooltip(slot.item, tip);
          }
        });

        this.bagCellsRoot.add(contents);
      }
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
        this.showGearTooltip(
          slot.item,
          shouldShowTouchControls()
            ? 'Double-tap to equip'
            : 'Double-click to equip',
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
      this.setDetailPlain(`Equipped ${def.name}`, '#6ecf7a');
      this.refresh();
      return;
    }
    this.selectedIndex = index;
    this.setDetailPlain(
      `${def?.name ?? slot.itemId} ×${slot.qty}` +
        (def?.kind === 'tool' ? '  — double-tap to equip' : ''),
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
