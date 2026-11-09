import { describe, expect, test } from 'bun:test';
import {
  computeCraftPanelLayout,
  craftPanelFromViewport,
  type CraftPanelLayout,
  type Rect,
} from './CraftPanelLayout';
import { rectsOverlap } from './InventoryLayout';

function namedRects(layout: CraftPanelLayout): { name: string; rect: Rect }[] {
  const out: { name: string; rect: Rect }[] = [
    { name: 'title', rect: layout.title },
    { name: 'close', rect: layout.close },
  ];
  layout.rows.forEach((rect, i) => {
    out.push({ name: `row${i}`, rect });
  });
  return out;
}

function assertInsidePanel(layout: CraftPanelLayout): void {
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

function assertNoOverlaps(layout: CraftPanelLayout): void {
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

const RECIPE_COUNT = 5;

const VIEWPORTS = [
  { w: 1024, h: 473, touch: true },
  { w: 1280, h: 720, touch: true },
  { w: 1280, h: 720, touch: false },
  { w: 1920, h: 1080, touch: false },
] as const;

describe('computeCraftPanelLayout', () => {
  for (const vp of VIEWPORTS) {
    test(`${vp.w}x${vp.h} touch=${vp.touch}: 5 recipes + close, no overlap`, () => {
      const { panelW, panelH } = craftPanelFromViewport(vp.w, vp.h, vp.touch);
      const layout = computeCraftPanelLayout({
        panelW,
        panelH,
        recipeCount: RECIPE_COUNT,
        touch: vp.touch,
      });

      expect(layout.panel.w).toBe(panelW);
      expect(layout.panel.h).toBe(panelH);
      expect(layout.rows.length).toBe(RECIPE_COUNT);
      assertInsidePanel(layout);
      assertNoOverlaps(layout);

      // Touch targets must not shrink vs prior 48px pitch / ~36px hit.
      expect(layout.rowPitch).toBeGreaterThanOrEqual(48);
      expect(layout.rowH).toBeGreaterThanOrEqual(36);

      const last = layout.rows[RECIPE_COUNT - 1]!;
      expect(layout.close.y).toBeGreaterThanOrEqual(last.y + last.h);

      if (!layout.scrollable) {
        // Every recipe row is fully visible without scrolling.
        for (const row of layout.rows) {
          expect(row.y).toBeGreaterThanOrEqual(layout.listClip.y);
          expect(row.y + row.h).toBeLessThanOrEqual(
            layout.listClip.y + layout.listClip.h,
          );
        }
      }
    });
  }

  test('1024x473 fits all 5 recipes without scroll', () => {
    const { panelW, panelH } = craftPanelFromViewport(1024, 473, true);
    const layout = computeCraftPanelLayout({
      panelW,
      panelH,
      recipeCount: RECIPE_COUNT,
      touch: true,
    });
    expect(layout.scrollable).toBe(false);
    expect(panelH).toBeGreaterThan(260);
  });
});
