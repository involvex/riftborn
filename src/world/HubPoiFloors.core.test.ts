import { describe, expect, test } from 'bun:test';
import type { PoiKind } from './MapGen';
import {
  findPoiNear,
  hubPoiFloorOverride,
  pickPoiFloorTile,
  type PoiRef,
} from './HubPoiFloors';

const shrine: PoiRef = {
  kind: 'shrine',
  x: 10.5,
  y: 10.5,
  radius: 2.6,
};

const grove: PoiRef = {
  kind: 'grove',
  x: 22.5,
  y: 8.5,
  radius: 2.5,
};

const camp: PoiRef = { kind: 'camp', x: 10.5, y: 54.5, radius: 2.8 };
const ruin: PoiRef = { kind: 'ruin', x: 54.5, y: 10.5, radius: 3.0 };
const scout: PoiRef = { kind: 'scout', x: 54.5, y: 54.5, radius: 2.4 };
const warren: PoiRef = { kind: 'warren', x: 8.5, y: 32.5, radius: 2.6 };
const watch: PoiRef = { kind: 'watch', x: 56.5, y: 32.5, radius: 2.5 };
const cairn: PoiRef = { kind: 'cairn', x: 40.5, y: 56.5, radius: 2.7 };

const allPois: PoiRef[] = [
  camp,
  ruin,
  scout,
  shrine,
  warren,
  grove,
  watch,
  cairn,
];

describe('hubPoiFloorOverride', () => {
  test('plaza=true => no POI override even inside a POI radius zone', () => {
    const res = hubPoiFloorOverride({
      x: shrine.x,
      y: shrine.y,
      plaza: true,
      onPath: false,
      pois: [shrine],
      noise: 0.1,
    });
    expect(res).toBeNull();
  });

  test('onPath=true => no POI override even inside a POI radius zone', () => {
    const res = hubPoiFloorOverride({
      x: grove.x,
      y: grove.y,
      plaza: false,
      onPath: true,
      pois: [grove],
      noise: 0.1,
    });
    expect(res).toBeNull();
  });

  test('outside every POI radius => no override', () => {
    const res = hubPoiFloorOverride({
      x: 32,
      y: 32,
      plaza: false,
      onPath: false,
      pois: allPois,
      noise: 0.5,
    });
    expect(res).toBeNull();
  });

  test('inside radius+1.5, not plaza, not onPath => override for matching kind', () => {
    const res = hubPoiFloorOverride({
      x: shrine.x,
      y: shrine.y,
      plaza: false,
      onPath: false,
      pois: [shrine],
      noise: 0.5,
    });
    expect(res).toBe('tile_hub_2');
  });
});

describe('findPoiNear', () => {
  test('returns POI within radius+pad', () => {
    expect(findPoiNear(shrine.x, shrine.y, [shrine], 1.5)).toBe(shrine);
  });

  test('returns null outside radius+pad', () => {
    expect(findPoiNear(32, 32, [shrine], 1.5)).toBeNull();
  });

  test('respects custom pad boundary', () => {
    // distance from shrine center to point: radius + 1.0
    const x = shrine.x + shrine.radius + 1.0;
    expect(findPoiNear(x, shrine.y, [shrine], 1.5)).toBe(shrine);
    expect(findPoiNear(x, shrine.y, [shrine], 0.5)).toBeNull();
  });
});

describe('pickPoiFloorTile', () => {
  const cases: Array<[PoiKind, number, string]> = [
    ['grove', 0.5, 'tile_hub_3'],
    ['grove', 0.8, 'tile_hub_4'],
    ['grove', 0.95, 'tile_hub_2'],
    ['shrine', 0.5, 'tile_hub_2'],
    ['shrine', 0.8, 'tile_hub_1'],
    ['warren', 0.5, 'tile_hub_2'],
    ['warren', 0.8, 'tile_hub_1'],
    ['warren', 0.95, 'tile_hub_0'],
    ['ruin', 0.5, 'tile_hub_2'],
    ['ruin', 0.8, 'tile_hub_1'],
    ['ruin', 0.95, 'tile_hub_0'],
    ['cairn', 0.5, 'tile_hub_2'],
    ['cairn', 0.8, 'tile_hub_1'],
    ['cairn', 0.95, 'tile_hub_0'],
    ['watch', 0.5, 'tile_hub_2'],
    ['watch', 0.85, 'tile_hub_1'],
    ['camp', 0.5, 'tile_hub_2'],
    ['camp', 0.8, 'tile_hub_3'],
    ['scout', 0.5, 'tile_hub_2'],
    ['scout', 0.8, 'tile_hub_3'],
  ];

  for (const [kind, n, expected] of cases) {
    test(`${kind} n=${n} => ${expected}`, () => {
      expect(pickPoiFloorTile(kind, n)).toBe(expected);
    });
  }
});
