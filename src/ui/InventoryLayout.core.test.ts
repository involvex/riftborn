import { describe, expect, test } from 'bun:test';
import {
  computeInventoryLayout,
  inventoryPanelFromViewport,
  rectsOverlap,
  type InventoryLayout,
  type Rect,
} from './InventoryLayout';

function namedRects(layout: InventoryLayout): { name: string; rect: Rect }[] {
  const out: { name: string; rect: Rect }[] = [
    { name: 'title', rect: layout.title },
    { name: 'equipment', rect: layout.equipment },
    { name: 'hint', rect: layout.hint },
    { name: 'bagHeader', rect: layout.bagHeader },
    { name: 'bagGrid', rect: layout.bagGrid },
    { name: 'detail', rect: layout.detail },
  ];
  if (layout.close) out.push({ name: 'close', rect: layout.close });
  return out;
}

function assertInsidePanel(layout: InventoryLayout): void {
  const panel = layout.panel;
  for (const { name, rect } of namedRects(layout)) {
    expect(rect.x >= panel.x - 0.01, `${name}.x outside panel`).toBe(true);
    expect(rect.y >= panel.y - 0.01, `${name}.y outside panel`).toBe(true);
    expect(
      rect.x + rect.w <= panel.x + panel.w + 0.01,
      `${name} right edge outside panel`,
    ).toBe(true);
    expect(
      rect.y + rect.h <= panel.y + panel.h + 0.01,
      `${name} bottom edge outside panel`,
    ).toBe(true);
  }
}

function assertNoOverlaps(layout: InventoryLayout): void {
  const parts = namedRects(layout);
  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      const a = parts[i]!;
      const b = parts[j]!;
      expect(rectsOverlap(a.rect, b.rect), `${a.name} overlaps ${b.name}`).toBe(
        false,
      );
    }
  }
}

const VIEWPORTS = [
  { w: 1024, h: 473, touch: true },
  { w: 1280, h: 720, touch: true },
  { w: 1280, h: 720, touch: false },
  { w: 1920, h: 1080, touch: false },
] as const;

describe('computeInventoryLayout', () => {
  for (const vp of VIEWPORTS) {
    test(`${vp.w}x${vp.h} touch=${vp.touch}: no overlap, inside panel`, () => {
      const { panelW, panelH } = inventoryPanelFromViewport(
        vp.w,
        vp.h,
        vp.touch,
      );
      const layout = computeInventoryLayout({
        panelW,
        panelH,
        touch: vp.touch,
        bagCols: 8,
        bagRows: 6,
        showCloseX: true,
      });

      expect(layout.panel.w).toBe(panelW);
      expect(layout.panel.h).toBe(panelH);
      assertInsidePanel(layout);
      assertNoOverlaps(layout);

      if (vp.touch) {
        expect(layout.cellSize).toBeGreaterThanOrEqual(36);
      }
      if (vp.h <= 500) {
        expect(layout.detailBeside || layout.scrollable).toBe(true);
      }
      expect(layout.close).toBeNull();
    });
  }

  test('omits close row when X is shown', () => {
    const layout = computeInventoryLayout({
      panelW: 800,
      panelH: 560,
      touch: false,
      bagCols: 8,
      bagRows: 6,
      showCloseX: true,
    });
    expect(layout.close).toBeNull();
    expect(layout.showCloseText).toBe(false);
  });

  test('keeps close row when no X', () => {
    const layout = computeInventoryLayout({
      panelW: 800,
      panelH: 560,
      touch: false,
      bagCols: 8,
      bagRows: 6,
      showCloseX: false,
    });
    expect(layout.close).not.toBeNull();
    expect(layout.showCloseText).toBe(true);
  });

  test('touch low-res buffer (0.65×1024x473): ≥2 bag rows, cell≥36', () => {
    const { panelW, panelH } = inventoryPanelFromViewport(
      Math.floor(1024 * 0.65),
      Math.floor(473 * 0.65),
      true,
    );
    const layout = computeInventoryLayout({
      panelW,
      panelH,
      touch: true,
      bagCols: 8,
      bagRows: 6,
      showCloseX: true,
    });
    assertInsidePanel(layout);
    assertNoOverlaps(layout);
    expect(layout.cellSize).toBeGreaterThanOrEqual(36);
    expect(layout.visibleRows).toBeGreaterThanOrEqual(2);
    expect(layout.detailBeside || layout.scrollable).toBe(true);
  });
});
