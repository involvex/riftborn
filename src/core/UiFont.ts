/**
 * Central UI type sizes. Touch profile floors everything at
 * TOUCH_FONT_MIN_PX so HUD copy stays legible on 1024×473 phones.
 */

export const TOUCH_FONT_MIN_PX = 12;

export const UI_FONT_ROLES = [
  'title',
  'meta',
  'body',
  'hud',
  'label',
  'caption',
  'slot',
  'fps',
  'rift',
  'pad',
  'skill',
  'hint',
] as const;

export type UiFontRole = (typeof UI_FONT_ROLES)[number];
export type UiFontProfile = 'desktop' | 'touch';

/** Base sizes before the touch floor. */
const DESKTOP: Record<UiFontRole, number> = {
  title: 22,
  meta: 15,
  body: 13,
  hud: 12,
  label: 12,
  caption: 11,
  slot: 10,
  fps: 11,
  rift: 11,
  pad: 12,
  skill: 11,
  hint: 11,
};

const TOUCH: Record<UiFontRole, number> = {
  title: 18,
  meta: 13,
  body: 13,
  hud: 13,
  label: 13,
  caption: 12,
  slot: 12,
  fps: 12,
  rift: 12,
  pad: 13,
  skill: 12,
  hint: 12,
};

/** Pixel size for a UI role under the given input profile. */
export function uiFontPx(role: UiFontRole, profile: UiFontProfile): number {
  const base = profile === 'touch' ? TOUCH[role] : DESKTOP[role];
  if (profile === 'touch') {
    return Math.max(TOUCH_FONT_MIN_PX, base);
  }
  return base;
}

/** Phaser-ready `Npx` string. */
export function uiFontSize(role: UiFontRole, profile: UiFontProfile): string {
  return `${uiFontPx(role, profile)}px`;
}
