import { describe, expect, test } from 'bun:test';
import {
  fitSkillTree,
  skillNodeCenter,
  type SkillTreeNodePos,
} from './SkillTreeLayout';

/** Warrior tree span from skills.json (cols -2..1, rows 0..3). */
const WARRIOR: SkillTreeNodePos[] = [
  { col: 0, row: 0 },
  { col: -1, row: 1 },
  { col: 1, row: 1 },
  { col: 0, row: 2 },
  { col: -2, row: 2 },
  { col: 0, row: 3 },
];

function boxes(panelW: number, panelH: number) {
  const fit = fitSkillTree(panelW, panelH, WARRIOR);
  return WARRIOR.map((n) => {
    const c = skillNodeCenter(fit, n.col, n.row);
    return {
      x: c.x - fit.nodeW / 2,
      y: c.y - fit.nodeH / 2,
      w: fit.nodeW,
      h: fit.nodeH,
    };
  });
}

function overlaps(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

describe('fitSkillTree', () => {
  for (const [w, h] of [
    [1024, 473],
    [860, 400],
    [509, 325],
    [400, 220],
  ] as const) {
    test(`${w}x${h}: cards stay inside and do not cover each other`, () => {
      const fit = fitSkillTree(w, h, WARRIOR);
      const nodes = boxes(w, h);
      for (const box of nodes) {
        expect(box.x).toBeGreaterThanOrEqual(-w / 2 + 2);
        expect(box.y).toBeGreaterThanOrEqual(-h / 2 + 2);
        expect(box.x + box.w).toBeLessThanOrEqual(w / 2 - 2);
        expect(box.y + box.h).toBeLessThanOrEqual(h / 2 - 2);
        expect(box.y).toBeGreaterThanOrEqual(fit.pointsY + fit.pointsFont);
        expect(box.y + box.h).toBeLessThanOrEqual(fit.detailY + 1);
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          expect(overlaps(nodes[i]!, nodes[j]!)).toBe(false);
        }
      }
    });
  }
});
