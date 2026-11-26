import { describe, expect, test } from 'bun:test';
import { packMemberWorldOffset, resolvePackMemberTile } from './PackSpread';

describe('packMemberWorldOffset', () => {
  test('index 0 stays on center', () => {
    expect(packMemberWorldOffset(0, 3)).toEqual({ x: 0, y: 0 });
  });

  test('members fan to distinct first-ring tiles', () => {
    const keys = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const o = packMemberWorldOffset(i, 5);
      keys.add(`${o.x},${o.y}`);
    }
    expect(keys.size).toBe(5);
  });
});

describe('resolvePackMemberTile', () => {
  test('three members never share a tile when neighbors are walkable', () => {
    const occupied = new Set<string>();
    const walkable = () => true;
    const tiles = [0, 1, 2].map((i) =>
      resolvePackMemberTile(10.5, 20.5, i, 3, occupied, walkable),
    );
    const keys = new Set(
      tiles.map((t) => `${Math.floor(t.x)},${Math.floor(t.y)}`),
    );
    expect(keys.size).toBe(3);
  });

  test('skips occupied and blocked neighbors', () => {
    const occupied = new Set<string>(['11,20']);
    const blocked = new Set(['9,20', '10,21', '10,19']);
    const walkable = (x: number, y: number) =>
      !blocked.has(`${Math.floor(x)},${Math.floor(y)}`);
    const a = resolvePackMemberTile(10.5, 20.5, 1, 3, occupied, walkable);
    expect(`${Math.floor(a.x)},${Math.floor(a.y)}`).not.toBe('11,20');
    expect(blocked.has(`${Math.floor(a.x)},${Math.floor(a.y)}`)).toBe(false);
  });
});
