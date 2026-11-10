import { describe, expect, test } from 'bun:test';
import { pickChainTargetIds, type ChainCandidate } from './SkillChain';

function foe(id: string, x: number, y: number, alive = true): ChainCandidate {
  return { id, x, y, alive };
}

describe('pickChainTargetIds', () => {
  test('links neighbours within the chain range', () => {
    const enemies = [
      foe('a', 0, 0),
      foe('b', 2, 0),
      foe('c', 4, 0),
      foe('far', 20, 20),
    ];
    expect(pickChainTargetIds(enemies, 'a', 3, 4)).toEqual(['a', 'b', 'c']);
  });

  test('stops when no foe is in range', () => {
    const enemies = [foe('a', 0, 0), foe('b', 12, 0)];
    expect(pickChainTargetIds(enemies, 'a', 3, 4)).toEqual(['a']);
  });

  test('respects the target cap', () => {
    const enemies = [
      foe('a', 0, 0),
      foe('b', 1, 0),
      foe('c', 2, 0),
      foe('d', 3, 0),
    ];
    expect(pickChainTargetIds(enemies, 'a', 5, 2)).toEqual(['a', 'b']);
  });

  test('never hits the same foe twice', () => {
    const enemies = [
      foe('a', 0, 0),
      foe('b', 1, 0),
      foe('c', 2, 0),
      foe('d', 1, 1),
    ];
    const ids = pickChainTargetIds(enemies, 'a', 4, 6);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('skips dead foes', () => {
    const enemies = [foe('a', 0, 0), foe('b', 1, 0, false), foe('c', 2, 0)];
    expect(pickChainTargetIds(enemies, 'a', 4, 4)).toEqual(['a', 'c']);
  });

  test('unknown start id yields no chain', () => {
    expect(pickChainTargetIds([foe('a', 0, 0)], 'zz', 3, 4)).toEqual([]);
  });

  test('dead start id yields no chain', () => {
    expect(pickChainTargetIds([foe('a', 0, 0, false)], 'a', 3, 4)).toEqual([]);
  });

  test('zero targets or range yields no chain', () => {
    const enemies = [foe('a', 0, 0), foe('b', 1, 0)];
    expect(pickChainTargetIds(enemies, 'a', 3, 0)).toEqual([]);
    expect(pickChainTargetIds(enemies, 'a', 0, 4)).toEqual([]);
  });
});
