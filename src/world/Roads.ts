import { mulberry32 } from './MapGen';

export type RoadCell = { x: number; y: number };

export type RoadGenOptions = {
  seed?: number;
  townCenter?: { x: number; y: number };
  plaza?: { x0: number; x1: number; y0: number; y1: number };
  pois?: Array<{ x: number; y: number }>;
  size?: number;
};

export function generateRoads(opts: RoadGenOptions = {}): RoadCell[] {
  const seed = opts.seed ?? 1;
  const rnd = mulberry32(seed);
  const townCenter = opts.townCenter ?? { x: 32, y: 32 };
  const plaza = opts.plaza ?? { x0: 28, x1: 36, y0: 28, y1: 36 };
  const pois = opts.pois ?? [];
  const size = opts.size ?? 64;

  const cells = new Set<string>();
  const add = (x: number, y: number) => {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= size || iy >= size) return;
    cells.add(`${ix},${iy}`);
  };

  // Plaza ring - 2-3 tiles wide around the plaza
  const ringOuter = 4; // distance from plaza edge
  for (let y = plaza.y0 - ringOuter; y <= plaza.y1 + ringOuter; y++) {
    for (let x = plaza.x0 - ringOuter; x <= plaza.x1 + ringOuter; x++) {
      // Check if it's in the ring (outside plaza but within ring distance)
      const inPlazaArea =
        x >= plaza.x0 && x <= plaza.x1 && y >= plaza.y0 && y <= plaza.y1;
      if (inPlazaArea) {
        add(x, y);
        continue;
      }
      // Ring: form a ring around plaza
      const distFromPlaza = Math.min(
        Math.abs(x - plaza.x0),
        Math.abs(x - plaza.x1),
        Math.abs(y - plaza.y0),
        Math.abs(y - plaza.y1),
      );
      if (distFromPlaza <= ringOuter && distFromPlaza >= 1) {
        // Make it 2-3 tiles wide
        if (rnd() < 0.9 || distFromPlaza <= 2) {
          add(x, y);
        }
      }
    }
  }

  // Also add a direct ring of 2-3 tiles width around plaza
  for (let y = plaza.y0 - 2; y <= plaza.y1 + 2; y++) {
    for (let x = plaza.x0 - 2; x <= plaza.x1 + 2; x++) {
      const inPlaza =
        x >= plaza.x0 && x <= plaza.x1 && y >= plaza.y0 && y <= plaza.y1;
      if (inPlaza) {
        add(x, y);
        continue;
      }
      // Border ring around plaza - 2-3 tiles wide
      if (
        (y === plaza.y0 - 1 ||
          y === plaza.y0 - 2 ||
          y === plaza.y1 + 1 ||
          y === plaza.y1 + 2) &&
        x >= plaza.x0 - 2 &&
        x <= plaza.x1 + 2
      ) {
        add(x, y);
        if (y === plaza.y0 - 1 || y === plaza.y1 + 1)
          add(x, y + (y === plaza.y0 - 1 ? -0 : 0)); // make wider
      }
      if (
        (x === plaza.x0 - 1 ||
          x === plaza.x0 - 2 ||
          x === plaza.x1 + 1 ||
          x === plaza.x1 + 2) &&
        y >= plaza.y0 - 1 &&
        y <= plaza.y1 + 1 &&
        !(y === plaza.y0 - 2 || y === plaza.y1 + 2)
      ) {
        add(x, y);
      }
    }
  }

  // Create paths from town center to each POI - 2-3 tiles wide, slightly curved
  for (const poi of pois) {
    const startX = townCenter.x;
    const startY = townCenter.y;
    const endX = poi.x;
    const endY = poi.y;

    // Draw a slightly curved path
    const steps = Math.max(
      Math.abs(Math.round(endX - startX)),
      Math.abs(Math.round(endY - startY)),
    );
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      // Add slight curve using noise
      const curve = Math.sin(t * Math.PI) * 0.5 * (rnd() - 0.5);
      const x = startX + (endX - startX) * t + curve;
      const y = startY + (endY - startY) * t;
      // Make road 2-3 tiles wide
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          // 2-3 tiles wide - mostly the center line plus adjacent
          if (Math.abs(dx) + Math.abs(dy) <= 2) {
            // creates width of ~3 tiles
            add(x + dx, y + dy);
          }
        }
      }
    }
    // End point at POI
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (Math.abs(dx) + Math.abs(dy) <= 2) {
          add(endX + dx, endY + dy);
        }
      }
    }
  }

  return Array.from(cells).map((s) => {
    const [x, y] = s.split(',').map(Number);
    return { x, y };
  });
}
