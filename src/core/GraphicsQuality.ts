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
  // renderScale is recorded for probes; live path keeps CSS FOV and cuts
  // juice/particles instead (FOV-safe buffer downscale still deferred).
  renderScale: 0.65,
  maxDamageNumbers: 8,
  particleCap: 3,
  juiceScale: 0.4,
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
 * M7 (Game Off): keep logical game size = CSS viewport (same FOV at
 * Low/High). Shrinking `scale.resize` by renderScale zooms the world —
 * do not re-enable that. Low cuts particles / juice / damage numbers.
 * `computeGraphicsResize` still documents a future FOV-safe buffer split.
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
    const logical = gameSizeForProfile(cssW, cssH, p.renderScale);
    // Always CSS size — Low/High show the same tile span.
    gameRef.scale.resize(logical.width, logical.height);
    if (gameRef.canvas) {
      gameRef.canvas.style.width = `${cssW}px`;
      gameRef.canvas.style.height = `${cssH}px`;
    }
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
