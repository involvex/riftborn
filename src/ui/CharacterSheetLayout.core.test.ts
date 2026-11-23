import { describe, expect, test } from 'bun:test';
import { layoutCharacterSheet } from './CharacterSheetLayout';

function overlaps(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

describe('layoutCharacterSheet', () => {
  for (const [w, h, touch] of [
    [514, 322, true],
    [1024, 473, true],
    [640, 520, false],
  ] as const) {
    test(`${w}x${h} touch=${touch}: buttons stay in their column`, () => {
      const layout = layoutCharacterSheet(w, h, touch);
      expect(layout.showClose).toBe(!touch);
      for (const btn of layout.buttons) {
        expect(btn.x - btn.w / 2).toBeGreaterThanOrEqual(-w / 2);
        expect(btn.x + btn.w / 2).toBeLessThanOrEqual(w / 2);
        expect(btn.y - btn.h / 2).toBeGreaterThanOrEqual(-h / 2);
        expect(btn.y + btn.h / 2).toBeLessThanOrEqual(h / 2);
        expect(btn.x - btn.w / 2).toBeGreaterThanOrEqual(
          layout.bodyX + layout.bodyW,
        );
      }
      for (let i = 0; i < layout.buttons.length; i++) {
        for (let j = i + 1; j < layout.buttons.length; j++) {
          const a = layout.buttons[i]!;
          const b = layout.buttons[j]!;
          expect(
            overlaps(
              { x: a.x - a.w / 2, y: a.y - a.h / 2, w: a.w, h: a.h },
              { x: b.x - b.w / 2, y: b.y - b.h / 2, w: b.w, h: b.h },
            ),
          ).toBe(false);
        }
      }
    });
  }
});
