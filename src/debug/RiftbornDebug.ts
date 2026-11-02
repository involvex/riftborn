import { gameEvents } from '../core/EventBus';
import {
  currentGraphicsProfile,
  getAppliedRenderScale,
} from '../core/GraphicsQuality';
import { settingsStore } from '../core/SettingsStore';
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

export type RiftbornShiftSnap = {
  enabled: boolean;
  layer: 'ash' | 'shadow';
  energy: number;
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
  shift: RiftbornShiftSnap;
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
  /** Open bag overlay (layout screenshots / agents). */
  openInventory: () => void;
  /** Open character overlay. */
  openCharacter: () => void;
  /** Enter a rift (hub only) for scale / dungeon screenshots. */
  enterRift: () => boolean;
  /** Warp onto a diagonal corridor bend (rift only). */
  gotoDiagonalCorridor: () => boolean;
  /** Walk along a stair corridor with real move; returns distance. */
  walkDiagonalCorridor: (steps?: number) => number;
  /** Drop gear at the player for E-button label screenshots. */
  spawnLootNearPlayer: () => boolean;
  /** Current context E-button hint. */
  interactHint: () => { label: string; dimmed: boolean; kind: string };
  /** Expand / collapse the touch chrome tray (BAG/CHAR/…). */
  setTouchChrome: (open: boolean) => void;
  /** Whether the touch chrome tray is open. */
  touchChromeOpen: () => boolean;
  /** Live graphics profile for mobile perf checks. */
  graphicsProfile: () => {
    setting: string;
    tier: string;
    renderScale: number;
    particleCap: number;
  };
};

export type RiftbornSnapshotSource = {
  hubSize: number;
  inRift: boolean;
  player: { x: number; y: number };
  enemies: RiftbornEnemySnap[];
  pois: RiftbornPoiSnap[];
  chests: RiftbornChestSnap[];
  shift: RiftbornShiftSnap;
};

export type RiftbornDebugHooks = {
  getSource: () => RiftbornSnapshotSource;
  /** Return true when a rift load was started. */
  enterRift?: () => boolean;
  /** Warp onto a diagonal corridor bend (rift only). */
  gotoDiagonalCorridor?: () => boolean;
  /** Walk along a stair corridor with real move; returns distance. */
  walkDiagonalCorridor?: (steps?: number) => number;
  spawnLootNearPlayer?: () => boolean;
  interactHint?: () => { label: string; dimmed: boolean; kind: string };
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
    shift: { ...src.shift },
  };
}

let source: (() => RiftbornSnapshotSource) | null = null;
let enterRiftHook: (() => boolean) | null = null;
let gotoDiagonalHook: (() => boolean) | null = null;
let walkDiagonalHook: ((steps?: number) => number) | null = null;
let spawnLootHook: (() => boolean) | null = null;
let interactHintHook:
  (() => { label: string; dimmed: boolean; kind: string }) | null = null;
let touchChromeOpen = false;
let touchChromeListening = false;

function ensureTouchChromeListener(): void {
  if (touchChromeListening) return;
  touchChromeListening = true;
  gameEvents.on('ui:touchChrome', (p) => {
    touchChromeOpen = !!(p as { open?: boolean }).open;
  });
}

/** Publish live world state for Cursor agents / Playwright. */
export function installRiftbornDebug(
  getSource: (() => RiftbornSnapshotSource) | RiftbornDebugHooks,
): void {
  ensureTouchChromeListener();
  if (typeof getSource === 'function') {
    source = getSource;
    enterRiftHook = null;
    gotoDiagonalHook = null;
    walkDiagonalHook = null;
    spawnLootHook = null;
    interactHintHook = null;
  } else {
    source = getSource.getSource;
    enterRiftHook = getSource.enterRift ?? null;
    gotoDiagonalHook = getSource.gotoDiagonalCorridor ?? null;
    walkDiagonalHook = getSource.walkDiagonalCorridor ?? null;
    spawnLootHook = getSource.spawnLootNearPlayer ?? null;
    interactHintHook = getSource.interactHint ?? null;
  }
  const emptyHint = { label: 'E', dimmed: true, kind: 'none' };
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
          shift: { enabled: false, layer: 'ash', energy: 0 },
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
    openInventory: () => gameEvents.emit('ui:openInventory', {}),
    openCharacter: () => gameEvents.emit('ui:openCharacter', {}),
    enterRift: () => (enterRiftHook ? enterRiftHook() : false),
    gotoDiagonalCorridor: () => (gotoDiagonalHook ? gotoDiagonalHook() : false),
    walkDiagonalCorridor: (steps?: number) =>
      walkDiagonalHook ? walkDiagonalHook(steps) : 0,
    spawnLootNearPlayer: () => (spawnLootHook ? spawnLootHook() : false),
    interactHint: () => (interactHintHook ? interactHintHook() : emptyHint),
    setTouchChrome: (open: boolean) => {
      gameEvents.emit('ui:setTouchChrome', { open });
      touchChromeOpen = open;
    },
    touchChromeOpen: () => touchChromeOpen,
    graphicsProfile: () => {
      const setting = settingsStore.get().graphicsQuality;
      const p = currentGraphicsProfile();
      return {
        setting,
        tier: p.tier,
        renderScale: getAppliedRenderScale(),
        particleCap: p.particleCap,
      };
    },
  };
  window.__RIFTBORN = api;
}

export function clearRiftbornDebug(): void {
  source = null;
  enterRiftHook = null;
  gotoDiagonalHook = null;
  walkDiagonalHook = null;
  spawnLootHook = null;
  interactHintHook = null;
  touchChromeOpen = false;
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
        shift: { enabled: false, layer: 'ash', energy: 0 },
      }),
      hostilesNearTown: () => 0,
      nearestHostileDistToPlaza: () => Number.POSITIVE_INFINITY,
      openInventory: () => {},
      openCharacter: () => {},
      enterRift: () => false,
      gotoDiagonalCorridor: () => false,
      walkDiagonalCorridor: () => 0,
      spawnLootNearPlayer: () => false,
      interactHint: () => ({ label: 'E', dimmed: true, kind: 'none' }),
      setTouchChrome: () => {},
      touchChromeOpen: () => false,
      graphicsProfile: () => ({
        setting: 'auto',
        tier: 'high',
        renderScale: 1,
        particleCap: 12,
      }),
    };
  }
}
