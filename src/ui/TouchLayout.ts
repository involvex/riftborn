/**
 * Phone HUD geometry (landscape-first).
 *
 * Left:  stick + DASH
 * Right: ATK with skills in a tight arc + E
 * Top:   HP only; chrome tray (BAG/CHAR/SKILLS/MAP/MENU) toggled via minimap
 */
export type TouchPoint = { x: number; y: number; r: number };

export type TouchLayout = {
  pad: number;
  landscape: boolean;
  stick: TouchPoint;
  /** Dash sits beside the move stick (left thumb). */
  dash: TouchPoint;
  atk: TouchPoint;
  interact: TouchPoint;
  /**
   * Skill slots around ATK: [0]=above, [1]=left, [2]=below.
   * Tight fan so they aren't a distant column.
   */
  skillSlots: TouchPoint[];
  /** Top chrome tray (toggled). Centers near top-middle. */
  chrome: { y: number; r: number; gap: number; count: number };
  mapSize: number;
  /** Hamburger badge on the minimap (top-right of map frame). */
  menuBadge: { x: number; y: number; r: number };
};

export const TOUCH_CHROME_COUNT = 5;

export function computeTouchLayout(width: number, height: number): TouchLayout {
  const landscape = width >= height;
  const short = Math.min(width, height);
  const pad = Math.max(8, Math.round(short * 0.022));

  const mapSize = landscape
    ? Math.min(120, Math.round(short * 0.32))
    : Math.min(108, Math.round(short * 0.24));

  // —— Left: stick + dash ——
  const stickR = landscape
    ? Math.round(Math.min(56, short * 0.155))
    : Math.round(Math.min(48, short * 0.135));
  const stick = {
    x: pad + stickR + 2,
    y: height - pad - stickR - (landscape ? 2 : 10),
    r: stickR,
  };
  const dashR = Math.round(stickR * 0.55);
  const dash = {
    x: stick.x + stickR + dashR + 10,
    y: stick.y - Math.round(stickR * 0.15),
    r: dashR,
  };

  // —— Right: ATK + skill arc + E ——
  const atkR = landscape
    ? Math.round(Math.min(42, short * 0.115))
    : Math.round(Math.min(40, short * 0.105));
  const skillR = Math.round(atkR * 0.62);
  const eR = Math.round(atkR * 0.58);
  const ring = atkR + skillR + Math.max(8, Math.round(atkR * 0.2));

  const atk = {
    x: width - pad - atkR - 4,
    y: height - pad - atkR - (landscape ? 4 : 12),
    r: atkR,
  };

  // Arc: above / left / below — all hugging ATK
  const skillSlots: TouchPoint[] = [
    { x: atk.x - Math.round(ring * 0.15), y: atk.y - ring, r: skillR },
    { x: atk.x - ring, y: atk.y - Math.round(ring * 0.1), r: skillR },
    { x: atk.x - Math.round(ring * 0.25), y: atk.y + ring * 0.85, r: skillR },
  ];
  // Keep bottom skill on-screen
  const bottomSkill = skillSlots[2]!;
  if (bottomSkill.y + bottomSkill.r > height - pad) {
    bottomSkill.y = height - pad - bottomSkill.r;
  }
  // E sits left of ATK, between ATK and left skill
  const interact = {
    x: atk.x - atkR - eR - 6,
    y: atk.y + Math.round(atkR * 0.15),
    r: eR,
  };

  // —— Chrome tray (top, toggled) ——
  const chromeR = landscape ? 20 : 22;
  const chrome = {
    y: Math.max(52, Math.round(short * 0.12)),
    r: chromeR,
    gap: chromeR * 2 + 10,
    count: TOUCH_CHROME_COUNT,
  };

  const mapX = width - mapSize / 2 - 8;
  const mapY = mapSize / 2 + 8;
  const menuBadge = {
    x: mapX + mapSize / 2 - 14,
    y: mapY - mapSize / 2 + 14,
    r: 14,
  };

  return {
    pad,
    landscape,
    stick,
    dash,
    atk,
    interact,
    skillSlots,
    chrome,
    mapSize,
    menuBadge,
  };
}
