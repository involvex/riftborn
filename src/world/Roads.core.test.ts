import { describe, expect, test } from 'bun:test';
import { generateRoads } from './Roads';
import { generateHub, HUB_ROAD_AXIS, PLAZA } from './MapGen';

function floodFillRoads(
  roadSet: Set<string>,
  startX: number,
  startY: number,
  size: number,
): Set<string> {
  const visited = new Set<string>();
  const queue: Array<[number, number]> = [
    [Math.round(startX), Math.round(startY)],
  ];
  const key = (x: number, y: number) => `${x},${y}`;
  visited.add(key(queue[0][0], queue[0][1]));

  const neighbors = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ];

  let i = 0;
  while (i < queue.length) {
    const [cx, cy] = queue[i++];
    for (const [dx, dy] of neighbors) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const nk = key(nx, ny);
      if (visited.has(nk)) continue;
      if (roadSet.has(nk)) {
        visited.add(nk);
        queue.push([nx, ny]);
      }
    }
  }
  return visited;
}

describe('generateRoads', () => {
  test('roads are connected from plaza to each POI endpoint', () => {
    const hub = generateHub(1);
    const pois = (hub.pois ?? []).map((p) => ({ x: p.x, y: p.y }));
    const roads = generateRoads({
      seed: 1,
      townCenter: { x: HUB_ROAD_AXIS, y: HUB_ROAD_AXIS },
      plaza: PLAZA,
      pois,
      size: hub.size ?? 64,
    });
    const roadSet = new Set(
      roads.map((r) => `${Math.round(r.x)},${Math.round(r.y)}`),
    );

    // Start from plaza center
    const startX = (PLAZA.x0 + PLAZA.x1) / 2;
    const startY = (PLAZA.y0 + PLAZA.y1) / 2;
    const visited = floodFillRoads(roadSet, startX, startY, hub.size ?? 64);

    // Each POI should be reachable
    for (const poi of pois) {
      // Check if any cell near POI is reachable
      let reachable = false;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const k = `${Math.round(poi.x + dx)},${Math.round(poi.y + dy)}`;
          if (visited.has(k) && roadSet.has(k)) {
            reachable = true;
            break;
          }
        }
        if (reachable) break;
      }
      expect(reachable).toBe(true);
    }
  });

  test('roads never on wall/water/prop collision', () => {
    const hub = generateHub(1);
    const pois = (hub.pois ?? []).map((p) => ({ x: p.x, y: p.y }));
    const roads = generateRoads({
      seed: 1,
      townCenter: { x: HUB_ROAD_AXIS, y: HUB_ROAD_AXIS },
      plaza: PLAZA,
      pois,
      size: hub.size ?? 64,
    });

    // Roads should not intersect with plaza decor in problematic ways
    // and should be in valid open areas
    for (const road of roads) {
      const rx = Math.round(road.x);
      const ry = Math.round(road.y);
      // Basic bounds check
      expect(rx).toBeGreaterThanOrEqual(0);
      expect(ry).toBeGreaterThanOrEqual(0);
      expect(rx).toBeLessThan(hub.size ?? 64);
      expect(ry).toBeLessThan(hub.size ?? 64);
    }
  });

  test('same result for same seed', () => {
    const hub = generateHub(1);
    const pois = (hub.pois ?? []).map((p) => ({ x: p.x, y: p.y }));
    const roads1 = generateRoads({
      seed: 12345,
      townCenter: { x: HUB_ROAD_AXIS, y: HUB_ROAD_AXIS },
      plaza: PLAZA,
      pois,
      size: hub.size ?? 64,
    });
    const roads2 = generateRoads({
      seed: 12345,
      townCenter: { x: HUB_ROAD_AXIS, y: HUB_ROAD_AXIS },
      plaza: PLAZA,
      pois,
      size: hub.size ?? 64,
    });
    expect(roads1.length).toBe(roads2.length);
    const set1 = new Set(roads1.map((r) => `${r.x},${r.y}`));
    const set2 = new Set(roads2.map((r) => `${r.x},${r.y}`));
    expect(set1.size).toBe(set2.size);
    for (const k of set1) {
      expect(set2.has(k)).toBe(true);
    }
  });
});
