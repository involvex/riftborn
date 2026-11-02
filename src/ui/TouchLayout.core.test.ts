import { describe, expect, test } from 'bun:test';
import {
  computeTouchLayout,
  circleRect,
  rectsOverlap,
  type Rect,
  type TouchLayout,
} from './TouchLayout';

/** CSS viewports from M1c; DPR is CSS-only (layout uses CSS px). */
const VIEWPORTS = [
  { w: 1024, h: 473, dpr: 2.5 },
  { w: 1280, h: 720, dpr: 2 },
  { w: 2400, h: 1080, dpr: 2.75 },
] as const;

function namedHudRects(layout: TouchLayout): { name: string; rect: Rect }[] {
  const out: { name: string; rect: Rect }[] = [
    { name: 'status', rect: layout.status },
    { name: 'minimap', rect: layout.minimap },
    { name: 'stick', rect: circleRect(layout.stick) },
    { name: 'dash', rect: circleRect(layout.dash) },
    { name: 'atk', rect: circleRect(layout.atk) },
    { name: 'interact', rect: circleRect(layout.interact) },
  ];
  layout.chromeButtons.forEach((c, i) => {
    out.push({ name: `chrome${i}`, rect: circleRect(c) });
  });
  layout.skillSlots.forEach((s, i) => {
    out.push({ name: `skill${i}`, rect: circleRect(s) });
  });
  return out;
}

function assertInsideViewport(
  layout: TouchLayout,
  width: number,
  height: number,
): void {
  for (const { name, rect } of namedHudRects(layout)) {
    expect(rect.x >= -0.5, `${name}.x < 0`).toBe(true);
    expect(rect.y >= -0.5, `${name}.y < 0`).toBe(true);
    expect(rect.x + rect.w <= width + 0.5, `${name} right > width`).toBe(true);
    expect(rect.y + rect.h <= height + 0.5, `${name} bottom > height`).toBe(
      true,
    );
  }
}

function assertNoOverlaps(layout: TouchLayout): void {
  const parts = namedHudRects(layout);
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

describe('computeTouchLayout', () => {
  for (const vp of VIEWPORTS) {
    test(`${vp.w}x${vp.h} @dpr${vp.dpr}: no cuts, chrome clear of status`, () => {
      // Layout uses CSS pixels; DPR must not inflate the geometry input.
      const width = vp.w;
      const height = vp.h;
      const layout = computeTouchLayout(width, height);

      expect(layout.chromeButtons.length).toBe(5);
      for (const btn of layout.chromeButtons) {
        expect(btn.r * 2).toBeGreaterThanOrEqual(44);
      }
      expect(layout.atk.r * 2).toBeGreaterThanOrEqual(44);
      expect(layout.stick.r * 2).toBeGreaterThanOrEqual(44);

      assertInsideViewport(layout, width, height);
      assertNoOverlaps(layout);

      // Menu row/column must not cover the HP/XP status block.
      for (const btn of layout.chromeButtons) {
        expect(rectsOverlap(layout.status, circleRect(btn))).toBe(false);
      }
      expect(rectsOverlap(layout.status, layout.minimap)).toBe(false);
    });
  }

  test('chrome sits beside status or under minimap — not top-center over bars', () => {
    const layout = computeTouchLayout(1024, 473);
    const midX = 1024 / 2;
    for (const btn of layout.chromeButtons) {
      // Old bug: tray centered on status strip.
      expect(
        Math.abs(btn.x - midX) > 80 ||
          btn.y > layout.status.y + layout.status.h,
      ).toBe(true);
    }
  });
});
