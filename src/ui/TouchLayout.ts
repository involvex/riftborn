/**
 * Phone HUD geometry (landscape-first) as pure rectangles / circles.
 *
 * Left:  stick + DASH
 * Right: skills column | E | ATK
 * Top:   status (HP/XP) left; minimap right; chrome under minimap
 *        (never over the status strip).
 */

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
  /** [0]=top, [1]=mid, [2]=bottom, [3]=lowest — column left of E. */
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

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

export function circleRect(c: TouchPoint): Rect {
  return { x: c.x - c.r, y: c.y - c.r, w: c.r * 2, h: c.r * 2 };
}

export function computeTouchLayout(width: number, height: number): TouchLayout {
  const landscape = width >= height;
  const short = Math.min(width, height);
  const pad = Math.max(8, Math.round(short * 0.022));
  const gap = Math.max(10, Math.round(short * 0.028));

  const mapSize = landscape
    ? Math.min(132, Math.round(short * 0.36))
    : Math.min(118, Math.round(short * 0.28));

  const minimap: Rect = {
    x: width - mapSize - 8,
    y: 8,
    w: mapSize,
    h: mapSize,
  };

  // Status strip (HudBars + Fps) — top-left, clear of chrome/minimap.
  const statusW = Math.round(Math.min(160, Math.max(120, width * 0.22)));
  const status: Rect = {
    x: 8,
    y: 6,
    w: statusW + 24,
    h: 86,
  };

  // —— Left: stick + dash ——
  const stickR = landscape
    ? Math.round(Math.min(52, short * 0.145))
    : Math.round(Math.min(46, short * 0.13));
  const stick = {
    x: pad + stickR + 2,
    y: height - pad - stickR - (landscape ? 2 : 10),
    r: stickR,
  };
  const dashR = Math.max(22, Math.round(stickR * 0.52));
  const dash = {
    x: stick.x + stickR + dashR + gap,
    y: stick.y,
    r: dashR,
  };
  const shiftR = Math.max(22, Math.round(dashR * 0.95));
  const shiftBtn: TouchPoint = {
    x: dash.x,
    y: dash.y - dashR * 2.4,
    r: shiftR,
  };

  // —— Right combat: ATK + E + skill column ——
  const atkR = Math.max(
    22,
    landscape
      ? Math.round(Math.min(40, short * 0.11))
      : Math.round(Math.min(38, short * 0.1)),
  );
  const skillR = Math.max(22, Math.round(atkR * 0.58));
  const eR = Math.max(22, Math.round(atkR * 0.55));

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

  const skillsX = interact.x - eR - skillR - gap;
  const skillPitch = skillR * 2 + gap;

  // Four ability pads stacked from the bottom edge; the column tightens
  // its pitch when the viewport is too short to clear the minimap.
  const skillBottom = height - pad - skillR;
  const skillTopFloor = minimap.y + minimap.h + skillR + 16;
  const skillAvail = skillBottom - skillTopFloor;
  const skillMaxPitch = Math.max(
    skillR * 2 + 2,
    Math.floor((skillAvail - skillR * 2) / 3),
  );
  const pitch = Math.min(skillPitch, skillMaxPitch);
  const skillSlots: TouchPoint[] = [
    { x: skillsX, y: skillBottom, r: skillR },
    { x: skillsX, y: skillBottom - pitch, r: skillR },
    { x: skillsX, y: skillBottom - pitch * 2, r: skillR },
    { x: skillsX, y: skillBottom - pitch * 3, r: skillR },
  ];

  // ≥44px diameter chrome — row under minimap, right-aligned (clears status).
  const chromeR = 22;
  const chromeGap = chromeR * 2 + 8;
  const chromeY = minimap.y + minimap.h + pad + chromeR;
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
