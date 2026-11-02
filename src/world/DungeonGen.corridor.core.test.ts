import { describe, expect, test } from 'bun:test';
import {
  findDiagonalCorridorCell,
  generateDungeon,
  type DungeonMap,
} from './DungeonGen';

function inRoom(
  x: number,
  y: number,
  rooms: { x: number; y: number; w: number; h: number }[],
): boolean {
  return rooms.some(
    (r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h,
  );
}

/** True when (x,y) sits inside some fully-floor 2×2 block. */
function inFloor2x2(cells: DungeonMap['cells'], x: number, y: number): boolean {
  for (const [dx, dy] of [
    [0, 0],
    [-1, 0],
    [0, -1],
    [-1, -1],
  ] as const) {
    const ox = x + dx;
    const oy = y + dy;
    if (
      cells[oy]?.[ox] === 1 &&
      cells[oy]?.[ox + 1] === 1 &&
      cells[oy + 1]?.[ox] === 1 &&
      cells[oy + 1]?.[ox + 1] === 1
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Corridor cells (floor outside rooms) must keep a ≥2-tile cross-section
 * in travel direction — approximated as membership in a floor 2×2.
 */
function assertCorridorMinWidth(map: DungeonMap, label: string): void {
  let corridorCells = 0;
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (map.cells[y]![x] !== 1) continue;
      if (inRoom(x, y, map.rooms)) continue;
      corridorCells += 1;
      expect(
        inFloor2x2(map.cells, x, y),
        `${label} corridor (${x},${y}) lacks 2-tile cross-section`,
      ).toBe(true);
    }
  }
  expect(
    corridorCells,
    `${label} expected some corridor cells`,
  ).toBeGreaterThan(0);
}

/** Gated corridor tiles must span a 2-wide strip (same layer). */
function assertGatesTwoWide(map: DungeonMap, label: string): void {
  const gates = map.layerGates;
  let gated = 0;
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const g = gates[y]![x];
      if (g === null) continue;
      if (map.cells[y]![x] !== 1) continue;
      gated += 1;
      const pairOk =
        (gates[y]![x + 1] === g && map.cells[y]![x + 1] === 1) ||
        (gates[y]![x - 1] === g && map.cells[y]![x - 1] === 1) ||
        (gates[y + 1]?.[x] === g && map.cells[y + 1]?.[x] === 1) ||
        (gates[y - 1]?.[x] === g && map.cells[y - 1]?.[x] === 1);
      expect(pairOk, `${label} gate (${x},${y}) not 2-wide`).toBe(true);
    }
  }
  // Not every seed stamps gates (short paths), but most depth≥3 should.
  void gated;
}

describe('DungeonGen corridor width', () => {
  test('50 seeds: corridor cells have ≥2-tile cross-section', () => {
    for (let i = 1; i <= 50; i++) {
      const map = generateDungeon(i * 997, 3 + (i % 5));
      assertCorridorMinWidth(map, `seed ${i}`);
      assertGatesTwoWide(map, `seed ${i}`);
    }
  });

  test('seed 99 depth 1 has a narrow diagonal corridor sample', () => {
    const map = generateDungeon(99, 1);
    const cell = findDiagonalCorridorCell(map);
    expect(cell).not.toBeNull();
    expect(nearRoomForTest(cell!.x, cell!.y, map.rooms)).toBe(false);
  });
});

function nearRoomForTest(
  x: number,
  y: number,
  rooms: { x: number; y: number; w: number; h: number }[],
): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (inRoom(x + dx, y + dy, rooms)) return true;
    }
  }
  return false;
}
