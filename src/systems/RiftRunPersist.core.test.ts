import { describe, expect, test } from 'bun:test';
import {
  isValidRiftRun,
  parseRiftRun,
  riftPhaseFromRun,
  sanitizeRiftEnemies,
} from './RiftRunPersist';

const base = {
  seed: 7,
  depth: 2,
  modId: 'glass',
  kills: 3,
  bossSpawned: false,
  bossDead: false,
  cleared: false,
  shiftLayer: 'shadow',
  shiftEnergy: 50,
  shiftCooldownLeft: 100,
  explored: null,
  enemies: [],
  groundLoot: [],
  bossChest: null,
  nodes: [],
};

describe('RiftRunPersist', () => {
  test('validates a complete blob', () => {
    expect(isValidRiftRun(base)).toBe(true);
    expect(isValidRiftRun({ ...base, modId: 'nope' })).toBe(false);
    expect(isValidRiftRun(null)).toBe(false);
  });

  test('phase follows boss flags', () => {
    expect(riftPhaseFromRun({ bossSpawned: false, bossDead: false })).toBe(
      'fill',
    );
    expect(riftPhaseFromRun({ bossSpawned: true, bossDead: false })).toBe(
      'boss',
    );
    expect(riftPhaseFromRun({ bossSpawned: true, bossDead: true })).toBe(
      'exit',
    );
  });

  test('sanitize drops dead foes and extra bosses', () => {
    const cleaned = sanitizeRiftEnemies([
      {
        defId: 'shade',
        x: 1,
        y: 1,
        hp: 0,
        elitePack: false,
        boss: false,
        combatLayer: 'both',
      },
      {
        defId: 'rift_lord',
        x: 2,
        y: 2,
        hp: 40,
        elitePack: false,
        boss: true,
        combatLayer: 'ash',
      },
      {
        defId: 'rift_lord',
        x: 3,
        y: 3,
        hp: 10,
        elitePack: false,
        boss: true,
        combatLayer: 'ash',
      },
      {
        defId: 'shade',
        x: 4,
        y: 4,
        hp: 8,
        elitePack: true,
        boss: false,
        combatLayer: 'both',
      },
    ]);
    expect(cleaned).toHaveLength(2);
    expect(cleaned.filter((e) => e.boss)).toHaveLength(1);
  });

  test('parseRiftRun clones gear and clamps depth', () => {
    const parsed = parseRiftRun({
      ...base,
      depth: 99,
      groundLoot: [
        {
          x: 1,
          y: 2,
          item: {
            uid: 'g1',
            baseId: 'ashen_hat',
            name: 'Hood',
            slot: 'hat',
            setId: 'ashen',
            classId: 'mystic',
            rarity: 'magic',
            itemLevel: 3,
            stats: {
              strength: 0,
              dexterity: 1,
              stamina: 0,
              intellect: 0,
              armor: 2,
              damage: 0,
              skillPower: 0,
            },
          },
        },
      ],
    });
    expect(parsed?.depth).toBe(10);
    expect(parsed?.groundLoot[0]?.item.name).toBe('Hood');
    expect(parsed?.skillCooldowns).toEqual([0, 0, 0, 0]);
    expect(parsed?.barrierHp).toBe(0);
    parsed!.groundLoot[0]!.item.name = 'mutated';
    expect(
      (
        base as unknown as {
          groundLoot: { item: { name: string } }[];
        }
      ).groundLoot,
    ).toEqual([]);
  });

  test('parseRiftRun keeps skill CDs and barrier', () => {
    const parsed = parseRiftRun({
      ...base,
      skillCooldowns: [3.5, 0, 1, 8],
      barrierHp: 40,
      barrierLeft: 2.25,
    });
    expect(parsed?.skillCooldowns).toEqual([3.5, 0, 1, 8]);
    expect(parsed?.barrierHp).toBe(40);
    expect(parsed?.barrierLeft).toBe(2.25);
  });
});
