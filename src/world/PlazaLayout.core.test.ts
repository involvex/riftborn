import { describe, expect, test } from 'bun:test';
import { generateHub, inPlaza, PLAZA } from './MapGen';

describe('plaza layout', () => {
  test('NPCs, buildings, and bench do not share tiles', () => {
    const hub = generateHub(1);
    const occupied = new Set<string>();
    const take = (x: number, y: number, label: string) => {
      const key = `${Math.floor(x)},${Math.floor(y)}`;
      expect(occupied.has(key), `${label} overlaps ${key}`).toBe(false);
      occupied.add(key);
    };

    // Buildings (WorldScene mirrors these coords)
    take(29.5, 29.5, 'Shop');
    take(35.5, 29.5, 'Forge');
    take(35.5, 35.5, 'Inn');
    take(hub.bench.x, hub.bench.y, 'bench');

    for (const n of hub.npcs ?? []) {
      take(n.x, n.y, n.id);
      expect(inPlaza(Math.floor(n.x), Math.floor(n.y))).toBe(true);
    }
  });

  test('plaza has a clear center well and no camp clutter', () => {
    const hub = generateHub(1);
    const plazaDecor = (hub.decor ?? []).filter((d) =>
      inPlaza(Math.floor(d.x), Math.floor(d.y)),
    );
    expect(plazaDecor.some((d) => d.kind === 'well')).toBe(true);
    expect(plazaDecor.some((d) => d.kind === 'stall')).toBe(false);
    expect(plazaDecor.some((d) => d.kind === 'campfire')).toBe(false);
    expect(plazaDecor.some((d) => d.kind === 'pillar')).toBe(false);
    expect(plazaDecor.some((d) => d.kind === 'tent')).toBe(false);
  });

  test('spawn sits on the open apron south of the well', () => {
    const hub = generateHub(1);
    const spawn = hub.spawn!;
    expect(spawn.x).toBeCloseTo(32.5, 5);
    expect(spawn.y).toBeCloseTo(33.5, 5);
    expect(spawn.y).toBeGreaterThan(PLAZA.y0 + 2);
  });
});
