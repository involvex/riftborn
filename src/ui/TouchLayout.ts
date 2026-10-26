/**
 * Shared phone HUD geometry (landscape-first ARPG).
 * Left thumb = move. Right thumb = combat. Top = chrome only.
 */
export type TouchLayout = {
  pad: number;
  landscape: boolean;
  stick: { x: number; y: number; r: number };
  /** Primary attack (right thumb rest). */
  atk: { x: number; y: number; r: number };
  interact: { x: number; y: number; r: number };
  dash: { x: number; y: number; r: number };
  /** Skill circles stacked beside ATK. */
  skills: { x: number; y0: number; r: number; gap: number };
  /** BAG / MAP / MENU under HP strip. */
  quick: { x0: number; y: number; r: number; gap: number };
  mapSize: number;
};

export function computeTouchLayout(width: number, height: number): TouchLayout {
  const landscape = width >= height;
  const short = Math.min(width, height);
  const pad = Math.max(12, Math.round(short * 0.028));

  const stickR = landscape
    ? Math.round(Math.min(70, short * 0.2))
    : Math.round(Math.min(58, short * 0.16));
  const stick = {
    x: pad + stickR + 6,
    y: height - pad - stickR - (landscape ? 6 : 20),
    r: stickR,
  };

  const atkR = landscape ? 46 : 42;
  const atk = {
    x: width - pad - atkR - 4,
    y: height - pad - atkR - (landscape ? 10 : 28),
    r: atkR,
  };

  const smallR = Math.round(atkR * 0.68);
  const interact = {
    x: atk.x - atkR - smallR - 6,
    y: atk.y + 4,
    r: smallR,
  };
  const dash = {
    x: atk.x - 8,
    y: atk.y - atkR - smallR - 4,
    r: smallR,
  };

  // Three skills in a column left of E/ATK, centered on ATK height
  const skillR = Math.round(atkR * 0.62);
  const skillGap = skillR * 2 + 12;
  const skills = {
    x: interact.x - skillR - 16,
    y0: atk.y - skillGap,
    r: skillR,
    gap: skillGap,
  };

  const quickR = 22;
  const quick = {
    x0: 12 + quickR,
    y: landscape ? 78 : 88,
    r: quickR,
    gap: quickR * 2 + 10,
  };

  return {
    pad,
    landscape,
    stick,
    atk,
    interact,
    dash,
    skills,
    quick,
    mapSize: landscape ? 96 : 100,
  };
}
