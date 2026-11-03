/**
 * Compact skill names for round touch pads — whole words only,
 * sized so they fit inside the pad diameter.
 */

const KNOWN: Record<string, string> = {
  'War Leap': 'LEAP',
  'Cleaving Strike': 'SWEEP',
  Strike: 'HIT',
  'Shield Bash': 'BASH',
  'Rift Pulse': 'PULSE',
  'Spirit Pulse': 'PULSE',
  'Rift Slash': 'SLASH',
  'Binding Seal': 'SEAL',
  'Ward Seal': 'SEAL',
  'Arc Bolt': 'BOLT',
  'Frost Nova': 'NOVA',
  Nova: 'NOVA',
  'Rift Barrier': 'WARD',
  Barrier: 'WARD',
  'Arc Barrier': 'WARD',
};

/** Approximate painted width for bold sans caps (CSS-px). */
export function estimateLabelWidthPx(label: string, fontPx: number): number {
  return Math.ceil(label.length * fontPx * 0.58);
}

/** True when the label fits inside a circle of radius `padR`. */
export function touchSkillLabelFits(
  label: string,
  padR: number,
  fontPx: number,
): boolean {
  const maxW = Math.max(8, padR * 2 - 8);
  return estimateLabelWidthPx(label, fontPx) <= maxW;
}

/**
 * Largest font ≤ `maxFontPx` that still fits the label in the pad.
 * Floors at 10 so tiny pads stay barely readable.
 */
export function touchSkillFontPx(
  label: string,
  padR: number,
  maxFontPx: number,
): number {
  for (let px = Math.floor(maxFontPx); px >= 10; px--) {
    if (touchSkillLabelFits(label, padR, px)) return px;
  }
  return 10;
}

/**
 * Short uppercase label for a skill name. Prefer known maps; otherwise
 * the last word if it fits a typical pad, else a shorter word from the name.
 */
export function shortTouchSkillLabel(name: string): string {
  if (KNOWN[name]) return KNOWN[name]!;
  const parts = name.split(/\s+/).filter(Boolean);
  const upper = parts.map((p) => p.toUpperCase());
  const last = upper[upper.length - 1] ?? name.toUpperCase();
  // Prefer last word when it fits a 22px pad at 12px.
  if (touchSkillLabelFits(last, 22, 12)) return last;
  const shorter = upper
    .filter((p) => touchSkillLabelFits(p, 22, 12))
    .sort((a, b) => b.length - a.length)[0];
  if (shorter) return shorter;
  // Last resort: longest fitting prefix (still a contiguous abbrev).
  for (let n = Math.min(5, last.length); n >= 3; n--) {
    const slice = last.slice(0, n);
    if (touchSkillLabelFits(slice, 22, 12)) return slice;
  }
  return last.slice(0, 4);
}
