import { describe, expect, test } from 'bun:test';
import { generateDungeon } from './DungeonGen';
import { packsTowardKillGoal } from './ChampionRoom';
import {
  SPLIT_ASH_ID,
  SPLIT_ENTER_TOAST,
  SPLIT_HALF_COUNT,
  SPLIT_SHADOW_ID,
  findSplitPackTile,
  isSplitPack,
  stampShiftSplitPack,
} from './ShiftSplitPack';

describe('ShiftSplitPack', () => {
  test('enter toast names SHIFT and the solid swap', () => {
    expect(SPLIT_ENTER_TOAST.toLowerCase()).toContain('shift');
    expect(SPLIT_ENTER_TOAST.toLowerCase()).toContain('solid');
  });

  test('stamp writes ash goblins + shadow archers on one tile', () => {
    const packs: Parameters<typeof stampShiftSplitPack>[0]['packs'] = [];
    const used = new Set<string>();
    const spot = stampShiftSplitPack({
      packs,
      candidates: [
        { x: 10.5, y: 10.5 },
        { x: 12.5, y: 12.5 },
      ],
      spawn: { x: 1.5, y: 1.5 },
      used,
    });
    expect(spot).toEqual({ x: 10.5, y: 10.5 });
    expect(packs).toHaveLength(2);
    expect(packs[0]).toMatchObject({
      enemyId: SPLIT_ASH_ID,
      count: SPLIT_HALF_COUNT,
      layer: 'ash',
      split: true,
      x: 10.5,
      y: 10.5,
    });
    expect(packs[1]).toMatchObject({
      enemyId: SPLIT_SHADOW_ID,
      count: SPLIT_HALF_COUNT,
      layer: 'shadow',
      split: true,
      x: 10.5,
      y: 10.5,
    });
    expect(isSplitPack(packs[0]!)).toBe(true);
    expect(findSplitPackTile(packs)).toEqual({ x: 10.5, y: 10.5 });
  });

  test('stamp is a no-op when a split already exists', () => {
    const packs: Parameters<typeof stampShiftSplitPack>[0]['packs'] = [
      {
        enemyId: SPLIT_ASH_ID,
        count: 2,
        x: 5.5,
        y: 5.5,
        layer: 'ash',
        split: true,
      },
    ];
    const again = stampShiftSplitPack({
      packs,
      candidates: [{ x: 12.5, y: 12.5 }],
      spawn: { x: 1.5, y: 1.5 },
      used: new Set(),
    });
    expect(again).toBeNull();
    expect(packs).toHaveLength(1);
  });

  test('generated rifts stamp exactly one ash+shadow pair', () => {
    let withSplit = 0;
    for (let seed = 1; seed <= 36; seed++) {
      const map = generateDungeon(seed * 17 + 3, 4);
      const halves = map.layout.packs.filter((p) => p.split);
      if (halves.length === 0) continue;
      withSplit += 1;
      expect(halves).toHaveLength(2);
      const ash = halves.find((p) => p.layer === 'ash');
      const shadow = halves.find((p) => p.layer === 'shadow');
      expect(ash?.enemyId).toBe(SPLIT_ASH_ID);
      expect(shadow?.enemyId).toBe(SPLIT_SHADOW_ID);
      expect(ash?.count).toBe(SPLIT_HALF_COUNT);
      expect(shadow?.count).toBe(SPLIT_HALF_COUNT);
      expect(ash!.x).toBe(shadow!.x);
      expect(ash!.y).toBe(shadow!.y);
      const splitCount = halves.reduce((s, p) => s + p.count, 0);
      const goalSupply = packsTowardKillGoal(map.layout.packs);
      const all = map.layout.packs.reduce((s, p) => s + p.count, 0);
      const champ = map.layout.packs
        .filter((p) => p.champion)
        .reduce((s, p) => s + p.count, 0);
      expect(goalSupply).toBe(all - champ);
      expect(goalSupply).toBeGreaterThanOrEqual(splitCount);
      expect(findSplitPackTile(map.layout.packs)).toEqual({
        x: ash!.x,
        y: ash!.y,
      });
    }
    expect(withSplit).toBeGreaterThan(20);
  });
});
