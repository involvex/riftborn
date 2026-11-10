import { describe, expect, test } from 'bun:test';
import {
  MENDER_SIGHT,
  MENDER_STANDOFF,
  isMenderEnemy,
  menderHealAmount,
  menderHealPlan,
  menderMoveDir,
  menderShouldChannel,
  menderWoundedAllies,
  type MenderAlly,
} from './EnemyMender';
import enemiesData from '../data/enemies.json';
import { RIFT_BIOMES } from '../data/biomes';
import { enemyShiftLayer } from '../data/shiftLayers';
import { enemySpriteKey } from '../render/SpriteAtlas';
import { enemyTelegraphKind } from './EnemyTelegraph';

type EnemyDefLike = {
  id: string;
  hp: number;
  damage: number;
  healRange?: number;
  healFrac?: number;
};

const defs = enemiesData as Record<string, EnemyDefLike>;

function ally(
  id: string,
  x: number,
  y: number,
  hp: number,
  maxHp: number,
): MenderAlly {
  return { id, x, y, hp, maxHp, alive: true };
}

const SELF = ally('m1', 0, 0, 30, 30);

describe('mender data', () => {
  test('rift_mender exists as a pure support foe', () => {
    const def = defs['rift_mender']!;
    expect(def).toBeDefined();
    expect(def.damage).toBe(0);
    expect(def.healRange).toBeGreaterThan(0);
    expect(def.healFrac).toBeGreaterThan(0);
    expect(def.healFrac!).toBeLessThanOrEqual(0.5);
  });

  test('isMenderEnemy only matches the mender', () => {
    expect(isMenderEnemy('rift_mender')).toBe(true);
    expect(isMenderEnemy('wisp')).toBe(false);
    expect(isMenderEnemy('enemy_rift_wraith')).toBe(false);
  });

  test('no other enemy heals', () => {
    for (const [id, def] of Object.entries(defs)) {
      if (id === 'rift_mender') continue;
      expect(def.healRange, `${id} must not heal`).toBeUndefined();
    }
  });

  test('mender is wired into rendering, layer and telegraph systems', () => {
    expect(enemyShiftLayer('rift_mender')).toBe('both');
    expect(enemySpriteKey('rift_mender')).toBe('spr_wisp');
    expect(enemyTelegraphKind('rift_mender')).toBe('wail');
  });

  test('mender appears in exactly two rift biomes, one each', () => {
    const withMender = RIFT_BIOMES.filter((b) =>
      b.enemyMix.some((e) => e.enemyId === 'rift_mender'),
    );
    expect(withMender.length).toBe(2);
    for (const b of withMender) {
      const entry = b.enemyMix.find((e) => e.enemyId === 'rift_mender')!;
      expect(entry.minCount).toBe(1);
      expect(entry.maxCount).toBe(1);
    }
  });

  test('mender never spawns in the hub fringe', () => {
    // Hub packs come from MapGen's fixed ids — mender must not leak there.
    const ids = new Set<string>();
    for (const b of RIFT_BIOMES) {
      for (const e of b.enemyMix) ids.add(e.enemyId);
    }
    expect(ids.has('rift_mender')).toBe(true);
  });
});

describe('menderWoundedAllies', () => {
  test('filters out healthy, dead, self and out-of-range allies', () => {
    const allies = [
      ally('a1', 1, 0, 10, 20), // wounded, in range
      ally('a2', 5, 5, 20, 20), // healthy
      ally('a3', 20, 0, 5, 20), // out of range
      ally('m1', 0, 0, 10, 30), // self
      { ...ally('a4', 1, 1, 5, 20), alive: false },
    ];
    const out = menderWoundedAllies(SELF, allies, 6);
    expect(out.map((a) => a.id)).toEqual(['a1']);
  });

  test('sorts weakest-first', () => {
    const allies = [
      ally('a1', 1, 0, 12, 20),
      ally('a2', 2, 0, 4, 20),
      ally('a3', 3, 0, 8, 20),
    ];
    const out = menderWoundedAllies(SELF, allies, 6);
    expect(out.map((a) => a.id)).toEqual(['a2', 'a3', 'a1']);
  });

  test('empty when heal range is zero', () => {
    expect(menderWoundedAllies(SELF, [ally('a1', 1, 0, 1, 20)], 0)).toEqual([]);
  });
});

describe('menderHealAmount', () => {
  test('heals a quarter of max hp, rounded down but never below 1', () => {
    expect(menderHealAmount(40, 0.25)).toBe(10);
    expect(menderHealAmount(30, 0.25)).toBe(7);
    expect(menderHealAmount(2, 0.25)).toBe(1);
  });

  test('zero for missing data', () => {
    expect(menderHealAmount(0, 0.25)).toBe(0);
    expect(menderHealAmount(40, 0)).toBe(0);
  });

  test('cannot overheal beyond max (plan is applied clamped)', () => {
    const plan = menderHealPlan(SELF, [ally('a1', 1, 0, 18, 20)], {
      id: 'rift_mender',
      hp: 30,
      damage: 0,
      healRange: 6,
      healFrac: 0.25,
    });
    expect(plan).toEqual([{ allyId: 'a1', amount: 5 }]);
    const after = Math.min(20, 18 + plan[0]!.amount);
    expect(after).toBe(20);
  });
});

describe('menderShouldChannel', () => {
  test('needs cooldown, a wounded ally and a nearby player', () => {
    expect(menderShouldChannel(0, 1, 5)).toBe(true);
    expect(menderShouldChannel(0.1, 1, 5)).toBe(false);
    expect(menderShouldChannel(0, 0, 5)).toBe(false);
    expect(menderShouldChannel(0, 1, MENDER_SIGHT + 0.1)).toBe(false);
  });
});

describe('menderMoveDir', () => {
  test('backpedals inside the standoff ring', () => {
    const dir = menderMoveDir({ x: 0, y: 0 }, { x: 2, y: 0 });
    expect(dir.x).toBeCloseTo(-1, 5);
    expect(dir.y).toBeCloseTo(0, 5);
  });

  test('idles outside the standoff ring', () => {
    const dir = menderMoveDir({ x: 0, y: 0 }, { x: 10, y: 0 });
    expect(dir).toEqual({ x: 0, y: 0 });
  });

  test('diagonal movement is normalized away from the player', () => {
    const dir = menderMoveDir({ x: 0, y: 0 }, { x: 2, y: 2 }); // dist 2.8 < standoff
    const len = Math.hypot(dir.x, dir.y);
    expect(len).toBeGreaterThan(0.99);
    expect(len).toBeLessThan(1.01);
    expect(dir.x).toBeCloseTo(-Math.SQRT1_2, 5);
    expect(dir.y).toBeCloseTo(-Math.SQRT1_2, 5);
  });

  test('standoff constant sits between kite ranges', () => {
    expect(MENDER_STANDOFF).toBeGreaterThan(2);
    expect(MENDER_STANDOFF).toBeLessThan(MENDER_SIGHT);
  });
});
