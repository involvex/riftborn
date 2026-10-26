import { inPlaza, type WildernessPoi } from '../world/MapGen';

/** Terrain cell for top-down map (not iso). */
export type MapCellKind =
  'wall' | 'floor' | 'plaza' | 'path' | 'poi' | 'wild' | 'fog';

export type MapMarkerKind =
  'player' | 'npc' | 'poi' | 'chest' | 'elite' | 'boss' | 'portal' | 'mob';

export type MapMarker = {
  kind: MapMarkerKind;
  x: number;
  y: number;
  label?: string;
};

export type MapSnapshot = {
  width: number;
  height: number;
  /** Row-major: cells[y * width + x] */
  cells: MapCellKind[];
  markers: MapMarker[];
  inRift: boolean;
  /** When set, unexplored tiles render as fog on minimap / overlay. */
  explored?: boolean[];
};

export type MapBuildInput = {
  inRift: boolean;
  width: number;
  height: number;
  /** Rift: 1 = floor. Hub: ignored (derived). */
  riftFloor?: boolean[][];
  paths?: { x: number; y: number }[];
  pois?: WildernessPoi[];
  player: { x: number; y: number; facing: number };
  npcs: { x: number; y: number; name?: string }[];
  chests: { x: number; y: number; looted: boolean }[];
  enemies: {
    x: number;
    y: number;
    alive: boolean;
    elite: boolean;
    boss: boolean;
  }[];
  portal: { x: number; y: number } | null;
};

/** Build a top-down map snapshot from world state. */
export function buildMapSnapshot(input: MapBuildInput): MapSnapshot {
  const { width, height } = input;
  const cells: MapCellKind[] = new Array(width * height);
  const pathSet = new Set(
    (input.paths ?? []).map((p) => `${Math.floor(p.x)},${Math.floor(p.y)}`),
  );
  const pois = input.pois ?? [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (input.inRift) {
        const floor = input.riftFloor?.[y]?.[x] === true;
        cells[i] = floor ? 'floor' : 'wall';
        continue;
      }
      if (inPlaza(x, y)) {
        cells[i] = 'plaza';
      } else if (
        pois.some((p) => Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) <= p.radius)
      ) {
        cells[i] = 'poi';
      } else if (pathSet.has(`${x},${y}`)) {
        cells[i] = 'path';
      } else {
        cells[i] = 'wild';
      }
    }
  }

  const markers = buildMapMarkers(input);

  return {
    width,
    height,
    cells,
    markers,
    inRift: input.inRift,
  };
}

/** Markers only — cheap enough to rebuild every map tick. */
export function buildMapMarkers(input: MapBuildInput): MapMarker[] {
  const markers: MapMarker[] = [];
  for (const n of input.npcs) {
    markers.push({ kind: 'npc', x: n.x, y: n.y, label: n.name });
  }
  for (const p of input.pois ?? []) {
    markers.push({ kind: 'poi', x: p.x, y: p.y, label: p.name });
  }
  for (const c of input.chests) {
    if (c.looted) continue;
    markers.push({ kind: 'chest', x: c.x, y: c.y });
  }
  for (const e of input.enemies) {
    if (!e.alive) continue;
    if (e.boss) markers.push({ kind: 'boss', x: e.x, y: e.y });
    else if (e.elite) markers.push({ kind: 'elite', x: e.x, y: e.y });
    else markers.push({ kind: 'mob', x: e.x, y: e.y });
  }
  if (input.portal) {
    markers.push({
      kind: 'portal',
      x: input.portal.x,
      y: input.portal.y,
    });
  }
  markers.push({
    kind: 'player',
    x: input.player.x,
    y: input.player.y,
  });
  return markers;
}

export const MAP_CELL_COLOR: Record<MapCellKind, number> = {
  wall: 0x0a0c10,
  floor: 0x1c2836,
  plaza: 0x4a463c,
  path: 0x3a3830,
  poi: 0x3a3228,
  wild: 0x1c2620,
  fog: 0x080a0e,
};

export const MAP_MARKER_COLOR: Record<MapMarkerKind, number> = {
  player: 0xe8e4d8,
  npc: 0xc4a574,
  poi: 0x6ec6a0,
  chest: 0xe0c890,
  elite: 0x6ec6ff,
  boss: 0xff7043,
  portal: 0x4db6ff,
  mob: 0xa05050,
};
