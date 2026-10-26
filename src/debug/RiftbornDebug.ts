import { HUB_SIZE, nearTown, PLAZA } from '../world/MapGen';

export type RiftbornEnemySnap = {
  id: string;
  defId: string;
  x: number;
  y: number;
  alive: boolean;
};

export type RiftbornPoiSnap = {
  id: string;
  kind: string;
  name: string;
  x: number;
  y: number;
  radius: number;
};

export type RiftbornChestSnap = {
  id: string;
  x: number;
  y: number;
  looted: boolean;
  lootTier: number;
};

export type RiftbornSnapshot = {
  ready: boolean;
  hubSize: number;
  plaza: { x0: number; x1: number; y0: number; y1: number };
  inRift: boolean;
  player: { x: number; y: number };
  enemies: RiftbornEnemySnap[];
  pois: RiftbornPoiSnap[];
  chests: RiftbornChestSnap[];
  /** Distance from plaza edge to nearest living enemy (Infinity if none). */
  nearestHostileDistToPlaza: number;
  /** Alive hostiles inside the soft town buffer (default margin 10). */
  hostilesNearTown: number;
};

export type RiftbornApi = {
  /** True once WorldScene has published a hub/rift snapshot provider. */
  ready: boolean;
  /** Full plaza / enemy / POI / chest snapshot for agents & smoke tests. */
  snapshot: () => RiftbornSnapshot;
  /** Count living enemies within the town soft buffer. */
  hostilesNearTown: (margin?: number) => number;
  /** Min distance from plaza rectangle edge to a living enemy. */
  nearestHostileDistToPlaza: () => number;
};

export type RiftbornSnapshotSource = {
  hubSize: number;
  inRift: boolean;
  player: { x: number; y: number };
  enemies: RiftbornEnemySnap[];
  pois: RiftbornPoiSnap[];
  chests: RiftbornChestSnap[];
};

declare global {
  interface Window {
    __RIFTBORN?: RiftbornApi;
  }
}

/** Chebyshev-style distance outside an AABB (0 if inside). */
export function distToPlazaEdge(x: number, y: number): number {
  const dx = Math.max(PLAZA.x0 - x, 0, x - PLAZA.x1);
  const dy = Math.max(PLAZA.y0 - y, 0, y - PLAZA.y1);
  return Math.hypot(dx, dy);
}

function buildSnapshot(src: RiftbornSnapshotSource): RiftbornSnapshot {
  const alive = src.enemies.filter((e) => e.alive);
  let nearest = Number.POSITIVE_INFINITY;
  for (const e of alive) {
    nearest = Math.min(nearest, distToPlazaEdge(e.x, e.y));
  }
  const margin = 10;
  const nearCount = alive.filter((e) => nearTown(e.x, e.y, margin)).length;
  return {
    ready: true,
    hubSize: src.hubSize || HUB_SIZE,
    plaza: { ...PLAZA },
    inRift: src.inRift,
    player: { ...src.player },
    enemies: src.enemies.map((e) => ({ ...e })),
    pois: src.pois.map((p) => ({ ...p })),
    chests: src.chests.map((c) => ({ ...c })),
    nearestHostileDistToPlaza: nearest,
    hostilesNearTown: nearCount,
  };
}

let source: (() => RiftbornSnapshotSource) | null = null;

/** Publish live world state for Cursor agents / Playwright. */
export function installRiftbornDebug(
  getSource: () => RiftbornSnapshotSource,
): void {
  source = getSource;
  const api: RiftbornApi = {
    get ready() {
      return source !== null;
    },
    snapshot: () => {
      if (!source) {
        return {
          ready: false,
          hubSize: 0,
          plaza: { ...PLAZA },
          inRift: false,
          player: { x: 0, y: 0 },
          enemies: [],
          pois: [],
          chests: [],
          nearestHostileDistToPlaza: Number.POSITIVE_INFINITY,
          hostilesNearTown: 0,
        };
      }
      return buildSnapshot(source());
    },
    hostilesNearTown: (margin = 10) => {
      if (!source) return 0;
      return source().enemies.filter(
        (e) => e.alive && nearTown(e.x, e.y, margin),
      ).length;
    },
    nearestHostileDistToPlaza: () => {
      if (!source) return Number.POSITIVE_INFINITY;
      let nearest = Number.POSITIVE_INFINITY;
      for (const e of source().enemies) {
        if (!e.alive) continue;
        nearest = Math.min(nearest, distToPlazaEdge(e.x, e.y));
      }
      return nearest;
    },
  };
  window.__RIFTBORN = api;
}

export function clearRiftbornDebug(): void {
  source = null;
  if (window.__RIFTBORN) {
    window.__RIFTBORN = {
      ready: false,
      snapshot: () => ({
        ready: false,
        hubSize: 0,
        plaza: { ...PLAZA },
        inRift: false,
        player: { x: 0, y: 0 },
        enemies: [],
        pois: [],
        chests: [],
        nearestHostileDistToPlaza: Number.POSITIVE_INFINITY,
        hostilesNearTown: 0,
      }),
      hostilesNearTown: () => 0,
      nearestHostileDistToPlaza: () => Number.POSITIVE_INFINITY,
    };
  }
}
