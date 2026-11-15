import { describe, expect, test } from 'bun:test';
import { generateHub } from './MapGen';
import {
  HUB_FRINGE_DECOR_ATTEMPTS,
  HUB_PATH_EDGE_DECOR_CHANCE,
  isDungeonFloorEdge,
} from './HubOptics';

describe('HubOptics', () => {
  test('fringe decor budget is thinner than the old 96-pass clutter', () => {
    expect(HUB_FRINGE_DECOR_ATTEMPTS).toBeLessThan(80);
    expect(HUB_FRINGE_DECOR_ATTEMPTS).toBeGreaterThan(40);
  });

  test('path-edge props are sparse enough to keep roads readable', () => {
    expect(HUB_PATH_EDGE_DECOR_CHANCE).toBeLessThanOrEqual(0.12);
    expect(HUB_PATH_EDGE_DECOR_CHANCE).toBeGreaterThan(0.05);
  });

  test('generateHub decor stays under a readable ceiling', () => {
    const hub = generateHub(42);
    // Was ~266 with 96 fringe + 16% path edges; optics pass thins that.
    expect(hub.decor.length).toBeLessThan(220);
    expect(hub.decor.length).toBeGreaterThan(40);
  });

  test('isDungeonFloorEdge marks void-adjacent floors only', () => {
    const cells = [
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 0],
    ];
    expect(isDungeonFloorEdge(cells, 1, 1)).toBe(true);
    const solid = [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ];
    expect(isDungeonFloorEdge(solid, 1, 1)).toBe(false);
  });
});
