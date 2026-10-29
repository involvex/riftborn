/**
 * Phone HUD geometry (landscape-first).
 *
 * Left:  stick + DASH
 * Right: skills column | E | ATK  (no overlaps)
 * Top:   chrome tray toggled via minimap
 *
 *        [1]
 *        [2]  [E] [ATK]
 *        [3]
 */
export type TouchPoint = { x: number; y: number; r: number };

export type TouchLayout = {
  pad: number;
  landscape: boolean;
  stick: TouchPoint;
  dash: TouchPoint;
  atk: TouchPoint;
  interact: TouchPoint;
  /** [0]=top, [1]=mid, [2]=bottom — column left of E. */
  skillSlots: TouchPoint[];
  chrome: { y: number; r: number; gap: number; count: number };
  mapSize: number;
  menuBadge: { x: number; y: number; r: number };
};

export const TOUCH_CHROME_COUNT = 5;

export function computeTouchLayout(width: number, height: number): TouchLayout {
  const landscape = width >= height;
  const short = Math.min(width, height);
  const pad = Math.max(8, Math.round(short * 0.022));
  const gap = Math.max(10, Math.round(short * 0.028));

  const mapSize = landscape
    ? Math.min(112, Math.round(short * 0.3))
    : Math.min(100, Math.round(short * 0.22));

  // —— Left: stick + dash ——
  const stickR = landscape
    ? Math.round(Math.min(52, short * 0.145))
    : Math.round(Math.min(46, short * 0.13));
  const stick = {
    x: pad + stickR + 2,
    y: height - pad - stickR - (landscape ? 2 : 10),
    r: stickR,
  };
  const dashR = Math.round(stickR * 0.52);
  const dash = {
    x: stick.x + stickR + dashR + gap,
    y: stick.y,
    r: dashR,
  };

  // —— Right combat: ATK + E + skill column (guaranteed clearance) ——
  const atkR = landscape
    ? Math.round(Math.min(40, short * 0.11))
    : Math.round(Math.min(38, short * 0.1));
  const skillR = Math.round(atkR * 0.58);
  const eR = Math.round(atkR * 0.55);

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
  // Center column on ATK; if bottom clips, shift whole column up
  let midY = atk.y;
  const bottomY = midY + skillPitch;
  if (bottomY + skillR > height - pad) {
    midY = height - pad - skillR - skillPitch;
  }
  const topY = midY - skillPitch;
  // Keep top under minimap / chrome
  const topFloor = mapSize + skillR + 16;
  const shift = topY < topFloor ? topFloor - topY : 0;

  const skillSlots: TouchPoint[] = [
    { x: skillsX, y: midY - skillPitch + shift, r: skillR },
    { x: skillsX, y: midY + shift, r: skillR },
    { x: skillsX, y: midY + skillPitch + shift, r: skillR },
  ];

  const chromeR = landscape ? 20 : 22;
  const chrome = {
    y: Math.max(48, Math.round(short * 0.11)),
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
