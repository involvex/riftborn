import type Phaser from 'phaser';
import { TILE_HEIGHT, TILE_WIDTH } from './IsoMath';
import { settingsStore, type GraphicsQualitySetting } from './SettingsStore';

/** Resolved runtime tier after Auto → High/Low. */
export type GraphicsTier = 'high' | 'low';

export type GraphicsProfile = {
  tier: GraphicsTier;
  /** Internal canvas buffer scale vs CSS size (1 = native). */
  renderScale: number;
  /** Max concurrent floating damage texts. */
  maxDamageNumbers: number;
  /** Cap concurrent combat particle bursts. */
  particleCap: number;
  /** Multiply hitstop / shake durations. */
  juiceScale: number;
  /** Damage-number font resolution (Phaser text). */
  textResolution: number;
};

export type Size2 = { width: number; height: number };

export type GraphicsResizeSizes = {
  /** Camera/world/game size — always CSS viewport (preserves FOV). */
  logical: Size2;
  /** Canvas backing store — CSS × renderScale (GPU fill-rate). */
  buffer: Size2;
  /** CSS display size — always viewport. */
  css: Size2;
};

/**
 * Logical Phaser game size — always CSS viewport.
 * renderScale must not shrink this (that zooms the world).
 */
export function gameSizeForProfile(
  cssW: number,
  cssH: number,
  _renderScale: number,
): Size2 {
  return {
    width: Math.max(320, Math.floor(cssW)),
    height: Math.max(180, Math.floor(cssH)),
  };
}

/** Backing-store size for lower GPU fill-rate (CSS × renderScale). */
export function bufferSizeForProfile(
  cssW: number,
  cssH: number,
  renderScale: number,
): Size2 {
  const scale = Math.min(1, Math.max(0.35, renderScale));
  return {
    width: Math.max(320, Math.floor(cssW * scale)),
    height: Math.max(180, Math.floor(cssH * scale)),
  };
}

/**
 * Split sizes for safe mobile downscale: logical/game == CSS (same FOV),
 * buffer == floor(CSS * renderScale), CSS display == CSS.
 */
export function computeGraphicsResize(
  cssW: number,
  cssH: number,
  renderScale: number,
): GraphicsResizeSizes {
  const logical = gameSizeForProfile(cssW, cssH, renderScale);
  const buffer = bufferSizeForProfile(cssW, cssH, renderScale);
  const css = {
    width: Math.max(320, Math.floor(cssW)),
    height: Math.max(180, Math.floor(cssH)),
  };
  return { logical, buffer, css };
}

/**
 * Approximate visible world tiles along screen axes at a camera zoom.
 * Used to assert Low/High show the same FOV.
 */
export function visibleWorldTileSpan(
  viewW: number,
  viewH: number,
  zoom: number,
): { tilesX: number; tilesY: number } {
  const z = Math.max(0.01, zoom);
  return {
    tilesX: viewW / z / TILE_WIDTH,
    tilesY: viewH / z / TILE_HEIGHT,
  };
}

const HIGH: GraphicsProfile = {
  tier: 'high',
  renderScale: 1,
  maxDamageNumbers: 28,
  particleCap: 12,
  juiceScale: 1,
  textResolution: 2,
};

const LOW: GraphicsProfile = {
  tier: 'low',
  renderScale: 0.65,
  maxDamageNumbers: 10,
  particleCap: 4,
  juiceScale: 0.45,
  textResolution: 1,
};

/** Same heuristics as TouchControls — kept local to avoid import cycles. */
export function prefersTouchChrome(): boolean {
  try {
    const w = window as Window & { __RIFTBORN_TOUCH?: number };
    if (w.__RIFTBORN_TOUCH) return true;
    const params = new URLSearchParams(window.location.search);
    if (params.has('touch') && params.get('touch') !== '0') return true;
    if (params.get('touch') === '0') return false;
  } catch {
    /* ignore */
  }
  if (typeof window === 'undefined') return false;
  const coarse =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;
  const small = Math.max(window.innerWidth, window.innerHeight) <= 900;
  return coarse || small;
}

/** Pure resolve — Auto uses touch / coarse pointer as Low. */
export function resolveGraphicsTier(
  setting: GraphicsQualitySetting,
  touchPreferred: boolean,
): GraphicsTier {
  if (setting === 'high') return 'high';
  if (setting === 'low') return 'low';
  return touchPreferred ? 'low' : 'high';
}

export function profileForTier(tier: GraphicsTier): GraphicsProfile {
  return tier === 'low' ? LOW : HIGH;
}

/** Live profile from settings + device. */
export function currentGraphicsProfile(): GraphicsProfile {
  const setting = settingsStore.get().graphicsQuality;
  return profileForTier(resolveGraphicsTier(setting, prefersTouchChrome()));
}

export function graphicsQualityLabel(setting: GraphicsQualitySetting): string {
  if (setting === 'auto') return 'Auto';
  if (setting === 'high') return 'High';
  return 'Low';
}

export function cycleGraphicsQuality(
  current: GraphicsQualitySetting,
): GraphicsQualitySetting {
  if (current === 'auto') return 'low';
  if (current === 'low') return 'high';
  return 'auto';
}

let appliedScale = 1;
let resizeHooked = false;
let gameRef: Phaser.Game | null = null;

/**
 * Keep logical game size = CSS viewport (same world FOV at Low/High).
 * At renderScale < 1, downscale only the canvas backing store (GPU fill-rate)
 * and stretch via CSS; gameSize/base camera space stays CSS so the world
 * is not zoomed. displayScale is kept as logical/canvasBounds for correct
 * input transforms.
 * Requires Phaser.Scale.NONE (see main.ts).
 */
export function applyGraphicsProfile(game: Phaser.Game): void {
  gameRef = game;
  const canvas = game.canvas;
  if (canvas) {
    canvas.style.display = 'block';
    canvas.style.imageRendering = 'pixelated';
  }

  const resizeToProfile = (): void => {
    if (!gameRef) return;
    const p = currentGraphicsProfile();
    appliedScale = p.renderScale;
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    const sizes = computeGraphicsResize(cssW, cssH, p.renderScale);

    // Establish logical (CSS) game size so cameras/world/FOV stay identical.
    gameRef.scale.resize(sizes.logical.width, sizes.logical.height);

    const cv = gameRef.canvas;
    if (cv) {
      cv.style.width = `${sizes.css.width}px`;
      cv.style.height = `${sizes.css.height}px`;
      if (cv.width !== sizes.buffer.width) cv.width = sizes.buffer.width;
      if (cv.height !== sizes.buffer.height) cv.height = sizes.buffer.height;
    }

    // Split backing store from logical game size when downscaling.
    gameRef.scale.baseSize.setSize(sizes.buffer.width, sizes.buffer.height);
    gameRef.scale.displaySize.setSize(sizes.css.width, sizes.css.height);

    const renderer = gameRef.renderer as unknown as {
      resize?: (w: number, h: number) => void;
    };
    renderer?.resize?.(sizes.buffer.width, sizes.buffer.height);

    // Keep input transform in logical/game coordinates (not buffer coords).
    gameRef.scale.updateBounds();
    const bounds = gameRef.scale.canvasBounds;
    const bw = Math.max(1, bounds.width);
    const bh = Math.max(1, bounds.height);
    gameRef.scale.displayScale.set(
      sizes.logical.width / bw,
      sizes.logical.height / bh,
    );
  };

  resizeToProfile();

  if (!resizeHooked) {
    resizeHooked = true;
    window.addEventListener('resize', () => {
      requestAnimationFrame(resizeToProfile);
    });
  }
}

/** Re-apply after settings change. */
export function refreshGraphicsProfile(): void {
  if (gameRef) applyGraphicsProfile(gameRef);
}

export function getAppliedRenderScale(): number {
  return appliedScale;
}
