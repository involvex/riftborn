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

/**
 * CSS layout size for the game — never physical/DPR pixels.
 * Prefer #app when laid out; fall back to document / inner / visualViewport.
 * Do **not** Math.min every candidate — a single undersized probe (common
 * mid-orientation on Android WebView) letterboxes the title UI.
 * Cap vs the largest layout probe so a 2× DPR false reading can't win.
 */
export function readCssViewport(): Size2 {
  if (typeof window === 'undefined') {
    return { width: 1280, height: 720 };
  }
  const app = document.getElementById('app');
  const vv = window.visualViewport;
  const doc = document.documentElement;
  const probes = (vals: Array<number | undefined | null>): number[] =>
    vals.filter(
      (n): n is number => typeof n === 'number' && Number.isFinite(n) && n > 1,
    );

  const widths = probes([
    app?.clientWidth,
    doc?.clientWidth,
    window.innerWidth,
    vv?.width,
  ]);
  const heights = probes([
    app?.clientHeight,
    doc?.clientHeight,
    window.innerHeight,
    vv?.height,
  ]);

  const pick = (list: number[], fallback: number): number => {
    if (!list.length) return fallback;
    // Prefer the first laid-out probe (#app → doc → inner).
    const primary = list[0]!;
    const largest = Math.max(...list);
    // Reject a primary that is wildly smaller than the layout max
    // (stale visualViewport / 0-layout race), but also reject a
    // primary that is ~2× the next-smallest (DPR-as-CSS bug).
    const sorted = [...list].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)]!;
    if (primary < median * 0.85) return Math.floor(median);
    if (primary > median * 1.35 && largest > median * 1.35) {
      return Math.floor(median);
    }
    return Math.floor(primary);
  };

  return {
    width: Math.max(320, pick(widths, 1280)),
    height: Math.max(180, pick(heights, 720)),
  };
}

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
  // Buffer resize + camera zoom×scale keep FOV; juice/particles also cut.
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
let appliedBuffer: Size2 = { width: 0, height: 0 };
let appliedLogical: Size2 = { width: 0, height: 0 };
let resizeHooked = false;
let gameRef: Phaser.Game | null = null;

/**
 * FOV-safe Low fillrate:
 * - Phaser game size = buffer (CSS × renderScale) for GPU fill-rate.
 * - Canvas CSS stretches to 100% of the parent (full viewport).
 * - Cameras use getAppliedCameraZoom(base) = base × renderScale so the
 *   visible world tile span matches High.
 * - Juice/particles/text caps still cut via the profile.
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
    const vp = readCssViewport();
    const sizes = computeGraphicsResize(vp.width, vp.height, p.renderScale);
    appliedLogical = sizes.logical;
    appliedBuffer = { ...sizes.buffer };
    // Resize the game to the buffer; CSS stretch below fills the viewport.
    gameRef.scale.resize(sizes.buffer.width, sizes.buffer.height);
    const parent = gameRef.canvas?.parentElement;
    if (parent) {
      parent.style.width = '100%';
      parent.style.height = '100%';
      parent.style.margin = '0';
      parent.style.overflow = 'hidden';
    }
    const c = gameRef.canvas;
    if (c) {
      // Stretch the smaller buffer up to the CSS viewport so UI is not cropped.
      c.style.position = 'absolute';
      c.style.left = '0';
      c.style.top = '0';
      c.style.width = '100%';
      c.style.height = '100%';
      c.style.maxWidth = '100%';
      c.style.maxHeight = '100%';
      c.style.margin = '0';
    }
  };

  resizeToProfile();

  if (!resizeHooked) {
    resizeHooked = true;
    const onResize = (): void => {
      requestAnimationFrame(resizeToProfile);
    };
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
  }
}

/** Re-apply after settings change. */
export function refreshGraphicsProfile(): void {
  if (gameRef) applyGraphicsProfile(gameRef);
}

export function getAppliedRenderScale(): number {
  return appliedScale;
}

/**
 * Camera zoom for world FOV. When Low shrinks the game to the buffer,
 * multiply base zoom by renderScale so tile span matches High.
 * Pair with `cameras.main.setZoom(getAppliedCameraZoom(1.1))`.
 */
export function getAppliedCameraZoom(baseZoom: number): number {
  return baseZoom * appliedScale;
}

/** Live sizes for probes / Playwright (FOV + fillrate checks). */
export function getAppliedGraphicsSizes(): {
  logical: Size2;
  buffer: Size2;
  renderScale: number;
} {
  return {
    logical: { ...appliedLogical },
    buffer: { ...appliedBuffer },
    renderScale: appliedScale,
  };
}
