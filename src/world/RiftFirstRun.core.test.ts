import { describe, expect, test } from 'bun:test';
import {
  ENEMY_SHIFT_LAYER,
  enemyShiftLayer,
  type ShiftLayerId,
} from '../data/shiftLayers';
import { generateDungeon } from './DungeonGen';
import { minRiftEnemyCount, reachableFloorCells } from './RiftEnemyPlacement';
import { riftDepthFromLevel } from '../systems/RiftDepth';
import { SHIFT_COST, SHIFT_ENERGY_PER_KILL } from '../systems/ShiftSystem';

const DEPTHS = [1, 2, 3, 4, 6, 10];
const SEEDS_PER_DEPTH = 24;

/** Foes that live on one layer (both-layer foes count everywhere). */
function layerFoes(map: ReturnType<typeof generateDungeon>, l: ShiftLayerId) {
  let total = 0;
  for (const p of map.layout.packs) {
    const layer = enemyShiftLayer(p.enemyId);
    if (layer === 'both' || layer === l) total += p.count;
  }
  return total;
}

function exactLayerFoes(
  map: ReturnType<typeof generateDungeon>,
  l: ShiftLayerId,
) {
  let total = 0;
  for (const p of map.layout.packs) {
    if (enemyShiftLayer(p.enemyId) === l) total += p.count;
  }
  return total;
}

function totalFoes(map: ReturnType<typeof generateDungeon>): number {
  return map.layout.packs.reduce((s, p) => s + p.count, 0);
}

function tileKeys(map: ReturnType<typeof generateDungeon>): Set<string> {
  const spawn = map.layout.spawn ?? { x: 1.5, y: 1.5 };
  const reachable = reachableFloorCells(map, spawn, 'ash');
  return new Set([...reachable].map((k) => k.slice(0, k.lastIndexOf(','))));
}

describe('first-run rift reachability', () => {
  test('a level 1 character gets a depth 1 rift', () => {
    for (let level = 1; level <= 5; level++) {
      expect(riftDepthFromLevel(level)).toBe(1);
    }
    expect(riftDepthFromLevel(6)).toBe(2);
    expect(riftDepthFromLevel(50)).toBe(10);
  });

  test('kill goal never exceeds spawned foes (boss always reachable)', () => {
    for (const depth of DEPTHS) {
      for (let s = 1; s <= SEEDS_PER_DEPTH; s++) {
        const map = generateDungeon(s * 7919 + depth, depth);
        const foes = totalFoes(map);
        const goal = map.layout.killGoal;
        expect(goal).toBeGreaterThan(0);
        expect(
          foes >= goal,
          `depth ${depth} seed ${s}: goal ${goal} > foes ${foes}`,
        ).toBe(true);
        expect(foes).toBeGreaterThanOrEqual(minRiftEnemyCount(depth));
      }
    }
  });

  test('deep rifts keep the old packed pacing when foes allow it', () => {
    let withFullGoal = 0;
    for (let s = 1; s <= SEEDS_PER_DEPTH; s++) {
      const map = generateDungeon(s * 7919 + 10, 10);
      if (map.layout.killGoal === 12 + 10) withFullGoal++;
    }
    expect(withFullGoal).toBeGreaterThan(0);
  });

  test('every layer holds enough foes to pay for a shift', () => {
    const killsNeeded = Math.ceil(SHIFT_COST / SHIFT_ENERGY_PER_KILL);
    for (const depth of DEPTHS) {
      for (let s = 1; s <= SEEDS_PER_DEPTH; s++) {
        const map = generateDungeon(s * 104729 + depth, depth);
        const ash = exactLayerFoes(map, 'ash');
        const shadow = exactLayerFoes(map, 'shadow');
        // Killable from the start layer without needing a shift first.
        expect(
          layerFoes(map, 'ash') >= killsNeeded,
          `depth ${depth} seed ${s}: only ${layerFoes(map, 'ash')} ash foes`,
        ).toBe(true);
        // And worth a shift once the player can pay it.
        expect(shadow >= killsNeeded).toBe(true);
        expect(ash + shadow).toBeGreaterThan(0);
      }
    }
  });

  test('packs stand on tiles reachable from the spawn on ash', () => {
    for (let s = 1; s <= SEEDS_PER_DEPTH; s++) {
      const map = generateDungeon(s * 31 + 1, 1);
      const walkable = tileKeys(map);
      for (const p of map.layout.packs) {
        const key = `${Math.floor(p.x)},${Math.floor(p.y)}`;
        expect(walkable.has(key)).toBe(true);
      }
    }
  });

  test('every enemy id in a rift has a shift layer mapping', () => {
    for (let s = 1; s <= SEEDS_PER_DEPTH; s++) {
      const map = generateDungeon(s * 17 + 3, 3);
      for (const p of map.layout.packs) {
        expect(ENEMY_SHIFT_LAYER[p.enemyId]).toBeDefined();
      }
      for (const mix of map.biome.enemyMix) {
        expect(ENEMY_SHIFT_LAYER[mix.enemyId]).toBeDefined();
      }
    }
  });
});
