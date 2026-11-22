/**
 * Phone HUD geometry (landscape-first) as pure rectangles / circles.
 *
 * Left:  stick + DASH + SHIFT
 * Right: ATK + E + four skills (2×2 cluster landscape; stack portrait)
 * Top:   status (HP/XP/bounty/set + FPS) left; minimap right; chrome
 *        under minimap (never over the status strip).
 *
 * Sizes are CSS-intent. On Low graphics the Phaser game is the buffer
 * (CSS × renderScale) stretched to the viewport — use
 * `computeGameTouchLayout` at runtime so pads are not overscaled.
 */

import { getAppliedGraphicsSizes } from '../core/GraphicsQuality';

export type TouchPoint = { x: number; y: number; r: number };

export type Rect = { x: number; y: number; w: number; h: number };

export type TouchLayout = {
  pad: number;
  landscape: boolean;
  stick: TouchPoint;
  dash: TouchPoint;
  /** World shift (Q) — above DASH, ≥44px hit. */
  shift: TouchPoint;
  atk: TouchPoint;
  interact: TouchPoint;
  /** [0]=slot1 … [3]=slot4 — fan around ATK (thumb reach). */
  skillSlots: TouchPoint[];
  /** BAG / CHAR / SKILL / MAP / MENU — ≥44px diameter. */
  chromeButtons: TouchPoint[];
  /** @deprecated use chromeButtons; kept for callers reading y/r/gap. */
  chrome: { y: number; r: number; gap: number; count: number };
  mapSize: number;
  minimap: Rect;
  status: Rect;
  menuBadge: { x: number; y: number; r: number };
  /** Return-to-town (B) — left of minimap, ≥44px hit. */
  townButton: TouchPoint;
};

export const TOUCH_CHROME_COUNT = 5;

/** Meta + bars + bounty + set + FPS strip height. */
export const TOUCH_STATUS_H = 128;

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

export function circleRect(c: TouchPoint): Rect {
  return { x: c.x - c.r, y: c.y - c.r, w: c.r * 2, h: c.r * 2 };
}

export function scaleTouchPoint(p: TouchPoint, s: number): TouchPoint {
  return { x: p.x * s, y: p.y * s, r: Math.max(1, p.r * s) };
}

export function scaleRect(r: Rect, s: number): Rect {
  return { x: r.x * s, y: r.y * s, w: r.w * s, h: r.h * s };
}

/** Map a CSS-intent layout into Phaser buffer coordinates. */
export function scaleTouchLayout(layout: TouchLayout, s: number): TouchLayout {
  if (Math.abs(s - 1) < 1e-6) return layout;
  return {
    pad: layout.pad * s,
    landscape: layout.landscape,
    stick: scaleTouchPoint(layout.stick, s),
    dash: scaleTouchPoint(layout.dash, s),
    shift: scaleTouchPoint(layout.shift, s),
    atk: scaleTouchPoint(layout.atk, s),
    interact: scaleTouchPoint(layout.interact, s),
    skillSlots: layout.skillSlots.map((p) => scaleTouchPoint(p, s)),
    chromeButtons: layout.chromeButtons.map((p) => scaleTouchPoint(p, s)),
    chrome: {
      y: layout.chrome.y * s,
      r: Math.max(1, layout.chrome.r * s),
      gap: layout.chrome.gap * s,
      count: layout.chrome.count,
    },
    mapSize: layout.mapSize * s,
    minimap: scaleRect(layout.minimap, s),
    status: scaleRect(layout.status, s),
    menuBadge: scaleTouchPoint(layout.menuBadge, s),
    townButton: scaleTouchPoint(layout.townButton, s),
  };
}

/**
 * Runtime HUD layout for the live Phaser game size (often the Low
 * buffer). Metrics stay CSS-intent, then shrink by renderScale so
 * canvas stretch does not inflate pads / menus.
 */
export function computeGameTouchLayout(
  gameW: number,
  gameH: number,
): TouchLayout {
  const { logical, buffer, renderScale } = getAppliedGraphicsSizes();
  const s = renderScale > 0.01 ? Math.min(1, Math.max(0.35, renderScale)) : 1;
  const useLogical =
    buffer.width > 0 &&
    buffer.height > 0 &&
    Math.abs(buffer.width - gameW) < 2.5 &&
    Math.abs(buffer.height - gameH) < 2.5 &&
    logical.width > 0 &&
    logical.height > 0;
  const cssW = useLogical ? logical.width : Math.round(gameW / s);
  const cssH = useLogical ? logical.height : Math.round(gameH / s);
  return scaleTouchLayout(computeTouchLayout(cssW, cssH), s);
}

export function computeTouchLayout(width: number, height: number): TouchLayout {
  const landscape = width >= height;
  const short = Math.min(width, height);
  const pad = Math.max(8, Math.round(short * 0.022));
  const gap = Math.max(8, Math.round(short * 0.024));

  const mapSize = landscape
    ? Math.min(96, Math.round(short * 0.24))
    : Math.min(88, Math.round(short * 0.22));

  const minimap: Rect = {
    x: width - mapSize - 8,
    y: 8,
    w: mapSize,
    h: mapSize,
  };

  // Status strip (HudBars + Fps) — top-left, clear of chrome/minimap.
  const statusW = Math.round(Math.min(148, Math.max(112, width * 0.2)));
  const status: Rect = {
    x: 8,
    y: 6,
    w: statusW + 24,
    h: TOUCH_STATUS_H,
  };

  // —— Left: stick + dash ——
  const stickR = landscape
    ? Math.round(Math.min(44, short * 0.12))
    : Math.round(Math.min(40, short * 0.115));
  const stick = {
    x: pad + stickR + 2,
    y: height - pad - stickR - (landscape ? 2 : 10),
    r: stickR,
  };
  const dashR = Math.max(22, Math.round(stickR * 0.5));
  const dash = {
    x: stick.x + stickR + dashR + gap,
    y: stick.y,
    r: dashR,
  };
  const shiftR = Math.max(22, Math.round(dashR * 0.95));
  const shiftBtn: TouchPoint = {
    x: dash.x,
    y: dash.y - dashR * 2.35,
    r: shiftR,
  };

  // —— Right combat: ATK + E + skills ——
  const atkR = Math.max(
    22,
    landscape
      ? Math.round(Math.min(34, short * 0.092))
      : Math.round(Math.min(32, short * 0.088)),
  );
  const skillR = Math.max(22, Math.round(atkR * 0.58));
  const eR = Math.max(22, Math.round(atkR * 0.6));

  const atk = {
    x: width - pad - atkR - 4,
    y: height - pad - atkR - (landscape ? 4 : 12),
    r: atkR,
  };
  const interact = {
    x: atk.x - atkR - eR - gap,
    y: atk.y,
    r: eR,
  };

  // ≥44px diameter chrome — row under minimap, right-aligned (clears status).
  // Computed before skills so short landscape can clear the chrome row.
  const chromeR = 22;
  const chromeGap = chromeR * 2 + 8;
  const chromeY = minimap.y + minimap.h + pad + chromeR;

  // Skills: landscape always 2×2 next to ATK; portrait may use a short stack.
  const skillPitch = skillR * 2 + Math.max(6, Math.round(gap * 0.65));
  const chromeBottom = chromeY + chromeR;
  const yFloor = chromeBottom + skillR + 6;
  const skill0Y = interact.y - interact.r - skillR - Math.max(6, gap - 2);
  const stackFits = !landscape && skill0Y - 3 * skillPitch >= yFloor - 1;
  let skillSlots: TouchPoint[];
  if (stackFits) {
    skillSlots = [0, 1, 2, 3].map((i) => ({
      x: interact.x,
      y: skill0Y - i * skillPitch,
      r: skillR,
    }));
  } else {
    const pitch = skillR * 2 + Math.max(6, Math.round(gap * 0.7));
    const rightX = interact.x - interact.r - skillR - Math.max(6, gap - 2);
    const bottomY = Math.min(atk.y, height - pad - skillR);
    const topY = bottomY - pitch;
    skillSlots = [
      { x: rightX, y: bottomY, r: skillR },
      { x: rightX - pitch, y: bottomY, r: skillR },
      { x: rightX, y: topY, r: skillR },
      { x: rightX - pitch, y: topY, r: skillR },
    ].map((s) => ({
      x: Math.max(skillR + 2, Math.min(width - skillR - 2, s.x)),
      y: Math.max(yFloor, Math.min(height - pad - skillR, s.y)),
      r: skillR,
    }));
  }
  const chromeButtons: TouchPoint[] = [];
  const rightmostX = minimap.x + minimap.w - chromeR;
  for (let i = 0; i < TOUCH_CHROME_COUNT; i++) {
    // Index 0 = leftmost (BAG) … last = rightmost (MENU) under map.
    const fromRight = TOUCH_CHROME_COUNT - 1 - i;
    chromeButtons.push({
      x: rightmostX - fromRight * chromeGap,
      y: chromeY,
      r: chromeR,
    });
  }

  // If the row would clip into the status block, drop it to a column
  // left of the minimap instead.
  let useColumn = false;
  for (const btn of chromeButtons) {
    if (rectsOverlap(status, circleRect(btn))) {
      useColumn = true;
      break;
    }
  }
  if (useColumn || chromeButtons[0]!.x - chromeR < status.x + status.w + 8) {
    const colX = minimap.x - gap - chromeR;
    const colStartY = minimap.y + chromeR;
    for (let i = 0; i < TOUCH_CHROME_COUNT; i++) {
      chromeButtons[i] = {
        x: Math.max(status.x + status.w + chromeR + 8, colX),
        y: colStartY + i * chromeGap,
        r: chromeR,
      };
    }
  }

  const chrome = {
    y: chromeButtons[0]!.y,
    r: chromeR,
    gap: chromeGap,
    count: TOUCH_CHROME_COUNT,
  };

  const menuBadge = {
    x: minimap.x + minimap.w - 14,
    y: minimap.y + 14,
    r: 14,
  };

  // Town (B) — round hit left of minimap, clears status + chrome column.
  const townR = 22;
  let townX = minimap.x - gap - townR;
  let townY = minimap.y + townR;
  const menuBtn = chromeButtons[TOUCH_CHROME_COUNT - 1]!;
  // If chrome sits as a column left of the map, park town above/left of it.
  if (menuBtn.x < minimap.x) {
    townX = Math.min(townX, menuBtn.x - chromeGap);
    townY = minimap.y + townR;
  }
  // Keep clear of the HP/XP strip.
  if (townX - townR < status.x + status.w + 8) {
    townX = status.x + status.w + 8 + townR;
    townY = minimap.y + minimap.h + pad + townR;
    // Prefer still left of map when status is short.
    if (townX + townR < minimap.x - 2) {
      townY = minimap.y + townR;
    }
  }
  const townButton: TouchPoint = { x: townX, y: townY, r: townR };

  return {
    pad,
    landscape,
    stick,
    dash,
    shift: shiftBtn,
    atk,
    interact,
    skillSlots,
    chromeButtons,
    chrome,
    mapSize,
    minimap,
    status,
    menuBadge,
    townButton,
  };
}
