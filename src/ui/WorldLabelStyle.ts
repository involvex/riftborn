/**
 * World-space label sizes (NPC names, E prompts, building titles).
 * Phaser-free so unit tests run headless.
 *
 * These sit under the world camera (zoom already scales them). Do NOT
 * also multiply by renderScale — that is the HUD-buffer trick and
 * would shrink world copy again on Low/Medium.
 */

export type WorldLabelKind =
  'name' | 'prompt' | 'building' | 'poiTitle' | 'poiSub';

export type WorldLabelProfile = 'desktop' | 'touch';

export type WorldLabelStyle = {
  fontFamily: string;
  fontSize: string;
  /** Phaser Text resolution (2 = sharp on stretched buffers). */
  resolution: number;
  strokeThickness: number;
  backgroundColor?: string;
  padding?: { x: number; y: number };
};

const DESKTOP_PX: Record<WorldLabelKind, number> = {
  name: 12,
  prompt: 11,
  building: 13,
  poiTitle: 13,
  poiSub: 10,
};

const TOUCH_PX: Record<WorldLabelKind, number> = {
  name: 16,
  prompt: 16,
  building: 16,
  poiTitle: 16,
  poiSub: 13,
};

const FONT: Record<WorldLabelKind, string> = {
  name: 'Georgia, serif',
  prompt: 'Segoe UI, sans-serif',
  building: 'Georgia, serif',
  poiTitle: 'Georgia, serif',
  poiSub: 'Segoe UI, sans-serif',
};

/** CSS-intent px before Phaser string formatting. */
export function worldLabelPx(
  kind: WorldLabelKind,
  profile: WorldLabelProfile,
): number {
  return profile === 'touch' ? TOUCH_PX[kind] : DESKTOP_PX[kind];
}

/**
 * Style bag for Phaser Text.create / setStyle.
 * Always resolution 2 so Low/Medium buffer stretch stays legible.
 */
export function worldLabelStyle(
  kind: WorldLabelKind,
  profile: WorldLabelProfile,
  opts?: { textResolution?: number },
): WorldLabelStyle {
  const resolution = opts?.textResolution ?? 2;
  const base: WorldLabelStyle = {
    fontFamily: FONT[kind],
    fontSize: `${worldLabelPx(kind, profile)}px`,
    resolution,
    strokeThickness:
      kind === 'poiSub' ? 3 : Math.max(3, profile === 'touch' ? 4 : 3),
  };
  if (kind === 'prompt') {
    return {
      ...base,
      backgroundColor: '#0a0c10aa',
      padding: {
        x: profile === 'touch' ? 6 : 4,
        y: profile === 'touch' ? 3 : 2,
      },
    };
  }
  return base;
}
