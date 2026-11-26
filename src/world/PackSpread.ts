/**
 * Spread pack members onto neighboring tiles so count>1 does not
 * stack every foe on the same iso diamond (combat readability).
 */

export type PackOffset = { x: number; y: number };

/** 8-way ring, then next ring, etc. Index 0 stays on the pack center. */
const RING: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
];

/** World-space tile offset for pack member `index` of `count`. */
export function packMemberWorldOffset(
  index: number,
  count: number,
): PackOffset {
  if (count <= 1 || index <= 0) return { x: 0, y: 0 };
  const slot = index - 1;
  const dir = RING[slot % RING.length]!;
  const ring = 1 + Math.floor(slot / RING.length);
  return { x: dir[0]! * ring, y: dir[1]! * ring };
}

/**
 * Pick a free snapped tile near pack center. Tries ring offsets in
 * order; falls back to center if nothing walkable/free.
 */
export function resolvePackMemberTile(
  packX: number,
  packY: number,
  index: number,
  count: number,
  occupied: Set<string>,
  walkable: (x: number, y: number) => boolean,
): { x: number; y: number } {
  const attempts = Math.max(count + 8, 12);
  for (let a = 0; a < attempts; a++) {
    const off =
      a === 0
        ? packMemberWorldOffset(index, count)
        : packMemberWorldOffset(index + a, count + a);
    const x = Math.floor(packX + off.x) + 0.5;
    const y = Math.floor(packY + off.y) + 0.5;
    const key = `${Math.floor(x)},${Math.floor(y)}`;
    if (occupied.has(key)) continue;
    if (!walkable(x, y)) continue;
    occupied.add(key);
    return { x, y };
  }
  const fx = Math.floor(packX) + 0.5;
  const fy = Math.floor(packY) + 0.5;
  occupied.add(`${Math.floor(fx)},${Math.floor(fy)}`);
  return { x: fx, y: fy };
}
